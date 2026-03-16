import { createClient } from "@/lib/supabase-server";

// ─── Types ──────────────────────────────────────────────

export interface MenuOverviewCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuOverviewEntry {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  categories: MenuOverviewCategory[];
}

export interface ItemResult {
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
  sort_order: number;
  category_name: string;
  menu_name: string;
}

export interface AllergenResult extends ItemResult {
  allergen_status: string;
  allergen_notes: string | null;
}

export interface DietaryTagResult extends ItemResult {
  tag_status: string;
}

export interface ItemDetail {
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
  allergens: { name: string; status: string; notes: string | null }[];
  dietary_tags: { name: string; status: string }[];
  pairings: { pairing_type: string; recommendation: string | null; paired_item_name: string | null }[];
  staff_notes?: { note_type: string; content: string }[];
}

export interface PairingResult {
  pairing_type: string;
  recommendation: string | null;
  paired_item_name: string | null;
}

export interface RestaurantContext {
  name: string;
  tagline: string | null;
  story: string | null;
  cross_contamination_disclaimer: string | null;
  metadata: Record<string, unknown>;
  key_people: { name: string; role: string; bio: string | null }[];
}

export interface ServiceSettingResult {
  id: string;
  name: string;
  days_available: string | null;
  hours: string | null;
  notes: string | null;
  menu_names: string[];
}

// ─── Helper: extract item + category/menu names ────────

function mapItemRow(row: Record<string, unknown>): ItemResult {
  const cat = row.menu_categories as Record<string, unknown> | null;
  const menu = cat?.menus as Record<string, unknown> | null;
  return {
    id: row.id as string,
    item_name: row.item_name as string,
    price: row.price as string,
    description_short: row.description_short as string | null,
    description_long: row.description_long as string | null,
    ingredients_high_level: row.ingredients_high_level as string | null,
    ingredients_detailed: row.ingredients_detailed as string | null,
    modification_notes: row.modification_notes as string | null,
    seasonal_availability: row.seasonal_availability as string | null,
    available_during: row.available_during as string | null,
    menu_flags: (row.menu_flags as string[]) ?? [],
    is_active: row.is_active as boolean,
    sort_order: row.sort_order as number,
    category_name: (cat?.name as string) ?? "",
    menu_name: (menu?.name as string) ?? "",
  };
}

// ─── Query functions ────────────────────────────────────

/**
 * All menus with their category names. No items.
 */
export async function getMenuOverview(): Promise<MenuOverviewEntry[]> {
  try {
    const supabase = await createClient();

    const { data: menus, error: menuErr } = await supabase
      .from("menus")
      .select("id, name, description, sort_order")
      .order("sort_order");

    if (menuErr || !menus) {
      console.error("getMenuOverview menus error:", menuErr);
      return [];
    }

    const { data: categories, error: catErr } = await supabase
      .from("menu_categories")
      .select("id, name, menu_id, sort_order")
      .order("sort_order");

    if (catErr) {
      console.error("getMenuOverview categories error:", catErr);
    }

    const cats = categories ?? [];

    return menus.map((menu) => ({
      id: menu.id,
      name: menu.name,
      description: menu.description,
      sort_order: menu.sort_order,
      categories: cats
        .filter((c) => c.menu_id === menu.id)
        .map((c) => ({ id: c.id, name: c.name, sort_order: c.sort_order })),
    }));
  } catch (err) {
    console.error("getMenuOverview error:", err);
    return [];
  }
}

/**
 * All active items with name, price, and category/menu context.
 * Used for price-range queries when no specific menu is targeted.
 */
export async function getAllActiveItems(): Promise<ItemResult[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("menu_items")
      .select("*, menu_categories!inner(name, menus!inner(name))")
      .eq("is_active", true)
      .order("price");

    if (error) {
      console.error("getAllActiveItems error:", error);
      return [];
    }

    return (data ?? []).map(mapItemRow);
  } catch (err) {
    console.error("getAllActiveItems error:", err);
    return [];
  }
}

/**
 * Full-text search on item_name, description_short, ingredients_high_level.
 */
export async function searchItemsByKeyword(keyword: string): Promise<ItemResult[]> {
  try {
    const supabase = await createClient();
    const pattern = `%${keyword}%`;

    const { data, error } = await supabase
      .from("menu_items")
      .select("*, menu_categories!inner(name, menus!inner(name))")
      .or(`item_name.ilike.${pattern},description_short.ilike.${pattern},ingredients_high_level.ilike.${pattern}`)
      .order("sort_order")
      .limit(20);

    if (error) {
      console.error("searchItemsByKeyword error:", error);
      return [];
    }

    return (data ?? []).map(mapItemRow);
  } catch (err) {
    console.error("searchItemsByKeyword error:", err);
    return [];
  }
}

