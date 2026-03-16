import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    const result = await requireAdmin();
    if (result.error) return result.error;
    const admin = result.admin;

    const { data, error } = await admin
      .from("allergens")
      .select("*")
      .order("name");

    if (error) {
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/admin/allergens error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
