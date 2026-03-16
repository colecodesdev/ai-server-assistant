import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { id } = await params;

    const [itemResult, allergensResult, dietaryTagsResult, pairingsResult, staffNotesResult] =
      await Promise.all([
        admin.from("menu_items").select("*").eq("id", id).single(),
        admin
          .from("item_allergens")
          .select("*, allergens(name)")
          .eq("item_id", id),
        admin
          .from("item_dietary_tags")
          .select("*, dietary_tags(name)")
          .eq("item_id", id),
        admin.from("item_pairings").select("*").eq("item_id", id),
        admin.from("item_staff_notes").select("*").eq("item_id", id),
      ]);

    if (itemResult.error) {
      return NextResponse.json(
        { error: itemResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...itemResult.data,
      item_allergens: allergensResult.data ?? [],
      item_dietary_tags: dietaryTagsResult.data ?? [],
      item_pairings: pairingsResult.data ?? [],
      item_staff_notes: staffNotesResult.data ?? [],
    });
  } catch (err) {
    console.error("GET /api/admin/items/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { id } = await params;
    const body = await request.json();

    const { data, error } = await admin
      .from("menu_items")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/admin/items/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { id } = await params;

    const { error } = await admin
      .from("menu_items")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/items/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
