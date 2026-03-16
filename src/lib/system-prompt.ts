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
11. Note that there is a 3.5% surcharge on credit card payments if someone asks about payment.`;

const GUEST_MODE = `You are speaking with a restaurant guest. Do NOT reveal staff notes, prep details, upsell guidance, or any internal information. Focus on helping them enjoy their dining experience.`;

const STAFF_MODE = `You are speaking with a staff member. You CAN share prep notes, upsell suggestions, common guest questions, and detailed kitchen information. Be direct and efficient — they need actionable info for the floor.`;

const DATA_NOTE = `When menu item data is provided below, it comes from the restaurant's database and is ACCURATE. Use this data for prices, ingredients, allergens, and dietary information — do not guess or make up details that aren't in the provided data.`;

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