/**
 * All items in a specific category.
 */
export async function getItemsByCategory(categoryId: string): Promise<ItemResult[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("menu_items")
      .select("*, menu_categories!inner(name, menus!inner(name))")
      .eq("category_id", categoryId)
      .order("sort_order");

    if (error) {
      console.error("getItemsByCategory error:", error);
      return [];
    }

    return (data ?? []).map(mapItemRow);
  } catch (err) {
    console.error("getItemsByCategory error:", err);
    return [];
  }
}

/**
 * All items across all categories in a menu, grouped by category.
 */
export async function getItemsByMenu(menuId: string): Promise<{ category: string; items: ItemResult[] }[]> {
  try {
    const supabase = await createClient();

    const { data: categories, error: catErr } = await supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("menu_id", menuId)
      .order("sort_order");

    if (catErr || !categories?.length) {
      console.error("getItemsByMenu categories error:", catErr);
      return [];
    }

    const categoryIds = categories.map((c) => c.id);

    const { data: items, error: itemErr } = await supabase
      .from("menu_items")
      .select("*, menu_categories!inner(name, menus!inner(name))")
      .in("category_id", categoryIds)
      .order("sort_order");

    if (itemErr) {
      console.error("getItemsByMenu items error:", itemErr);
      return [];
    }

    const mapped = (items ?? []).map(mapItemRow);

    return categories.map((cat) => ({
      category: cat.name,
      items: mapped.filter((item) => item.category_name === cat.name),
    }));
  } catch (err) {
    console.error("getItemsByMenu error:", err);
    return [];
  }
}

/**
 * Find items that contain or are free of a specific allergen.
 *
 * mode='contains': items with a 'contains' record for this allergen.
 * mode='free_of': items that do NOT have a 'contains' record (safe items).
 */
export async function filterByAllergen(
  allergenName: string,
  mode: "contains" | "free_of"
): Promise<AllergenResult[]> {
  try {
    const supabase = await createClient();

    // Find the allergen ID
    const { data: allergen, error: allergenErr } = await supabase
      .from("allergens")
      .select("id")
      .ilike("name", allergenName)
      .single();

    if (allergenErr || !allergen) {
      console.error("filterByAllergen allergen lookup error:", allergenErr);
      return [];
    }

    if (mode === "contains") {
      // Items that contain this allergen
      const { data: links, error: linkErr } = await supabase
        .from("item_allergens")
        .select("item_id, status, notes")
        .eq("allergen_id", allergen.id)
        .eq("status", "contains");

      if (linkErr || !links?.length) return [];

      const itemIds = links.map((l) => l.item_id);
      const { data: items, error: itemErr } = await supabase
        .from("menu_items")
        .select("*, menu_categories!inner(name, menus!inner(name))")
        .in("id", itemIds)
        .eq("is_active", true)
        .order("item_name");

      if (itemErr) return [];

      const linkMap = new Map(links.map((l) => [l.item_id, l]));
      return (items ?? []).map((row) => {
        const link = linkMap.get(row.id as string);
        return {
          ...mapItemRow(row),
          allergen_status: (link?.status as string) ?? "contains",
          allergen_notes: (link?.notes as string | null) ?? null,
        };
      });
    }

    // mode === 'free_of': items WITHOUT a 'contains' record for this allergen
    const { data: containsLinks, error: containsErr } = await supabase
      .from("item_allergens")
      .select("item_id")
      .eq("allergen_id", allergen.id)
      .eq("status", "contains");

    if (containsErr) return [];

    const excludeIds = (containsLinks ?? []).map((l) => l.item_id);

    let query = supabase
      .from("menu_items")
      .select("*, menu_categories!inner(name, menus!inner(name))")
      .eq("is_active", true)
      .order("item_name");

    if (excludeIds.length > 0) {
      // Supabase doesn't have a "not in" filter directly, use .not()
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: safeItems, error: safeErr } = await query;
    if (safeErr) return [];

    return (safeItems ?? []).map((row) => ({
      ...mapItemRow(row),
      allergen_status: "free_of",
      allergen_notes: null,
    }));
  } catch (err) {
    console.error("filterByAllergen error:", err);
    return [];
  }
}

