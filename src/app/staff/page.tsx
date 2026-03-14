"use client";

import { useAuth } from "@/components/providers/auth-provider";

export default function StaffPage() {
  const { user, role } = useAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-4 text-4xl">🐟</div>
        <h1 className="mb-2 font-heading text-xl font-light text-white">
          Staff Assistant
        </h1>
        <p className="mb-2 text-sm text-white/40">
          Welcome back, {user?.email?.split("@")[0] ?? "team member"}.
        </p>
        <p className="mb-8 text-xs text-white/25">
          Role: {role} — You&apos;ll see prep notes, upsell tips, and internal details.
        </p>
        {/* Chat UI will be built on Day 5 */}
        <div className="mx-auto max-w-lg rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              disabled
              placeholder="Staff chat coming Day 5…"
              className="flex-1 rounded-lg bg-white/5 px-4 py-2.5 text-sm text-white/30 placeholder-white/20 outline-none"
            />
            <button
              disabled
              className="rounded-lg bg-[#c4956a]/30 px-4 py-2.5 text-sm text-[#0a1628]/50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
