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
    const { staff_notes } = await request.json();

    const { error: deleteError } = await admin
      .from("item_staff_notes")
      .delete()
      .eq("item_id", id);

    if (deleteError) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    if (!staff_notes || staff_notes.length === 0) {
      return NextResponse.json([]);
    }

    const rows = staff_notes.map(
      (n: { note_type: string; content: string }) => ({
        item_id: id,
        note_type: n.note_type,
        content: n.content,
      })
    );

    const { data, error } = await admin
      .from("item_staff_notes")
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/admin/items/[id]/staff-notes error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
