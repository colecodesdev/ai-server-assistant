import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Server-side sign out.
 * Clears the Supabase session cookies (httpOnly, can't be cleared client-side)
 * then redirects to the login page.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/auth/login", request.url), {
    status: 302,
  });
  response.cookies.delete("session_start");
  return response;
}
