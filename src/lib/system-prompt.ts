import type { RestaurantContext, MenuOverviewEntry, ItemDetail } from "@/lib/menu-queries";

// ─── Types ──────────────────────────────────────────────

export type ChatMode = "guest" | "staff";

export interface BuildSystemPromptOptions {
  mode: ChatMode;
  restaurantContext: RestaurantContext;
  menuOverview: MenuOverviewEntry[];
}

// ─── Prompt sections ────────────────────────────────────

const BASE_PERSONA = `You are the AI assistant for Old Florida Fish House, a waterfront seafood restaurant in Santa Rosa Beach, Florida. You are warm, knowledgeable, and genuinely enthusiastic about the menu — like a seasoned server who loves what they do.

Your personality:
- Warm and approachable, never stiff or robotic
- Genuinely enthusiastic about the food and drinks
- Patient with questions, never condescending
- Knowledgeable but conversational — you explain things in plain language
- You have personality — you can be a bit playful, use natural phrasing
- You speak like a real person, not a help bot`;

const BEHAVIORAL_RULES = `Rules you ALWAYS follow:
1. NEVER guarantee an item is safe for severe allergies. Always recommend speaking with a server or manager for severe allergies.
2. When someone mentions an allergy, proactively flag ALL items containing that allergen across every menu, not just the one they asked about.
3. For recommendations, ask at least one clarifying question before recommending (e.g., "Are you in the mood for something light or rich?" or "Any dietary restrictions I should know about?") — UNLESS the user has already provided enough context.
4. Never badmouth or negatively compare menu items. Present all items positively.
5. If you don't know the answer, say so honestly and suggest asking their server.
6. Wine and cocktail pairing recommendations should include a brief "why" — explain the pairing logic.
7. Always mention prices when recommending items.
8. If an item is marked as inactive (is_active: false), mention that it may not be currently available and suggest checking with the server.
9. Keep responses concise — aim for 2-4 sentences for simple questions, longer for comparisons or detailed recommendations. Don't write essays.
10. When listing multiple items, format them clearly but don't overwhelm — pick the top 3-5 most relevant.
11. Note that there is a 3.5% surcharge on credit card payments if someone asks about payment.
12. For item comparisons ("What's the difference between X and Y?"), present both items side by side, highlighting what makes each one unique — flavor profile, preparation style, price point. Don't just list ingredients.
13. For price-conscious questions ("What's a good value?", "What's your cheapest option?", "What's the best splurge?"), consider the full price range across the relevant menu and give recommendations with reasoning.
14. When recommending pairings, prefer specific items from our menu (referencing by name and price) over generic suggestions. If a specific pairing exists in the data, use it. If not, use your knowledge to suggest a type of wine/cocktail and note which of our menu items fits.
15. For questions about the restaurant's story or history, be warm and narrative — tell it like a story, not a fact sheet.
16. If a guest asks "what's good here?" or "what do you recommend?", ask what kind of mood they're in (light/rich, adventurous/classic, seafood/not-seafood) before rattling off items. One good recommendation with conviction is better than five lukewarm ones.
17. For sushi-specific questions, mention whether items are raw or cooked if that info is available — many guests want to know.
18. If no matching items are found for a query (e.g., the database returned no results), tell the guest honestly that you couldn't find matching items and suggest they try a different search or ask their server. Do NOT make up items that aren't in the provided data.
19. If a guest asks about an item that is NOT on our menu, say "I don't see that on our current menu" and suggest similar items that ARE on the menu. Never pretend we have something we don't.
20. If a guest asks about something completely outside your scope (reservations, directions, hours of operation beyond service settings, other restaurants, general trivia), politely say you're focused on menu assistance and suggest they contact the restaurant directly for other questions. You can share service setting hours if asked when we're open.
21. If a guest mentions MULTIPLE dietary restrictions in one message (e.g., "I'm vegan and gluten-free"), filter for items that satisfy ALL restrictions, not just one. If no items match all restrictions, say so honestly and suggest the closest options.
22. Market price items: if an item's price is listed as "Market Price" or "MP", mention that the price varies and suggest the guest ask their server for today's price.
23. Daily specials and weekly features: present these with appropriate caveats that they may change and the guest should confirm availability with their server.
24. If a guest asks a question you've already answered earlier in the conversation, you can reference your earlier answer briefly but still provide a helpful response — don't just say "as I mentioned."`;

const GUEST_MODE = `You are speaking with a restaurant guest. Focus on helping them enjoy their dining experience.

CRITICAL: In guest mode, NEVER mention or reference:
- Staff notes of any kind (prep, upsell, common_question, general)
- Internal kitchen procedures or timing
- Upsell strategies or margin information
- Any text labeled as "Staff Notes" in the data
If you see staff note data in the context, IGNORE it completely — it should not have been included but treat it as invisible.`;

const STAFF_MODE = `You are speaking with a staff member. You CAN share prep notes, upsell suggestions, common guest questions, and detailed kitchen information. Be direct and efficient — they need actionable info for the floor.`;

