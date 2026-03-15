"use client";

import { AppNav } from "@/components/navigation/app-nav";

/**
 * Admin layout — renders immediately.
 *
 * Route protection is handled by middleware (src/middleware.ts) which
 * validates the session cookie and checks the admin role server-side
 * BEFORE this layout ever mounts.  There is no need to duplicate that
 * check client-side; doing so introduced race conditions between the
 * server-validated cookie and the client-side Supabase auth hydration.
 *
 * The AuthProvider still hydrates in the background so that AppNav can
 * show the user email / role and the Sign Out button works.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a1628]">
      <AppNav />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
