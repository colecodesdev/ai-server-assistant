import {
  searchItemsByKeyword,
  filterByAllergen,
  filterByDietaryTag,
  getItemsByMenu,
  getServiceSettings,
  getMenuOverview,
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

// ─── Helpers ────────────────────────────────────────────

function lower(s: string): string {
  return s.toLowerCase();
}

function containsAny(text: string, words: string[]): boolean {
  const t = lower(text);
  return words.some((w) => t.includes(lower(w)));
}

function findAllergen(text: string): { allergen: string; mode: "contains" | "free_of" } | null {
  const t = lower(text);

  // Check if it's an allergy-related message
  const hasAllergenTrigger = ALLERGEN_TRIGGER_WORDS.some((w) => t.includes(w));

  for (const [pattern, allergenName] of Object.entries(ALLERGEN_MAP)) {
    if (t.includes(pattern)) {
      // Determine mode: if they're asking about allergy/avoiding → free_of
      // If they're asking "what contains shellfish" → contains
      const wantsContains = t.includes("contain") || t.includes("has ") || t.includes("have ");
      const mode = wantsContains && !hasAllergenTrigger ? "contains" : "free_of";
      return { allergen: allergenName, mode };
    }
  }

  return null;
}

function findDietaryTag(text: string): string | null {
  const t = lower(text);
  for (const [pattern, tagName] of Object.entries(DIETARY_MAP)) {
    if (t.includes(pattern)) return tagName;
  }
  return null;
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

// ─── Main classifier ───────────────────────────────────

export async function classifyAndFetchData(
  message: string,
  mode: ChatMode
): Promise<ClassificationResult> {
  const intents: string[] = [];
  const data: ClassifiedData = {};

  const includeStaffNotes = mode === "staff";

  // 1. Allergen query
  const allergenMatch = findAllergen(message);
  if (allergenMatch && containsAny(message, [...ALLERGEN_TRIGGER_WORDS, ...Object.keys(ALLERGEN_MAP)])) {
    intents.push(`allergen:${allergenMatch.allergen}:${allergenMatch.mode}`);
    try {
      data.allergenItems = await filterByAllergen(allergenMatch.allergen, allergenMatch.mode);
    } catch (err) {
      console.error("Allergen fetch error:", err);
    }
  }

  // 2. Dietary query
  const dietaryTag = findDietaryTag(message);
  if (dietaryTag) {
    intents.push(`dietary:${dietaryTag}`);
    try {
      data.dietaryItems = await filterByDietaryTag(dietaryTag);
    } catch (err) {
      console.error("Dietary fetch error:", err);
    }
  }

  // 3. Menu browse
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

  // 4. Pairing question
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

  // 5. Service setting query
  if (containsAny(message, SERVICE_WORDS)) {
    intents.push("service_settings");
    try {
      data.serviceSettings = await getServiceSettings();
    } catch (err) {
      console.error("Service settings fetch error:", err);
    }
  }

  // 6. Restaurant info
  if (containsAny(message, RESTAURANT_WORDS)) {
    intents.push("restaurant_info");
    // No additional fetch needed — restaurant context is already in the system prompt
  }

  // 7. Specific item search (if no other data intents matched, or as supplement)
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