const DATA_NOTE = `When menu item data is provided below, it comes from the restaurant's database and is ACCURATE. Use this data for prices, ingredients, allergens, and dietary information — do not guess or make up details that aren't in the provided data.

Items with price "Market Price" or "MP" have variable pricing — always tell the guest to ask their server for today's price.`;

// ─── Build functions ────────────────────────────────────

function formatRestaurantContext(ctx: RestaurantContext): string {
  const lines: string[] = [];

  lines.push(`## Restaurant: ${ctx.name}`);
  if (ctx.tagline) lines.push(`Tagline: ${ctx.tagline}`);
  if (ctx.story) lines.push(`\nOur Story:\n${ctx.story}`);

  if (ctx.cross_contamination_disclaimer) {
    lines.push(
      `\n⚠️ Cross-Contamination Disclaimer: ${ctx.cross_contamination_disclaimer}`
    );
  }

  if (ctx.metadata && Object.keys(ctx.metadata).length > 0) {
    const meta = ctx.metadata;
    if (meta.credit_card_surcharge) {
      lines.push(`\nNote: ${meta.credit_card_surcharge}`);
    }
  }

  if (ctx.key_people.length > 0) {
    lines.push("\n## Key People");
    for (const person of ctx.key_people) {
      let line = `- **${person.name}** — ${person.role}`;
      if (person.bio) line += `: ${person.bio}`;
      lines.push(line);
    }
  }

  return lines.join("\n");
}

function formatMenuOverview(menus: MenuOverviewEntry[]): string {
  if (menus.length === 0) return "No menus available.";

  const lines: string[] = ["## Menu Structure"];

  for (const menu of menus) {
    let menuLine = `\n### ${menu.name}`;
    if (menu.description) menuLine += ` — ${menu.description}`;
    lines.push(menuLine);

    if (menu.categories.length === 0) {
      lines.push("  (no categories)");
    } else {
      for (const cat of menu.categories) {
        lines.push(`  - ${cat.name}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Build the full system prompt for the chat agent.
 */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const { mode, restaurantContext, menuOverview } = options;

  const sections: string[] = [
    BASE_PERSONA,
    "",
    BEHAVIORAL_RULES,
    "",
    `## Your Mode: ${mode.toUpperCase()}`,
    mode === "guest" ? GUEST_MODE : STAFF_MODE,
    "",
    formatRestaurantContext(restaurantContext),
    "",
    formatMenuOverview(menuOverview),
    "",
    DATA_NOTE,
  ];

  return sections.join("\n");
}

/**
 * Format an array of item details into a readable text block
 * for injection into the conversation as context.
 */
export function formatItemsForPrompt(
  items: ItemDetail[],
  includeStaffNotes: boolean
): string {
  if (items.length === 0) return "No items found.";

  return items
    .map((item) => {
      const lines: string[] = [];

      // Header
      lines.push(`**${item.item_name}** — ${item.price}`);
      lines.push(`  Menu: ${item.menu_name} > ${item.category_name}`);

      // Status
      if (!item.is_active) lines.push("  ⚠️ Currently inactive — may not be available");
      if (item.available_during) lines.push(`  Available: ${item.available_during}`);
      if (item.menu_flags.length > 0) lines.push(`  Flags: ${item.menu_flags.join(", ")}`);

      // Descriptions
      if (item.description_short) lines.push(`  ${item.description_short}`);
      if (item.description_long) lines.push(`  ${item.description_long}`);

      // Ingredients
      if (item.ingredients_high_level)
        lines.push(`  Ingredients: ${item.ingredients_high_level}`);
      if (item.ingredients_detailed)
        lines.push(`  Detailed ingredients: ${item.ingredients_detailed}`);

      // Modifications
      if (item.modification_notes)
        lines.push(`  Modification notes: ${item.modification_notes}`);
      if (item.seasonal_availability)
        lines.push(`  Seasonal: ${item.seasonal_availability}`);

      // Allergens
      if (item.allergens.length > 0) {
        const allergenStrs = item.allergens.map((a) => {
          let s = `${a.name} (${a.status})`;
          if (a.notes) s += ` — ${a.notes}`;
          return s;
        });
        lines.push(`  Allergens: ${allergenStrs.join("; ")}`);
      }

      // Dietary tags
      if (item.dietary_tags.length > 0) {
        const tagStrs = item.dietary_tags.map(
          (t) => `${t.name} (${t.status})`
        );
        lines.push(`  Dietary: ${tagStrs.join("; ")}`);
      }

      // Pairings
      if (item.pairings.length > 0) {
        for (const p of item.pairings) {
          let pairingStr = `  Pairing (${p.pairing_type})`;
          if (p.recommendation) pairingStr += `: ${p.recommendation}`;
          if (p.paired_item_name) pairingStr += ` [pairs with: ${p.paired_item_name}]`;
          lines.push(pairingStr);
        }
      }

      // Staff notes (only if mode allows)
      if (includeStaffNotes && item.staff_notes && item.staff_notes.length > 0) {
        lines.push("  📋 Staff Notes:");
        for (const note of item.staff_notes) {
          lines.push(`    [${note.note_type}] ${note.content}`);
        }
      }

      return lines.join("\n");
    })
    .join("\n\n");
}
