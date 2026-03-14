import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const admin = result.admin;

  const { data: key_people, error } = await admin
    .from("key_people")
    .select("*")
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(key_people);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const admin = result.admin;

  const body = await request.json();
  const { name, role, bio, is_public, sort_order } = body;

  // Fetch restaurant_id from the single restaurant record
  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurant")
    .select("id")
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json(
      { error: "Restaurant not found" },
      { status: 500 }
    );
  }

  const { data: person, error } = await admin
    .from("key_people")
    .insert({
      restaurant_id: restaurant.id,
      name,
      role,
      bio: bio ?? null,
      is_public: is_public ?? true,
      sort_order: sort_order ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(person, { status: 201 });
}
