import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      admin: null,
    };
  }

  const { data: dbUser } = await createAdminClient()
    .from("users")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  if (!dbUser || dbUser.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      admin: null,
    };
  }

  return {
    error: null,
    admin: createAdminClient(),
    user: dbUser,
  };
}
