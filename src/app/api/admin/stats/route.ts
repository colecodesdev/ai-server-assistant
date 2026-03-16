import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const [
      totalItems,
      activeItems,
      menus,
      categories,
      allergens,
      dietaryTags,
      pairings,
      staffNotes,
    ] = await Promise.all([
      admin.from("menu_items").select("*", { count: "exact", head: true }),
      admin
        .from("menu_items")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      admin.from("menus").select("*", { count: "exact", head: true }),
      admin.from("menu_categories").select("*", { count: "exact", head: true }),
      admin.from("allergens").select("*", { count: "exact", head: true }),
      admin.from("dietary_tags").select("*", { count: "exact", head: true }),
      admin.from("item_pairings").select("*", { count: "exact", head: true }),
      admin.from("item_staff_notes").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      total_items: totalItems.count ?? 0,
      active_items: activeItems.count ?? 0,
      menus: menus.count ?? 0,
      categories: categories.count ?? 0,
      allergens: allergens.count ?? 0,
      dietary_tags: dietaryTags.count ?? 0,
      pairings: pairings.count ?? 0,
      staff_notes: staffNotes.count ?? 0,
    });
  } catch (err) {
    console.error("GET /api/admin/stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
