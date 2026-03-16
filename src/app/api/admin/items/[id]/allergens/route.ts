import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { id } = await params;
    const { allergens } = await request.json();

    const { error: deleteError } = await admin
      .from("item_allergens")
      .delete()
      .eq("item_id", id);

    if (deleteError) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    if (!allergens || allergens.length === 0) {
      return NextResponse.json([]);
    }

    const rows = allergens.map(
      (a: { allergen_id: string; status: string; notes?: string }) => ({
        item_id: id,
        allergen_id: a.allergen_id,
        status: a.status,
        notes: a.notes,
      })
    );

    const { data, error } = await admin
      .from("item_allergens")
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/admin/items/[id]/allergens error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
