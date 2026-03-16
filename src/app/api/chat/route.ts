import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAnthropicClient } from "@/lib/anthropic";
import { getRestaurantContext, getMenuOverview } from "@/lib/menu-queries";
import { buildSystemPrompt, formatItemsForPrompt, type ChatMode } from "@/lib/system-prompt";
import { classifyAndFetchData } from "@/lib/intent-classifier";
import { checkRateLimit } from "@/lib/rate-limiter";
import type { ItemDetail } from "@/lib/menu-queries";

// ─── Types ──────────────────────────────────────────────

interface ChatRequest {
  message: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  mode: ChatMode;
  stream?: boolean;
}

// ─── Helper: convert item results to ItemDetail-like objects for formatting ──

function itemResultsToDetails(
  items: Array<{
    id: string;
    item_name: string;
    price: string;
    description_short: string | null;
    description_long: string | null;
    ingredients_high_level: string | null;
    ingredients_detailed: string | null;
    modification_notes: string | null;
    seasonal_availability: string | null;
    available_during: string | null;
    menu_flags: string[];
    is_active: boolean;
    category_name: string;
    menu_name: string;
  }>
): ItemDetail[] {
  return items.map((item) => ({
    ...item,
    allergens: [],
    dietary_tags: [],
    pairings: [],
  }));
}

// ─── Route handler ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Step 0: Rate limiting ───────────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimit = checkRateLimit(ip, 20, 60_000);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before sending another message." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    // ── Step 1: Validate request ──────────────────────────
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { message, conversationHistory, mode, stream: useStreaming } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "message is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (mode !== "guest" && mode !== "staff") {
      return NextResponse.json(
        { error: "mode must be 'guest' or 'staff'" },
        { status: 400 }
      );
    }

    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: "conversationHistory must be an array" },
        { status: 400 }
      );
    }

    // ── Step 2: Auth check for staff mode ─────────────────
    if (mode === "staff") {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return NextResponse.json(
            { error: "Authentication required for staff mode" },
            { status: 401 }
          );
        }

        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile?.role || !["staff", "admin"].includes(profile.role)) {
          return NextResponse.json(
            { error: "Staff or admin role required" },
            { status: 401 }
          );
        }
      } catch (err) {
        console.error("Auth check error:", err);
        return NextResponse.json(
          { error: "Authentication failed" },
          { status: 401 }
        );
      }
    }

    // ── Step 3: Fetch base context ────────────────────────
    const [restaurantContext, menuOverview] = await Promise.all([
      getRestaurantContext(),
      getMenuOverview(),
    ]);

    if (!restaurantContext) {
      console.error("Failed to fetch restaurant context");
      return NextResponse.json(
        { error: "Failed to load restaurant data" },
        { status: 500 }
      );
    }

    // ── Step 4: Intent classification + data retrieval ────
    const classification = await classifyAndFetchData(message, mode);

    // ── Step 5: Assemble system prompt ────────────────────
    const systemPrompt = buildSystemPrompt({
      mode,
      restaurantContext,
      menuOverview,
    });

    // ── Step 6: Build messages array ──────────────────────
    const includeStaffNotes = mode === "staff";

    // Collect all fetched data into a formatted context block
    const contextParts: string[] = [];
    const { data } = classification;

    if (data.itemDetails && data.itemDetails.length > 0) {
      contextParts.push(formatItemsForPrompt(data.itemDetails, includeStaffNotes));
    }

    if (data.allergenItems && data.allergenItems.length > 0) {
      contextParts.push(
        formatItemsForPrompt(itemResultsToDetails(data.allergenItems), includeStaffNotes)
      );
    }

    if (data.dietaryItems && data.dietaryItems.length > 0) {
      contextParts.push(
        formatItemsForPrompt(itemResultsToDetails(data.dietaryItems), includeStaffNotes)
      );
    }

    if (data.items && data.items.length > 0) {
      contextParts.push(
        formatItemsForPrompt(itemResultsToDetails(data.items), includeStaffNotes)
      );
    }

    if (data.menuItems && data.menuItems.length > 0) {
      for (const group of data.menuItems) {
        if (group.items.length > 0) {
          contextParts.push(
            `### ${group.category}\n` +
            formatItemsForPrompt(itemResultsToDetails(group.items), includeStaffNotes)
          );
        }
      }
    }

    if (data.pairings && data.pairings.length > 0) {
      const pairingLines = data.pairings.map((p) => {
        let line = `- ${p.pairing_type}: ${p.recommendation ?? "No recommendation"}`;
        if (p.paired_item_name) line += ` (pairs with: ${p.paired_item_name})`;
        return line;
      });
      contextParts.push("### Pairings\n" + pairingLines.join("\n"));
    }

    if (data.serviceSettings && data.serviceSettings.length > 0) {
      const ssLines = data.serviceSettings.map((ss) => {
        let line = `- **${ss.name}**`;
        if (ss.hours) line += ` — ${ss.hours}`;
        if (ss.days_available) line += ` (${ss.days_available})`;
        if (ss.menu_names.length > 0) line += ` | Menus: ${ss.menu_names.join(", ")}`;
        if (ss.notes) line += ` | ${ss.notes}`;
        return line;
      });
      contextParts.push("### Service Settings\n" + ssLines.join("\n"));
    }

    // Build the user message content
    let userContent: string;
    if (contextParts.length > 0) {
      userContent =
        "RELEVANT MENU DATA:\n" +
        contextParts.join("\n\n") +
        "\n\nGUEST MESSAGE: " +
        message.trim();
    } else {
      userContent = message.trim();
    }

    // Assemble messages: conversation history + current message
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user" as const, content: userContent },
    ];

    // ── Step 7: Call Claude API ────────────────────────────
    const anthropic = createAnthropicClient();
    const intentLabel = classification.intent;

    if (useStreaming) {
      // ── Streaming mode: return SSE stream ───────────────
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                const payload = JSON.stringify({
                  type: "delta",
                  text: event.delta.text,
                });
                controller.enqueue(
                  encoder.encode(`data: ${payload}\n\n`)
                );
              }
            }
            // Send final done event with intent
            const done = JSON.stringify({ type: "done", intent: intentLabel });
            controller.enqueue(encoder.encode(`data: ${done}\n\n`));
            controller.close();
          } catch (err) {
            console.error("Stream error:", err);
            const errPayload = JSON.stringify({
              type: "error",
              text: "An error occurred while generating the response.",
            });
            controller.enqueue(encoder.encode(`data: ${errPayload}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── Non-streaming mode: return JSON ─────────────────
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // ── Step 8: Return response ───────────────────────────
    const textContent = response.content.find((block) => block.type === "text");
    const responseText = textContent && textContent.type === "text" ? textContent.text : "";

    return NextResponse.json({
      response: responseText,
      intent: intentLabel,
    });
  } catch (err) {
    console.error("Chat API error:", err);

    // Check for specific Anthropic errors
    if (err instanceof Error) {
      if (err.message.includes("ANTHROPIC_API_KEY")) {
        return NextResponse.json(
          { error: "AI service not configured" },
          { status: 500 }
        );
      }
      if (err.message.includes("rate_limit") || err.message.includes("overloaded")) {
        return NextResponse.json(
          { error: "AI service is temporarily busy. Please try again in a moment." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
