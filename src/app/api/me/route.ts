import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * GET /api/me — returns the current user's role.
 * Used by AuthProvider to avoid direct browser-client RLS issues
 * when querying the users table.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ role: data?.role ?? null });
}
