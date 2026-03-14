import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/admin/menus — fetch all menus ordered by sort_order
export async function GET() {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { data: menus, error } = await admin
      .from("menus")
      .select("*")
      .order("sort_order");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(menus);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/menus — create a new menu
export async function POST(request: Request) {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { name, description, sort_order, service_setting_ids } =
      await request.json();

    // Get the restaurant_id (single-restaurant setup)
    const { data: restaurant, error: restError } = await admin
      .from("restaurants")
      .select("id")
      .single();

    if (restError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Insert the menu
    const { data: menu, error: menuError } = await admin
      .from("menus")
      .insert({
        restaurant_id: restaurant.id,
        name,
        description,
        sort_order,
      })
      .select()
      .single();

    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    // If service_setting_ids provided, insert junction records
    if (service_setting_ids && service_setting_ids.length > 0) {
      const junctionRows = service_setting_ids.map((ssId: string) => ({
        menu_id: menu.id,
        service_setting_id: ssId,
      }));

      const { error: junctionError } = await admin
        .from("menu_service_settings")
        .insert(junctionRows);

      if (junctionError) {
        return NextResponse.json(
          { error: junctionError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(menu, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
