import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const admin = result.admin;

  const { data, error } = await admin
    .from("allergens")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
