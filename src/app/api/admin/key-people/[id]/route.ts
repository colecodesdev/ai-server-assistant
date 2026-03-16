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
    const body = await request.json();

    const { name, role, bio, is_public, sort_order } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (bio !== undefined) updates.bio = bio;
    if (is_public !== undefined) updates.is_public = is_public;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data: person, error } = await admin
      .from("key_people")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json(person);
  } catch (err) {
    console.error("PUT /api/admin/key-people/[id] error:", err);
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

    const { error } = await admin.from("key_people").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/key-people/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
