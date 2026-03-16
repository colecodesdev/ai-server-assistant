import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { searchParams } = request.nextUrl;
    const menu_id = searchParams.get("menu_id");
    const category_id = searchParams.get("category_id");
    const search = searchParams.get("search");
    const allergen_id = searchParams.get("allergen_id");
    const dietary_tag_id = searchParams.get("dietary_tag_id");
    const active_only = searchParams.get("active_only");

    let query = admin
      .from("menu_items")
      .select(
        "*, menu_categories!inner(name, menu_id, menus!inner(name))"
      );

    if (menu_id) {
      query = query.eq("menu_categories.menu_id", menu_id);
    }

    if (category_id) {
      query = query.eq("category_id", category_id);
    }

    if (search) {
      query = query.ilike("item_name", `%${search}%`);
    }

    if (active_only === "true") {
      query = query.eq("is_active", true);
    }

    if (allergen_id) {
      const { data: allergenItems } = await admin
        .from("item_allergens")
        .select("item_id")
        .eq("allergen_id", allergen_id);

      const itemIds = (allergenItems ?? []).map((row) => row.item_id);
      query = query.in("id", itemIds);
    }

    if (dietary_tag_id) {
      const { data: tagItems } = await admin
        .from("item_dietary_tags")
        .select("item_id")
        .eq("dietary_tag_id", dietary_tag_id);

      const itemIds = (tagItems ?? []).map((row) => row.item_id);
      query = query.in("id", itemIds);
    }

    const { data, error } = await query.order("sort_order");

    if (error) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/admin/items error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const body = await request.json();

    const { data, error } = await admin
      .from("menu_items")
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/items error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
