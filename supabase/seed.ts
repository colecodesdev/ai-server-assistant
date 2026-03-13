/**
 * Seed script for Old Florida Fish House AI Server Assistant.
 *
 * Usage:
 *   npx tsx supabase/seed.ts
 *
 * Requires:
 *   - npm install tsx (dev dependency, for running TypeScript directly)
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * This script uses the service role key to bypass RLS.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// Load JSON
// ============================================================

const jsonPath = path.resolve(process.cwd(), "supabase", "OFHS_menu_data_normalized.json");
if (!fs.existsSync(jsonPath)) {
  console.error(`Menu data not found at ${jsonPath}`);
  console.error("Copy OFHS_menu_data_normalized.json into the supabase/ directory.");
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

// ============================================================
// Lookup maps (built as we insert)
// ============================================================

const allergenMap: Record<string, string> = {}; // name → uuid
const dietaryTagMap: Record<string, string> = {}; // name → uuid
const menuItemMap: Record<string, string> = {}; // json item_id → db uuid

// ============================================================
// Helpers
// ============================================================

async function upsertAllergen(name: string): Promise<string> {
  const key = name.toLowerCase().trim();
  if (allergenMap[key]) return allergenMap[key];

  const { data, error } = await supabase
    .from("allergens")
    .upsert({ name: name.trim() }, { onConflict: "name" })
    .select("id")
    .single();

  if (error) throw new Error(`Allergen upsert failed for "${name}": ${error.message}`);
  allergenMap[key] = data.id;
  return data.id;
}

async function upsertDietaryTag(name: string): Promise<string> {
  const key = name.toLowerCase().trim();
  if (dietaryTagMap[key]) return dietaryTagMap[key];

  const { data, error } = await supabase
    .from("dietary_tags")
    .upsert({ name: name.trim() }, { onConflict: "name" })
    .select("id")
    .single();

  if (error) throw new Error(`Dietary tag upsert failed for "${name}": ${error.message}`);
  dietaryTagMap[key] = data.id;
  return data.id;
}

function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

// ============================================================
// Main seed function
// ============================================================

async function seed() {
  const startTime = Date.now();
  log("🌱", "Starting seed...");

  // ----------------------------------------------------------
  // 1. Restaurant
  // ----------------------------------------------------------
  const restData = rawData.restaurant;
  const { data: restaurant, error: restErr } = await supabase
    .from("restaurant")
    .insert({
      name: restData.name,
      tagline: restData.tagline || null,
      website: restData.website || null,
      story: restData.story || null,
      address: restData.address || null,
      phone: restData.phone || null,
      email: restData.email || null,
      cross_contamination_disclaimer: restData.cross_contamination_disclaimer || null,
      metadata: restData.metadata || {},
    })
    .select("id")
    .single();

  if (restErr) throw new Error(`Restaurant insert failed: ${restErr.message}`);
  const restaurantId = restaurant.id;
  log("🏪", `Restaurant: ${restData.name} (${restaurantId})`);

  // ----------------------------------------------------------
  // 2. Key People
  // ----------------------------------------------------------
  if (restData.key_people && restData.key_people.length > 0) {
    const keyPeopleRows = restData.key_people.map((p: any, i: number) => ({
      restaurant_id: restaurantId,
      name: p.name,
      role: p.role,
      bio: p.bio || null,
      is_public: p.is_public !== false,
      sort_order: i,
    }));

    const { error: kpErr } = await supabase.from("key_people").insert(keyPeopleRows);
    if (kpErr) throw new Error(`Key people insert failed: ${kpErr.message}`);
    log("👥", `Key people: ${keyPeopleRows.length} inserted`);
  }

  // ----------------------------------------------------------
  // 3. Service Settings
  // ----------------------------------------------------------
  const serviceSettingMap: Record<string, string> = {};

  if (restData.service_settings && restData.service_settings.length > 0) {
    for (const ss of restData.service_settings) {
      const { data: ssData, error: ssErr } = await supabase
        .from("service_settings")
        .insert({
          restaurant_id: restaurantId,
          name: ss.name,
          days_available: ss.days_available || null,
          hours: ss.hours || null,
          notes: ss.notes || null,
        })
        .select("id")
        .single();

      if (ssErr) throw new Error(`Service setting insert failed: ${ssErr.message}`);
      serviceSettingMap[ss.name.toLowerCase()] = ssData.id;
    }
    log("🕐", `Service settings: ${Object.keys(serviceSettingMap).length} inserted`);
  }

  // ----------------------------------------------------------
  // 4. Menus, Categories, Items
  // ----------------------------------------------------------
  let totalCategories = 0;
  let totalItems = 0;
  let totalAllergens = 0;
  let totalDietaryTags = 0;
  let totalPairings = 0;
  let totalStaffNotes = 0;

  for (const [menuIdx, menu] of rawData.menus.entries()) {
    // Insert menu
    const { data: menuData, error: menuErr } = await supabase
      .from("menus")
      .insert({
        restaurant_id: restaurantId,
        name: menu.menu_name,
        description: menu.description || null,
        sort_order: menuIdx,
      })
      .select("id")
      .single();

    if (menuErr) throw new Error(`Menu insert failed for "${menu.menu_name}": ${menuErr.message}`);
    const menuId = menuData.id;

    // Link menu to service settings
    if (menu.service_settings && menu.service_settings.length > 0) {
      for (const ssName of menu.service_settings) {
        const ssId = serviceSettingMap[ssName.toLowerCase()];
        if (ssId) {
          await supabase.from("menu_service_settings").insert({
            menu_id: menuId,
            service_setting_id: ssId,
          });
        }
      }
    }

    // Insert categories and items
    for (const [catIdx, category] of menu.categories.entries()) {
      const { data: catData, error: catErr } = await supabase
        .from("menu_categories")
        .insert({
          menu_id: menuId,
          name: category.category,
          category_notes: category.category_notes || null,
          sort_order: catIdx,
        })
        .select("id")
        .single();

      if (catErr) throw new Error(`Category insert failed for "${category.category}": ${catErr.message}`);
      const categoryId = catData.id;
      totalCategories++;

      for (const [itemIdx, item] of category.items.entries()) {
        // Insert menu item
        const { data: itemData, error: itemErr } = await supabase
          .from("menu_items")
          .insert({
            category_id: categoryId,
            item_name: item.item_name,
            price: item.price,
            available_during: item.available_during || null,
            menu_flags: item.menu_flags || [],
            description_short: item.description_short || null,
            description_long: item.description_long || null,
            ingredients_high_level: item.ingredients_high_level || null,
            ingredients_detailed: item.ingredients_detailed || null,
            modification_notes: item.modification_notes || null,
            seasonal_availability: item.seasonal_availability || null,
            is_active: item.is_active !== false,
            sort_order: itemIdx,
          })
          .select("id")
          .single();

        if (itemErr) throw new Error(`Item insert failed for "${item.item_name}": ${itemErr.message}`);
        const dbItemId = itemData.id;
        menuItemMap[item.item_id] = dbItemId;
        totalItems++;

        // --- Allergens ---
        const allergens = item.allergens || {};

        // "contains" entries
        if (Array.isArray(allergens.contains)) {
          for (const a of allergens.contains) {
            if (a.name) {
              const allergenId = await upsertAllergen(a.name);
              await supabase.from("item_allergens").insert({
                item_id: dbItemId,
                allergen_id: allergenId,
                status: a.status === "verify" ? "verify" : "contains",
                notes: a.notes || null,
              });
              totalAllergens++;
            }
          }
        }

        // "free_of" entries
        if (Array.isArray(allergens.free_of)) {
          for (const a of allergens.free_of) {
            if (a.name) {
              const allergenId = await upsertAllergen(a.name);
              await supabase.from("item_allergens").insert({
                item_id: dbItemId,
                allergen_id: allergenId,
                status: "free_of",
                notes: a.notes || null,
              });
              totalAllergens++;
            }
          }
        }

        // --- Dietary Tags ---
        if (Array.isArray(item.dietary_tags)) {
          for (const dt of item.dietary_tags) {
            if (dt.name) {
              const tagId = await upsertDietaryTag(dt.name);
              await supabase.from("item_dietary_tags").insert({
                item_id: dbItemId,
                dietary_tag_id: tagId,
                status: dt.status === "verify" ? "verify" : "confirmed",
              });
              totalDietaryTags++;
            }
          }
        }

        // --- Pairings ---
        if (item.pairings) {
          const pairingTypes = ["wine", "cocktail", "sake", "beer", "non_alcoholic"] as const;
          for (const pt of pairingTypes) {
            const rec = item.pairings[pt];
            if (rec && typeof rec === "string" && rec.trim()) {
              await supabase.from("item_pairings").insert({
                item_id: dbItemId,
                pairing_type: pt,
                recommendation: rec,
              });
              totalPairings++;
            }
          }
        }

        // --- Staff Notes ---
        if (item.staff_notes) {
          const noteMapping: Record<string, string> = {
            prep_notes: "prep",
            upsell_guidance: "upsell",
            common_questions: "common_question",
            seasonal_availability: "general",
          };

          for (const [jsonKey, noteType] of Object.entries(noteMapping)) {
            const content = item.staff_notes[jsonKey];
            if (content && typeof content === "string" && content.trim()) {
              await supabase.from("item_staff_notes").insert({
                item_id: dbItemId,
                note_type: noteType,
                content: content,
              });
              totalStaffNotes++;
            }
          }
        }
      }
    }

    log("📋", `Menu: ${menu.menu_name} — ${menu.categories.length} categories`);
  }

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("");
  log("✅", "Seed complete!");
  console.log("   ─────────────────────────────");
  console.log(`   Restaurant:    1`);
  console.log(`   Menus:         ${rawData.menus.length}`);
  console.log(`   Categories:    ${totalCategories}`);
  console.log(`   Items:         ${totalItems}`);
  console.log(`   Allergen links: ${totalAllergens}`);
  console.log(`   Dietary tags:  ${totalDietaryTags}`);
  console.log(`   Pairings:      ${totalPairings}`);
  console.log(`   Staff notes:   ${totalStaffNotes}`);
  console.log(`   Unique allergens: ${Object.keys(allergenMap).length}`);
  console.log(`   Unique dietary tags: ${Object.keys(dietaryTagMap).length}`);
  console.log(`   ─────────────────────────────`);
  console.log(`   Time: ${elapsed}s`);
}

// Run
seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
