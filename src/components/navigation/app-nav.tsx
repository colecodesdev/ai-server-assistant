"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const staffNav: NavItem[] = [
  { label: "Chat", href: "/staff", icon: "💬" },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Menus", href: "/admin/menus", icon: "📋" },
  { label: "Items", href: "/admin/items", icon: "🍽️" },
  { label: "Restaurant", href: "/admin/restaurant", icon: "🏠" },
  { label: "QR Code", href: "/admin/qr", icon: "📱" },
];

export function AppNav() {
  const pathname = usePathname();
  const { user, role, isLoading, signOut } = useAuth();

  const isAdminSection = pathname.startsWith("/admin");
  // While auth is loading, infer role from the current route (middleware already validated)
  const effectiveRole = role ?? (isAdminSection ? "admin" : "staff");
  const isAdmin = effectiveRole === "admin";
  const navItems = isAdminSection ? adminNav : staffNav;

  return (
    <nav className="flex h-14 items-center justify-between border-b border-white/10 bg-[#0d1f35] px-4">
      {/* Left: branding + nav links */}
      <div className="flex items-center gap-6">
        <Link href={isAdmin ? "/admin" : "/staff"}>
          <Image
            src="/logo.png"
            alt="Old Florida Fish House"
            width={40}
            height={40}
            className="h-10 w-auto"
          />
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Admin can toggle to staff view */}
        {isAdmin && (
          <Link
            href={isAdminSection ? "/staff" : "/admin"}
            className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
          >
            {isAdminSection ? "Staff View" : "Admin Panel"}
          </Link>
        )}
      </div>

      {/* Right: user info + sign out */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          {isLoading ? (
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          ) : (
            <>
              <div className="text-xs text-white/40">{user?.email}</div>
              <div className="font-heading text-[10px] font-medium uppercase tracking-wider text-[#c4956a]/70">
                {effectiveRole}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
