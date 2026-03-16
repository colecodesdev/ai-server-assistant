import {
  searchItemsByKeyword,
  filterByAllergen,
  filterByDietaryTag,
  getItemsByMenu,
  getServiceSettings,
  getMenuOverview,
  getAllActiveItems,
  type ItemResult,
  type AllergenResult,
  type DietaryTagResult,
  type ServiceSettingResult,
  type ItemDetail,
  getItemsByNameMatch,
  getPairingsForItem,
  type PairingResult,
} from "@/lib/menu-queries";
import type { ChatMode } from "@/lib/system-prompt";

// ─── Types ──────────────────────────────────────────────

export interface ClassificationResult {
  intent: string;
  data: ClassifiedData;
}

export interface ClassifiedData {
  items?: ItemResult[];
  allergenItems?: AllergenResult[];
  dietaryItems?: DietaryTagResult[];
  menuItems?: { category: string; items: ItemResult[] }[];
  serviceSettings?: ServiceSettingResult[];
  itemDetails?: ItemDetail[];
  pairings?: PairingResult[];
}

// ─── Patterns ───────────────────────────────────────────

const ALLERGEN_MAP: Record<string, string> = {
  // Pattern → allergen name in DB
  "shellfish": "Shellfish",
  "shrimp": "Shellfish",
  "crab": "Shellfish",
  "lobster": "Shellfish",
  "fish": "Fish",
  "dairy": "Dairy",
  "milk": "Dairy",
  "cheese": "Dairy",
  "lactose": "Dairy",
  "gluten": "Gluten",
  "wheat": "Gluten",
  "celiac": "Gluten",
  "nut": "Tree Nuts",
  "nuts": "Tree Nuts",
  "tree nut": "Tree Nuts",
  "peanut": "Peanuts",
  "peanuts": "Peanuts",
  "soy": "Soy",
  "soya": "Soy",
  "egg": "Eggs",
  "eggs": "Eggs",
  "sesame": "Sesame",
};

const ALLERGEN_TRIGGER_WORDS = [
  "allergy", "allergic", "allergen", "allergens", "allergies",
  "intolerant", "intolerance", "celiac", "coeliac", "lactose",
  "free", "safe for", "avoid", "can't eat", "cannot eat",
  "sensitive", "sensitivity",
];

const DIETARY_MAP: Record<string, string> = {
  "vegan": "Vegan",
  "vegetarian": "Vegetarian",
  "pescatarian": "Pescatarian",
  "keto": "Keto",
  "gluten-free": "Gluten-Free",
  "gluten free": "Gluten-Free",
  "gf": "Gluten-Free",
  "dairy-free": "Dairy-Free",
  "dairy free": "Dairy-Free",
  "df": "Dairy-Free",
  "nut-free": "Nut-Free",
  "nut free": "Nut-Free",
  "nf": "Nut-Free",
};

// Menu name patterns → partial match against DB menu names
const MENU_PATTERNS: Record<string, string[]> = {
  "sushi": ["Sushi"],
  "cocktail": ["Cocktails"],
  "cocktails": ["Cocktails"],
  "drink": ["Cocktails", "Non-Alcoholic Beverages"],
  "drinks": ["Cocktails", "Non-Alcoholic Beverages", "Beer"],
  "wine": ["Wine by the Glass", "Bottled Wine"],
  "wines": ["Wine by the Glass", "Bottled Wine"],
  "wine list": ["Wine by the Glass", "Bottled Wine"],
  "beer": ["Beer"],
  "beers": ["Beer"],
  "dessert": ["Sweets"],
  "desserts": ["Sweets"],
  "sweets": ["Sweets"],
  "kids": ["Kids — Guppy Plates"],
  "kid": ["Kids — Guppy Plates"],
  "children": ["Kids — Guppy Plates"],
  "guppy": ["Kids — Guppy Plates"],
  "dinner": ["Dinner — Main Kitchen"],
  "entree": ["Dinner — Main Kitchen"],
  "entrees": ["Dinner — Main Kitchen"],
  "main": ["Dinner — Main Kitchen"],
  "spirits": ["Spirits"],
  "liquor": ["Spirits"],
  "non-alcoholic": ["Non-Alcoholic Beverages"],
  "mocktail": ["Non-Alcoholic Beverages"],
  "mocktails": ["Non-Alcoholic Beverages"],
  "weekly": ["Weekly Features"],
  "specials": ["Weekly Features"],
  "features": ["Weekly Features"],
};

