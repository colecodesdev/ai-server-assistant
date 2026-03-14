"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { AppNav } from "@/components/navigation/app-nav";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a1628]">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    );
  }

  // Middleware handles redirect, but this is a client-side fallback
  if (!user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a1628]">
        <div className="text-center">
          <p className="text-white/50 text-sm mb-4">Authentication required</p>
          <a
            href="/auth/login"
            className="rounded-lg bg-[#c4956a] px-6 py-2 text-sm font-medium text-[#0a1628]"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a1628]">
      <AppNav />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
