import { NextResponse } from "next/server";

// Supabase auth callback handler — will be implemented Day 2
export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/", url.origin));
}
