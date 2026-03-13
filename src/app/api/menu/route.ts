import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// GET /api/menu — returns all menus with categories and items
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: menus, error } = await supabase
      .from("menus")
      .select(
        `
        id,
        name,
        description,
        sort_order,
        menu_categories (
          id,
          name,
          category_notes,
          sort_order,
          menu_items (
            id,
            item_name,
            price,
            available_during,
            menu_flags,
            description_short,
            ingredients_high_level,
            is_active,
            sort_order
          )
        )
      `
      )
      .order("sort_order");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ menus });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
