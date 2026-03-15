import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Server-side sign out.
 * Clears the Supabase session cookies (httpOnly, can't be cleared client-side)
 * then redirects to the home page.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), {
    status: 302,
  });
}
