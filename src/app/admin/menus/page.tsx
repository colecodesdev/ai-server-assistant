"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Menu } from "@/types/database";

interface MenuWithCounts extends Menu {
  category_count: number;
  item_count: number;
}

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMenu, setNewMenu] = useState({ name: "", description: "", sort_order: 0 });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/menus");
      if (!res.ok) throw new Error();
      const menuList: Menu[] = await res.json();

      // Fetch details for each menu to get category/item counts
      const detailed = await Promise.all(
        menuList.map(async (menu) => {
          try {
            const detailRes = await fetch(`/api/admin/menus/${menu.id}`);
            if (!detailRes.ok) return { ...menu, category_count: 0, item_count: 0 };
            const detail = await detailRes.json();
            const categories = detail.menu_categories ?? [];
            const itemCount = categories.reduce(
              (sum: number, cat: { menu_items?: unknown[] }) =>
                sum + (cat.menu_items?.length ?? 0),
              0
            );
            return { ...menu, category_count: categories.length, item_count: itemCount };
          } catch {
            return { ...menu, category_count: 0, item_count: 0 };
          }
        })
      );

      setMenus(detailed);
    } catch {
      showMsg("error", "Failed to load menus");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const handleCreate = async () => {
    if (!newMenu.name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMenu),
      });
      if (!res.ok) throw new Error();
      const created: Menu = await res.json();
      setMenus((prev) => [...prev, { ...created, category_count: 0, item_count: 0 }]);
      setNewMenu({ name: "", description: "", sort_order: 0 });
      setShowCreate(false);
      showMsg("success", "Menu created");
    } catch {
      showMsg("error", "Failed to create menu");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this menu and all its categories and items?")) return;
    try {
      const res = await fetch(`/api/admin/menus/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMenus((prev) => prev.filter((m) => m.id !== id));
      showMsg("success", "Menu deleted");
    } catch {
      showMsg("error", "Failed to delete menu");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-light text-white">Menus</h1>
          <p className="mt-1 text-sm text-white/40">
            Manage your restaurant&apos;s menus and their categories.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-[#c4956a] px-4 py-2.5 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a]"
        >
          Create Menu
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-2 text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-400"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-xl border border-[#c4956a]/30 bg-white/5 p-6">
          <h2 className="mb-4 text-sm font-medium text-white/70">New Menu</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              placeholder="Menu name"
              value={newMenu.name}
              onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
            <input
              type="number"
              placeholder="Sort order"
              value={newMenu.sort_order}
              onChange={(e) =>
                setNewMenu({ ...newMenu, sort_order: parseInt(e.target.value) || 0 })
              }
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
          </div>
          <textarea
            placeholder="Description (optional)"
            rows={2}
            value={newMenu.description}
            onChange={(e) => setNewMenu({ ...newMenu, description: e.target.value })}
            className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newMenu.name}
              className="rounded-lg bg-[#c4956a] px-6 py-2.5 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewMenu({ name: "", description: "", sort_order: 0 });
              }}
              className="rounded-md border border-white/10 px-4 py-2.5 text-sm text-white/40 hover:border-white/20 hover:text-white/70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Menu list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : menus.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/40">No menus yet. Create your first menu above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="group rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-[#c4956a]/30 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link
                    href={`/admin/menus/${menu.id}`}
                    className="text-lg font-medium text-white hover:text-[#c4956a]"
                  >
                    {menu.name}
                  </Link>
                  {menu.description && (
                    <p className="mt-1 text-sm text-white/40">{menu.description}</p>
                  )}
                  <div className="mt-3 flex gap-4 text-xs text-white/30">
                    <span>Sort: {menu.sort_order}</span>
                    <span>{menu.category_count} categories</span>
                    <span>{menu.item_count} items</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/menus/${menu.id}`}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:border-white/20 hover:text-white/70"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(menu.id)}
                    className="rounded-md border border-red-500/20 px-3 py-1.5 text-sm text-red-400/60 hover:border-red-500/40 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
