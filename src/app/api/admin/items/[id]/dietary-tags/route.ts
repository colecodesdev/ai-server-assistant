import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const admin = result.admin;

  const { id } = await params;
  const { dietary_tags } = await request.json();

  const { error: deleteError } = await admin
    .from("item_dietary_tags")
    .delete()
    .eq("item_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (!dietary_tags || dietary_tags.length === 0) {
    return NextResponse.json([]);
  }

  const rows = dietary_tags.map(
    (t: { dietary_tag_id: string; status: string }) => ({
      item_id: id,
      dietary_tag_id: t.dietary_tag_id,
      status: t.status,
    })
  );

  const { data, error } = await admin
    .from("item_dietary_tags")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
