import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/admin/menus/[id] — fetch single menu with nested categories and items
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    // Fetch the menu
    const { data: menu, error: menuError } = await admin
      .from("menus")
      .select("*")
      .eq("id", id)
      .single();

    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 404 });
    }

    // Fetch categories for this menu
    const { data: categories, error: catError } = await admin
      .from("menu_categories")
      .select("*")
      .eq("menu_id", id)
      .order("sort_order");

    if (catError) {
      return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    // Fetch items for all categories in this menu
    const categoryIds = categories.map((c) => c.id);
    let items: Array<Record<string, unknown>> = [];

    if (categoryIds.length > 0) {
      const { data, error: itemsError } = await admin
        .from("menu_items")
        .select("*")
        .in("category_id", categoryIds)
        .order("sort_order");

      if (itemsError) {
        return NextResponse.json(
          { error: itemsError.message },
          { status: 500 }
        );
      }

      items = data || [];
    }

    // Fetch service settings for this menu
    const { data: menuServiceSettings } = await admin
      .from("menu_service_settings")
      .select("service_setting_id")
      .eq("menu_id", id);

    // Assemble nested structure
    const nested = {
      ...menu,
      service_setting_ids: (menuServiceSettings ?? []).map(
        (mss: { service_setting_id: string }) => mss.service_setting_id
      ),
      menu_categories: categories.map((category) => ({
        ...category,
        menu_items: items.filter(
          (item) => item.category_id === category.id
        ),
      })),
    };

    return NextResponse.json(nested);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/menus/[id] — update menu fields and optionally service settings
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { name, description, sort_order, service_setting_ids } =
      await request.json();

    // Update the menu
    const { data: menu, error: menuError } = await admin
      .from("menus")
      .update({ name, description, sort_order })
      .eq("id", id)
      .select()
      .single();

    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    // If service_setting_ids provided, replace the junction records
    if (service_setting_ids) {
      const { error: deleteError } = await admin
        .from("menu_service_settings")
        .delete()
        .eq("menu_id", id);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      if (service_setting_ids.length > 0) {
        const junctionRows = service_setting_ids.map((ssId: string) => ({
          menu_id: id,
          service_setting_id: ssId,
        }));

        const { error: insertError } = await admin
          .from("menu_service_settings")
          .insert(junctionRows);

        if (insertError) {
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(menu);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/menus/[id] — delete a menu
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { error } = await admin.from("menus").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
