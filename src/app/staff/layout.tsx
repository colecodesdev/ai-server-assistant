"use client";

import { AppNav } from "@/components/navigation/app-nav";

/**
 * Staff layout — renders immediately.
 *
 * Route protection is handled by middleware. See admin/layout.tsx for rationale.
 */
export default function StaffLayout({
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