/**
 * Find items with a specific dietary tag.
 */
export async function filterByDietaryTag(tagName: string): Promise<DietaryTagResult[]> {
  try {
    const supabase = await createClient();

    const { data: tag, error: tagErr } = await supabase
      .from("dietary_tags")
      .select("id")
      .ilike("name", tagName)
      .single();

    if (tagErr || !tag) return [];

    const { data: links, error: linkErr } = await supabase
      .from("item_dietary_tags")
      .select("item_id, status")
      .eq("dietary_tag_id", tag.id);

    if (linkErr || !links?.length) return [];

    const itemIds = links.map((l) => l.item_id);
    const { data: items, error: itemErr } = await supabase
      .from("menu_items")
      .select("*, menu_categories!inner(name, menus!inner(name))")
      .in("id", itemIds)
      .eq("is_active", true)
      .order("item_name");

    if (itemErr) return [];

    const linkMap = new Map(links.map((l) => [l.item_id, l]));
    return (items ?? []).map((row) => ({
      ...mapItemRow(row),
      tag_status: (linkMap.get(row.id as string)?.status as string) ?? "confirmed",
    }));
  } catch (err) {
    console.error("filterByDietaryTag error:", err);
    return [];
  }
}

/**
 * Single item with all related data.
 */
export async function getItemWithFullDetails(
  itemId: string,
  includeStaffNotes: boolean
): Promise<ItemDetail | null> {
  try {
    const supabase = await createClient();

    const [itemRes, allergenRes, dietaryRes, pairingRes, noteRes] = await Promise.all([
      supabase
        .from("menu_items")
        .select("*, menu_categories!inner(name, menus!inner(name))")
        .eq("id", itemId)
        .single(),
      supabase
        .from("item_allergens")
        .select("status, notes, allergens(name)")
        .eq("item_id", itemId),
      supabase
        .from("item_dietary_tags")
        .select("status, dietary_tags(name)")
        .eq("item_id", itemId),
      supabase
        .from("item_pairings")
        .select("pairing_type, recommendation, paired_item_id")
        .eq("item_id", itemId),
      includeStaffNotes
        ? supabase
            .from("item_staff_notes")
            .select("note_type, content")
            .eq("item_id", itemId)
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (itemRes.error || !itemRes.data) return null;

    const row = itemRes.data;
    const base = mapItemRow(row);

    // Resolve paired item names
    const pairings = pairingRes.data ?? [];
    const pairedIds = pairings
      .map((p) => p.paired_item_id)
      .filter((id): id is string => !!id);

    let pairedNameMap = new Map<string, string>();
    if (pairedIds.length > 0) {
      const { data: pairedItems } = await supabase
        .from("menu_items")
        .select("id, item_name")
        .in("id", pairedIds);
      pairedNameMap = new Map((pairedItems ?? []).map((i) => [i.id, i.item_name]));
    }

    return {
      id: base.id,
      item_name: base.item_name,
      price: base.price,
      description_short: base.description_short,
      description_long: base.description_long,
      ingredients_high_level: base.ingredients_high_level,
      ingredients_detailed: base.ingredients_detailed,
      modification_notes: base.modification_notes,
      seasonal_availability: base.seasonal_availability,
      available_during: base.available_during,
      menu_flags: base.menu_flags,
      is_active: base.is_active,
      category_name: base.category_name,
      menu_name: base.menu_name,
      allergens: (allergenRes.data ?? []).map((a) => ({
        name: ((a.allergens as unknown as { name: string } | null)?.name) ?? "",
        status: a.status,
        notes: a.notes,
      })),
      dietary_tags: (dietaryRes.data ?? []).map((t) => ({
        name: ((t.dietary_tags as unknown as { name: string } | null)?.name) ?? "",
        status: t.status,
      })),
      pairings: pairings.map((p) => ({
        pairing_type: p.pairing_type,
        recommendation: p.recommendation,
        paired_item_name: p.paired_item_id
          ? pairedNameMap.get(p.paired_item_id) ?? null
          : null,
      })),
      ...(includeStaffNotes && noteRes.data
        ? {
            staff_notes: noteRes.data.map((n) => ({
              note_type: n.note_type,
              content: n.content,
            })),
          }
        : {}),
    };
  } catch (err) {
    console.error("getItemWithFullDetails error:", err);
    return null;
  }
}

/**
 * Find items matching an array of name fragments (fuzzy).
 */
export async function getItemsByNameMatch(
  names: string[],
  includeStaffNotes: boolean = false
): Promise<ItemDetail[]> {
  try {
    const supabase = await createClient();

    const conditions = names.map((n) => `item_name.ilike.%${n}%`).join(",");

    const { data, error } = await supabase
      .from("menu_items")
      .select("id")
      .or(conditions)
      .limit(20);

    if (error || !data?.length) return [];

    const details = await Promise.all(
      data.map((item) => getItemWithFullDetails(item.id, includeStaffNotes))
    );

    return details.filter((d): d is ItemDetail => d !== null);
  } catch (err) {
    console.error("getItemsByNameMatch error:", err);
    return [];
  }
}

/**
 * All pairings for a specific item, with paired item names resolved.
 */
export async function getPairingsForItem(itemId: string): Promise<PairingResult[]> {
  try {
    const supabase = await createClient();

    const { data: pairings, error } = await supabase
      .from("item_pairings")
      .select("pairing_type, recommendation, paired_item_id")
      .eq("item_id", itemId);

    if (error || !pairings?.length) return [];

    const pairedIds = pairings
      .map((p) => p.paired_item_id)
      .filter((id): id is string => !!id);

    let nameMap = new Map<string, string>();
    if (pairedIds.length > 0) {
      const { data: items } = await supabase
        .from("menu_items")
        .select("id, item_name")
        .in("id", pairedIds);
      nameMap = new Map((items ?? []).map((i) => [i.id, i.item_name]));
    }

    return pairings.map((p) => ({
      pairing_type: p.pairing_type,
      recommendation: p.recommendation,
      paired_item_name: p.paired_item_id
        ? nameMap.get(p.paired_item_id) ?? null
        : null,
    }));
  } catch (err) {
    console.error("getPairingsForItem error:", err);
    return [];
  }
}

/**
 * Restaurant record + public key people.
 */
export async function getRestaurantContext(): Promise<RestaurantContext | null> {
  try {
    const supabase = await createClient();

    const { data: restaurant, error: restErr } = await supabase
      .from("restaurant")
      .select("name, tagline, story, cross_contamination_disclaimer, metadata")
      .single();

    if (restErr || !restaurant) {
      console.error("getRestaurantContext error:", restErr);
      return null;
    }

    const { data: people, error: peopleErr } = await supabase
      .from("key_people")
      .select("name, role, bio")
      .eq("is_public", true)
      .order("sort_order");

    if (peopleErr) {
      console.error("getRestaurantContext people error:", peopleErr);
    }

    return {
      name: restaurant.name,
      tagline: restaurant.tagline,
      story: restaurant.story,
      cross_contamination_disclaimer: restaurant.cross_contamination_disclaimer,
      metadata: restaurant.metadata as Record<string, unknown>,
      key_people: (people ?? []).map((p) => ({
        name: p.name,
        role: p.role,
        bio: p.bio,
      })),
    };
  } catch (err) {
    console.error("getRestaurantContext error:", err);
    return null;
  }
}

/**
 * Service settings with their associated menu names.
 */
export async function getServiceSettings(): Promise<ServiceSettingResult[]> {
  try {
    const supabase = await createClient();

    const { data: settings, error: ssErr } = await supabase
      .from("service_settings")
      .select("id, name, days_available, hours, notes")
      .order("name");

    if (ssErr || !settings?.length) return [];

    const { data: junctions, error: jErr } = await supabase
      .from("menu_service_settings")
      .select("menu_id, service_setting_id");

    if (jErr) {
      console.error("getServiceSettings junction error:", jErr);
    }

    const { data: menus, error: menuErr } = await supabase
      .from("menus")
      .select("id, name");

    if (menuErr) {
      console.error("getServiceSettings menus error:", menuErr);
    }

    const menuMap = new Map((menus ?? []).map((m) => [m.id, m.name]));
    const junctionList = junctions ?? [];

    return settings.map((ss) => ({
      id: ss.id,
      name: ss.name,
      days_available: ss.days_available,
      hours: ss.hours,
      notes: ss.notes,
      menu_names: junctionList
        .filter((j) => j.service_setting_id === ss.id)
        .map((j) => menuMap.get(j.menu_id) ?? "")
        .filter(Boolean),
    }));
  } catch (err) {
    console.error("getServiceSettings error:", err);
    return [];
  }
}
