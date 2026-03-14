"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";

interface Stats {
  total_items: number;
  active_items: number;
  menus: number;
  categories: number;
  allergens: number;
  dietary_tags: number;
  pairings: number;
  staff_notes: number;
}

const quickLinks = [
  {
    label: "Menus",
    href: "/admin/menus",
    icon: "📋",
    description: "Manage menus, categories, and sort order",
  },
  {
    label: "Menu Items",
    href: "/admin/items",
    icon: "🍽️",
    description: "Edit items, allergens, pairings, staff notes",
  },
  {
    label: "Restaurant Profile",
    href: "/admin/restaurant",
    icon: "🏠",
    description: "Update story, key people, and policies",
  },
];

const statCards: { key: keyof Stats; label: string; format?: (s: Stats) => string }[] = [
  { key: "total_items", label: "Total Items", format: (s) => `${s.active_items} / ${s.total_items}` },
  { key: "menus", label: "Menus" },
  { key: "categories", label: "Categories" },
  { key: "allergens", label: "Allergens Tracked" },
  { key: "dietary_tags", label: "Dietary Tags" },
  { key: "pairings", label: "Pairings" },
  { key: "staff_notes", label: "Staff Notes" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-light text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-white/40">
          Welcome back, {user?.email?.split("@")[0] ?? "admin"}. Manage your
          restaurant data below.
        </p>
      </div>

      {/* Quick links grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-[#c4956a]/30 hover:bg-white/[0.07]"
          >
            <div className="mb-3 text-2xl">{link.icon}</div>
            <h2 className="mb-1 font-heading text-sm font-medium text-white group-hover:text-[#c4956a]">
              {link.label}
            </h2>
            <p className="text-xs text-white/30">{link.description}</p>
          </Link>
        ))}
      </div>

      {/* Stats grid */}
      <div className="mt-8">
        <h2 className="mb-4 font-heading text-sm font-medium text-white/50">
          Database Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="mb-2 h-8 w-16 animate-pulse rounded bg-white/5" />
                  <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
                </div>
              ))
            : statCards.map((card) => (
                <div
                  key={card.key}
                  className="rounded-xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="text-3xl font-heading text-white">
                    {card.format && stats
                      ? card.format(stats)
                      : stats?.[card.key] ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-white/40">{card.label}</div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