const PAIRING_WORDS = [
  "pair", "pairs", "pairing", "pairings", "paired",
  "goes with", "go with", "good with", "match",
  "recommend a wine", "recommend a drink", "recommend a cocktail",
  "what wine", "what drink", "what cocktail", "what beer",
  "drink with", "wine with", "cocktail with",
];

const SERVICE_WORDS = [
  "brunch", "happy hour", "lunch", "dinner service",
  "what time", "when do you", "when are you",
  "hours", "open", "available",
  "are you serving", "do you serve",
];

const RESTAURANT_WORDS = [
  "restaurant", "history", "story", "about",
  "chef", "owner", "manager", "who runs",
  "who is", "tell me about the place",
  "how long", "when did",
];

const COMPARISON_PATTERNS = [
  "difference between",
  "compare",
  " vs ",
  " versus ",
  "which is better",
  "which one",
  "what's better",
  "what is better",
];

const PRICE_WORDS = [
  "cheap", "cheapest", "affordable", "budget", "value",
  "expensive", "priciest", "most expensive", "splurge",
  "best deal", "good deal", "worth it", "bang for",
  "least expensive", "cost", "price range",
];

const OUT_OF_SCOPE_WORDS = [
  "reservation", "reservations", "book a table", "make a booking",
  "directions", "how to get there", "where are you located", "how do i get",
  "parking", "park", "valet",
  "dress code", "what to wear",
  "private event", "private dining", "party room",
  "gift card", "gift certificate",
  "lost and found", "lost item",
  "job", "hiring", "employment", "apply", "application",
];

// Words that indicate the query IS food/menu-related (override out-of-scope)
const FOOD_CONTEXT_WORDS = [
  "menu", "food", "eat", "dish", "item", "order",
  "allergen", "allergy", "gluten", "vegan", "vegetarian",
  "price", "cost", "drink", "cocktail", "wine", "beer",
  "sushi", "fish", "seafood", "appetizer", "dessert", "entree",
  "recommend", "pair", "special",
];

// ─── Helpers ────────────────────────────────────────────

function lower(s: string): string {
  return s.toLowerCase();
}

function containsAny(text: string, words: string[]): boolean {
  const t = lower(text);
  return words.some((w) => t.includes(lower(w)));
}

function findAllergens(text: string): { allergen: string; mode: "contains" | "free_of" }[] {
  const t = lower(text);
  const hasAllergenTrigger = ALLERGEN_TRIGGER_WORDS.some((w) => t.includes(w));
  const wantsContains = t.includes("contain") || t.includes("has ") || t.includes("have ");
  const mode: "contains" | "free_of" = wantsContains && !hasAllergenTrigger ? "contains" : "free_of";

  const found = new Map<string, "contains" | "free_of">();
  for (const [pattern, allergenName] of Object.entries(ALLERGEN_MAP)) {
    if (t.includes(pattern) && !found.has(allergenName)) {
      found.set(allergenName, mode);
    }
  }

  return Array.from(found.entries()).map(([allergen, m]) => ({ allergen, mode: m }));
}

function findDietaryTags(text: string): string[] {
  const t = lower(text);
  const found = new Set<string>();
  for (const [pattern, tagName] of Object.entries(DIETARY_MAP)) {
    if (t.includes(pattern)) found.add(tagName);
  }
  return Array.from(found);
}

function findMenuNames(text: string): string[] {
  const t = lower(text);
  const matches = new Set<string>();
  for (const [pattern, menuNames] of Object.entries(MENU_PATTERNS)) {
    if (t.includes(pattern)) {
      for (const name of menuNames) matches.add(name);
    }
  }
  return Array.from(matches);
}

