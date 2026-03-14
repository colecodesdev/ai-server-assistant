import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Supabase auth callback handler.
 * Exchanges the auth code for a session, then redirects to home.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // If no code or exchange failed, redirect to login with error
  return NextResponse.redirect(
    new URL("/auth/login?error=auth_callback_failed", origin)
  );
}
