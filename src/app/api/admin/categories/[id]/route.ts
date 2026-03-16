import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// PUT /api/admin/categories/[id] — update a category
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { menu_id, name, category_notes, sort_order } = await request.json();

    const updates: Record<string, unknown> = {};
    if (menu_id !== undefined) updates.menu_id = menu_id;
    if (name !== undefined) updates.name = name;
    if (category_notes !== undefined) updates.category_notes = category_notes;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data: category, error } = await admin
      .from("menu_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/categories/[id] — delete a category
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { error } = await admin
      .from("menu_categories")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