function extractDishKeywords(text: string): string[] {
  // Remove common question words and filler to isolate dish names
  const cleaned = lower(text)
    .replace(
      /\b(what|which|can|do|you|have|is|are|the|a|an|any|about|tell|me|i|want|would|like|get|order|try|how|does|it|that|this|some|there|please|thanks|thank|recommend|suggestion|suggest|with|for|of|on|in|at|to|my|your|menu|dish|food|option|options|item|items)\b/g,
      " "
    )
    .replace(/[?!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split into potential keywords (2+ chars)
  return cleaned
    .split(" ")
    .filter((w) => w.length >= 3)
    .slice(0, 5); // Max 5 keywords
}

function isComparisonQuery(text: string): boolean {
  const t = lower(text);
  return COMPARISON_PATTERNS.some((p) => t.includes(p))
    || /\b\w+\s+or\s+(?:the\s+)?\w+/i.test(text);
}

function extractComparisonItems(text: string): [string, string] | null {
  const t = lower(text);

  // "difference between X and Y"
  const betweenMatch = t.match(/(?:difference|choose)\s+between\s+(?:the\s+)?(.+?)\s+and\s+(?:the\s+)?(.+?)(?:\?|$)/);
  if (betweenMatch) return [betweenMatch[1].trim(), betweenMatch[2].trim()];

  // "X vs Y" or "X versus Y"
  const vsMatch = t.match(/(.+?)\s+(?:vs\.?|versus)\s+(.+?)(?:\?|$)/);
  if (vsMatch) return [vsMatch[1].trim(), vsMatch[2].trim()];

  // "X or Y" (with context words removed)
  const orMatch = t.match(/(?:the\s+)?(.+?)\s+or\s+(?:the\s+)?(.+?)(?:\?|$)/);
  if (orMatch) {
    const a = orMatch[1].replace(/^(should i get|which is better|compare|what's better|what about)\s+/i, "").trim();
    const b = orMatch[2].trim();
    if (a.length >= 3 && b.length >= 3) return [a, b];
  }

  return null;
}

// ─── Main classifier ───────────────────────────────────

export async function classifyAndFetchData(
  message: string,
  mode: ChatMode
): Promise<ClassificationResult> {
  const intents: string[] = [];
  const data: ClassifiedData = {};

  const includeStaffNotes = mode === "staff";

  // 0. Out-of-scope detection (early exit)
  if (containsAny(message, OUT_OF_SCOPE_WORDS) && !containsAny(message, FOOD_CONTEXT_WORDS)) {
    return { intent: "out_of_scope", data: {} };
  }

  // 1. Allergen query (supports multiple allergens)
  const allergenMatches = findAllergens(message);
  if (allergenMatches.length > 0 && containsAny(message, [...ALLERGEN_TRIGGER_WORDS, ...Object.keys(ALLERGEN_MAP)])) {
    try {
      const allResults = await Promise.all(
        allergenMatches.map((m) => filterByAllergen(m.allergen, m.mode))
      );

      if (allergenMatches.length === 1) {
        intents.push(`allergen:${allergenMatches[0].allergen}:${allergenMatches[0].mode}`);
        data.allergenItems = allResults[0];
      } else {
        // Multiple allergens — intersect results (items safe for ALL)
        const intentLabel = allergenMatches.map((m) => m.allergen).join("+");
        intents.push(`allergen:${intentLabel}:${allergenMatches[0].mode}`);

        // Intersect: keep only items whose ID appears in every result set
        const idSets = allResults.map((r) => new Set(r.map((item) => item.id)));
        const intersection = allResults[0].filter((item) =>
          idSets.every((s) => s.has(item.id))
        );
        data.allergenItems = intersection;
      }
    } catch (err) {
      console.error("Allergen fetch error:", err);
    }
  }

  // 2. Comparison query
  if (isComparisonQuery(message)) {
    const pair = extractComparisonItems(message);
    if (pair) {
      intents.push("comparison");
      try {
        const [itemsA, itemsB] = await Promise.all([
          getItemsByNameMatch([pair[0]], includeStaffNotes),
          getItemsByNameMatch([pair[1]], includeStaffNotes),
        ]);
        const combined = [...itemsA, ...itemsB];
        if (combined.length > 0) {
          data.itemDetails = [...(data.itemDetails ?? []), ...combined];
        }
      } catch (err) {
        console.error("Comparison fetch error:", err);
      }
    }
  }

  // 3. Price query
  if (containsAny(message, PRICE_WORDS)) {
    intents.push("price_query");
    const priceMenuNames = findMenuNames(message);
    try {
      if (priceMenuNames.length > 0) {
        const overview = await getMenuOverview();
        for (const menuName of priceMenuNames) {
          const menu = overview.find((m) => lower(m.name) === lower(menuName));
          if (menu) {
            const menuData = await getItemsByMenu(menu.id);
            data.menuItems = [...(data.menuItems ?? []), ...menuData];
          }
        }
      } else {
        // No specific menu — fetch all active items for price comparison
        const results = await getAllActiveItems();
        if (results.length > 0) {
          data.items = [...(data.items ?? []), ...results];
        }
      }
    } catch (err) {
      console.error("Price query fetch error:", err);
    }
  }

  // 4. Dietary query (supports multiple tags with intersection)
  const dietaryTags = findDietaryTags(message);
  if (dietaryTags.length > 0) {
    try {
      const allResults = await Promise.all(
        dietaryTags.map((tag) => filterByDietaryTag(tag))
      );

      if (dietaryTags.length === 1) {
        intents.push(`dietary:${dietaryTags[0]}`);
        data.dietaryItems = allResults[0];
      } else {
        // Multiple dietary tags — intersect results
        intents.push(`dietary:${dietaryTags.join("+")}`);
        const idSets = allResults.map((r) => new Set(r.map((item) => item.id)));
        const intersection = allResults[0].filter((item) =>
          idSets.every((s) => s.has(item.id))
        );
        data.dietaryItems = intersection;
      }
    } catch (err) {
      console.error("Dietary fetch error:", err);
    }
  }

  // 5. Menu browse
  const menuNames = findMenuNames(message);
  if (menuNames.length > 0) {
    // Find menu IDs from overview
    try {
      const overview = await getMenuOverview();
      for (const menuName of menuNames) {
        const menu = overview.find(
          (m) => lower(m.name) === lower(menuName)
        );
        if (menu) {
          intents.push(`menu:${menu.name}`);
          const menuData = await getItemsByMenu(menu.id);
          data.menuItems = [...(data.menuItems ?? []), ...menuData];
        }
      }
    } catch (err) {
      console.error("Menu browse error:", err);
    }
  }

  // 6. Pairing question
  if (containsAny(message, PAIRING_WORDS)) {
    intents.push("pairing");
    const keywords = extractDishKeywords(message);
    if (keywords.length > 0) {
      try {
        const items = await getItemsByNameMatch(keywords, includeStaffNotes);
        if (items.length > 0) {
          data.itemDetails = [...(data.itemDetails ?? []), ...items];
          // Fetch pairings for the first match
          const pairings = await getPairingsForItem(items[0].id);
          if (pairings.length > 0) {
            data.pairings = pairings;
          }
        }
      } catch (err) {
        console.error("Pairing fetch error:", err);
      }
    }
  }

  // 7. Service setting query
  if (containsAny(message, SERVICE_WORDS)) {
    intents.push("service_settings");
    try {
      data.serviceSettings = await getServiceSettings();
    } catch (err) {
      console.error("Service settings fetch error:", err);
    }
  }

  // 8. Restaurant info
  if (containsAny(message, RESTAURANT_WORDS)) {
    intents.push("restaurant_info");
    // No additional fetch needed — restaurant context is already in the system prompt
  }

  // 9. Specific item search (if no other data intents matched, or as supplement)
  const hasDataIntents = (data.allergenItems?.length ?? 0) > 0
    || (data.dietaryItems?.length ?? 0) > 0
    || (data.menuItems?.length ?? 0) > 0
    || (data.itemDetails?.length ?? 0) > 0;

  if (!hasDataIntents) {
    const keywords = extractDishKeywords(message);
    if (keywords.length > 0) {
      try {
        // Try name match first (more targeted)
        const nameMatches = await getItemsByNameMatch(keywords, includeStaffNotes);
        if (nameMatches.length > 0) {
          intents.push("item_search");
          data.itemDetails = nameMatches;
        } else {
          // Fall back to keyword search across all text fields
          for (const kw of keywords.slice(0, 3)) {
            const results = await searchItemsByKeyword(kw);
            if (results.length > 0) {
              intents.push(`keyword:${kw}`);
              data.items = [...(data.items ?? []), ...results];
              break; // One good keyword hit is enough
            }
          }
        }
      } catch (err) {
        console.error("Item search error:", err);
      }
    }
  }

  // Default intent if nothing matched
  if (intents.length === 0) {
    intents.push("general");
  }

  return {
    intent: intents.join(", "),
    data,
  };
}
