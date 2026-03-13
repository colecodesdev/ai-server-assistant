import { NextResponse } from "next/server";

// Chat API endpoint — will be implemented Day 3
export async function POST() {
  return NextResponse.json(
    { message: "Chat endpoint not yet implemented" },
    { status: 501 }
  );
}
