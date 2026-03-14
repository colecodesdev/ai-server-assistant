"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Menu, Allergen, DietaryTag } from "@/types/database";

interface CategoryOption {
  id: string;
  name: string;
  menu_id: string;
  menus: { name: string } | null;
}

interface ItemRow {
  id: string;
  item_name: string;
  price: string;
  is_active: boolean;
  menu_flags: string[];
  sort_order: number;
  category_id: string;
  menu_categories: {
    name: string;
    menu_id: string;
    menus: { name: string };
  };
}

export default function ItemsPage() {
  const router = useRouter();

  // Filter state
  const [search, setSearch] = useState("");
  const [menuId, setMenuId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [allergenId, setAllergenId] = useState("");
  const [dietaryTagId, setDietaryTagId] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  // Data
  const [items, setItems] = useState<ItemRow[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Load filter options once
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/menus").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/allergens").then((r) => r.json()),
      fetch("/api/admin/dietary-tags").then((r) => r.json()),
    ])
      .then(([m, c, a, d]) => {
        setMenus(m);
        setCategories(c);
        setAllergens(a);
        setDietaryTags(d);
      })
      .catch(() => {})
      .finally(() => setFiltersLoaded(true));
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (menuId) params.set("menu_id", menuId);
      if (categoryId) params.set("category_id", categoryId);
      if (allergenId) params.set("allergen_id", allergenId);
      if (dietaryTagId) params.set("dietary_tag_id", dietaryTagId);
      if (activeFilter === "active") params.set("active_only", "true");

      const res = await fetch(`/api/admin/items?${params.toString()}`);
      if (!res.ok) throw new Error();
      let data: ItemRow[] = await res.json();

      // Client-side filter for inactive only
      if (activeFilter === "inactive") {
        data = data.filter((item) => !item.is_active);
      }

      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, menuId, categoryId, allergenId, dietaryTagId, activeFilter]);

  // Debounced fetch on filter change
  useEffect(() => {
    if (!filtersLoaded) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchItems, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchItems, filtersLoaded]);

  // Filter categories by selected menu
  const filteredCategories = menuId
    ? categories.filter((c) => c.menu_id === menuId)
    : categories;

  // Reset category when menu changes
  useEffect(() => {
    if (menuId && categoryId) {
      const valid = categories.some(
        (c) => c.id === categoryId && c.menu_id === menuId
      );
      if (!valid) setCategoryId("");
    }
  }, [menuId, categoryId, categories]);

  const selectClass =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30 [&>option]:bg-[#0d1f35] [&>option]:text-white";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-light text-white">
            Menu Items
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Search, filter, and manage all menu items.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/items/new")}
          className="rounded-lg bg-[#c4956a] px-4 py-2.5 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a]"
        >
          Create Item
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Search */}
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
          />

          {/* Menu filter */}
          <select
            value={menuId}
            onChange={(e) => setMenuId(e.target.value)}
            className={selectClass}
          >
            <option value="">All Menus</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={selectClass}
          >
            <option value="">All Categories</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.menus ? `${c.menus.name} / ` : ""}
                {c.name}
              </option>
            ))}
          </select>

          {/* Allergen filter */}
          <select
            value={allergenId}
            onChange={(e) => setAllergenId(e.target.value)}
            className={selectClass}
          >
            <option value="">All Allergens</option>
            {allergens.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Dietary tag filter */}
          <select
            value={dietaryTagId}
            onChange={(e) => setDietaryTagId(e.target.value)}
            className={selectClass}
          >
            <option value="">All Dietary Tags</option>
            {dietaryTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Active filter */}
          <select
            value={activeFilter}
            onChange={(e) =>
              setActiveFilter(e.target.value as "all" | "active" | "inactive")
            }
            className={selectClass}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      <div className="mb-3 text-xs text-white/30">
        {loading ? "Loading…" : `${items.length} item${items.length !== 1 ? "s" : ""} found`}
      </div>

      {/* Items list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/40">No items match your filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5">
          {/* Table header */}
          <div className="hidden border-b border-white/5 px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/30 sm:grid sm:grid-cols-[1fr_100px_150px_140px_80px]">
            <span>Name</span>
            <span>Price</span>
            <span>Category</span>
            <span>Menu</span>
            <span className="text-center">Status</span>
          </div>

          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => router.push(`/admin/items/${item.id}`)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.04] sm:grid sm:grid-cols-[1fr_100px_150px_140px_80px] ${
                i !== items.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              {/* Name + flags */}
              <div className="flex-1 sm:flex-none">
                <span className="text-sm text-white">{item.item_name}</span>
                {item.menu_flags?.length > 0 && (
                  <span className="ml-2 text-[10px] text-white/30">
                    {item.menu_flags.join(", ")}
                  </span>
                )}
              </div>

              {/* Price */}
              <span className="text-sm text-white/50">{item.price}</span>

              {/* Category */}
              <span className="hidden truncate text-sm text-white/40 sm:block">
                {item.menu_categories?.name ?? "—"}
              </span>

              {/* Menu */}
              <span className="hidden truncate text-sm text-white/30 sm:block">
                {item.menu_categories?.menus?.name ?? "—"}
              </span>

              {/* Status */}
              <span className="text-center">
                {item.is_active ? (
                  <span className="inline-block rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-green-400">
                    Active
                  </span>
                ) : (
                  <span className="inline-block rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-red-300">
                    Inactive
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
