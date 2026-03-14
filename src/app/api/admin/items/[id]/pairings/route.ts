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
  const { pairings } = await request.json();

  const { error: deleteError } = await admin
    .from("item_pairings")
    .delete()
    .eq("item_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (!pairings || pairings.length === 0) {
    return NextResponse.json([]);
  }

  const rows = pairings.map(
    (p: {
      pairing_type: string;
      recommendation: string;
      paired_item_id?: string;
    }) => ({
      item_id: id,
      pairing_type: p.pairing_type,
      recommendation: p.recommendation,
      paired_item_id: p.paired_item_id,
    })
  );

  const { data, error } = await admin
    .from("item_pairings")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
