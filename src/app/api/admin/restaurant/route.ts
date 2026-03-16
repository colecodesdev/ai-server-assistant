import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { data: restaurant, error } = await admin
      .from("restaurant")
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: key_people } = await admin
      .from("key_people")
      .select("*")
      .order("sort_order");

    return NextResponse.json({ ...restaurant, key_people: key_people ?? [] });
  } catch (err) {
    console.error("GET /api/admin/restaurant error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const body = await request.json();

    const {
      name,
      tagline,
      story,
      website,
      address,
      phone,
      email,
      cross_contamination_disclaimer,
      metadata,
    } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (tagline !== undefined) updates.tagline = tagline;
    if (story !== undefined) updates.story = story;
    if (website !== undefined) updates.website = website;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (cross_contamination_disclaimer !== undefined)
      updates.cross_contamination_disclaimer = cross_contamination_disclaimer;
    if (metadata !== undefined) updates.metadata = metadata;

    const { data: restaurant, error } = await admin
      .from("restaurant")
      .update(updates)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(restaurant);
  } catch (err) {
    console.error("PUT /api/admin/restaurant error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
