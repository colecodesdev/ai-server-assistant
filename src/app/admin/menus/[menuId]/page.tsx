"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Menu, MenuCategory, MenuItem, ServiceSetting } from "@/types/database";

interface CategoryWithItems extends MenuCategory {
  menu_items: MenuItem[];
}

interface MenuDetail extends Menu {
  service_setting_ids: string[];
  menu_categories: CategoryWithItems[];
}

export default function MenuDetailPage() {
  const params = useParams();
  const router = useRouter();
  const menuId = params.menuId as string;

  const [menu, setMenu] = useState<MenuDetail | null>(null);
  const [serviceSettings, setServiceSettings] = useState<ServiceSetting[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Category management
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", category_notes: "" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState<Partial<MenuCategory>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Inline menu editing
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchMenu = useCallback(async () => {
    try {
      const [menuRes, ssRes] = await Promise.all([
        fetch(`/api/admin/menus/${menuId}`),
        fetch("/api/admin/service-settings"),
      ]);
      if (!menuRes.ok) {
        router.push("/admin/menus");
        return;
      }
      const menuData: MenuDetail = await menuRes.json();
      const ssData: ServiceSetting[] = ssRes.ok ? await ssRes.json() : [];

      setMenu(menuData);
      setEditName(menuData.name);
      setEditDescription(menuData.description ?? "");
      setSelectedServiceIds(menuData.service_setting_ids ?? []);
      setServiceSettings(ssData);
    } catch {
      showMsg("error", "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [menuId, router]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleSaveMenu = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/menus/${menuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
          sort_order: menu?.sort_order,
          service_setting_ids: selectedServiceIds,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setMenu((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name,
              description: updated.description,
              sort_order: updated.sort_order,
            }
          : prev
      );
      showMsg("success", "Menu saved");
    } catch {
      showMsg("error", "Failed to save menu");
    } finally {
      setSaving(false);
    }
  };

  const toggleServiceSetting = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCategory = async () => {
    if (!newCategory.name) return;
    try {
      const sortOrder = menu?.menu_categories?.length ?? 0;
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          name: newCategory.name,
          category_notes: newCategory.category_notes || null,
          sort_order: sortOrder,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setMenu((prev) =>
        prev
          ? {
              ...prev,
              menu_categories: [
                ...prev.menu_categories,
                { ...created, menu_items: [] },
              ],
            }
          : prev
      );
      setNewCategory({ name: "", category_notes: "" });
      setShowAddCategory(false);
      showMsg("success", "Category created");
    } catch {
      showMsg("error", "Failed to create category");
    }
  };

  const handleUpdateCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCategoryForm),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setMenu((prev) =>
        prev
          ? {
              ...prev,
              menu_categories: prev.menu_categories.map((c) =>
                c.id === id ? { ...c, ...updated } : c
              ),
            }
          : prev
      );
      setEditingCategoryId(null);
      setEditCategoryForm({});
      showMsg("success", "Category updated");
    } catch {
      showMsg("error", "Failed to update category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its items?")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMenu((prev) =>
        prev
          ? {
              ...prev,
              menu_categories: prev.menu_categories.filter((c) => c.id !== id),
            }
          : prev
      );
      showMsg("success", "Category deleted");
    } catch {
      showMsg("error", "Failed to delete category");
    }
  };

  const handleReorderCategory = async (id: string, direction: "up" | "down") => {
    if (!menu) return;
    const cats = [...menu.menu_categories];
    const idx = cats.findIndex((c) => c.id === id);
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === cats.length - 1)
    )
      return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const [a, b] = [cats[idx], cats[swapIdx]];

    await Promise.all([
      fetch(`/api/admin/categories/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/categories/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ]);

    const tempOrder = a.sort_order;
    a.sort_order = b.sort_order;
    b.sort_order = tempOrder;
    cats[idx] = b;
    cats[swapIdx] = a;
    setMenu({ ...menu, menu_categories: cats });
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-white/5" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!menu) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/admin/menus"
        className="mb-6 inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70"
      >
        ← Back to Menus
      </Link>

      {/* Menu header card */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
          Menu Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-white/70">Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/70">Description</label>
            <input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
          </div>
        </div>

        {/* Service settings */}
        {serviceSettings.length > 0 && (
          <div className="mt-5">
            <label className="mb-2 block text-xs text-white/70">
              Available During
            </label>
            <div className="flex flex-wrap gap-3">
              {serviceSettings.map((ss) => (
                <label
                  key={ss.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition-all hover:border-white/20"
                >
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(ss.id)}
                    onChange={() => toggleServiceSetting(ss.id)}
                    className="accent-[#c4956a]"
                  />
                  <span>{ss.name}</span>
                  {ss.hours && (
                    <span className="text-[10px] text-white/30">{ss.hours}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={handleSaveMenu}
            disabled={saving}
            className="rounded-lg bg-[#c4956a] px-6 py-3 font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Menu"}
          </button>
          {message && (
            <span
              className={`text-sm ${
                message.type === "success" ? "text-green-400" : "text-red-300"
              }`}
            >
              {message.text}
            </span>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
            Categories ({menu.menu_categories.length})
          </h2>
          <button
            onClick={() => setShowAddCategory(true)}
            className="rounded-lg bg-[#c4956a] px-4 py-2 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a]"
          >
            Add Category
          </button>
        </div>

        {/* Add category form */}
        {showAddCategory && (
          <div className="mb-4 rounded-xl border border-[#c4956a]/30 bg-white/5 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Category name"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60"
              />
              <input
                placeholder="Notes (optional)"
                value={newCategory.category_notes}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, category_notes: e.target.value })
                }
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60"
              />
            </div>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleAddCategory}
                disabled={!newCategory.name}
                className="rounded-lg bg-[#c4956a] px-4 py-1.5 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory({ name: "", category_notes: "" });
                }}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:border-white/20 hover:text-white/70"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Category list */}
        {menu.menu_categories.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/40">
              No categories yet. Add your first category above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {menu.menu_categories.map((category, idx) => {
              const isExpanded = expandedCategories.has(category.id);
              const isEditing = editingCategoryId === category.id;

              return (
                <div
                  key={category.id}
                  className="rounded-xl border border-white/10 bg-white/5 transition-all"
                >
                  {isEditing ? (
                    <div className="p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={editCategoryForm.name ?? ""}
                          onChange={(e) =>
                            setEditCategoryForm({ ...editCategoryForm, name: e.target.value })
                          }
                          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#c4956a]/60"
                        />
                        <input
                          value={editCategoryForm.category_notes ?? ""}
                          onChange={(e) =>
                            setEditCategoryForm({
                              ...editCategoryForm,
                              category_notes: e.target.value || null,
                            })
                          }
                          placeholder="Notes (optional)"
                          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60"
                        />
                      </div>
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={() => handleUpdateCategory(category.id)}
                          className="rounded-lg bg-[#c4956a] px-4 py-1.5 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCategoryId(null);
                            setEditCategoryForm({});
                          }}
                          className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:border-white/20 hover:text-white/70"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-4">
                        {/* Reorder */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleReorderCategory(category.id, "up")}
                            disabled={idx === 0}
                            className="text-xs text-white/30 hover:text-white/70 disabled:opacity-20"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleReorderCategory(category.id, "down")}
                            disabled={idx === menu.menu_categories.length - 1}
                            className="text-xs text-white/30 hover:text-white/70 disabled:opacity-20"
                          >
                            ▼
                          </button>
                        </div>

                        {/* Category info */}
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="flex flex-1 items-center gap-3 text-left"
                        >
                          <span className="text-xs text-white/30">
                            {isExpanded ? "▾" : "▸"}
                          </span>
                          <div>
                            <span className="font-medium text-white">
                              {category.name}
                            </span>
                            <span className="ml-2 text-xs text-white/30">
                              {category.menu_items.length} items
                            </span>
                            {category.category_notes && (
                              <p className="mt-0.5 text-xs text-white/40">
                                {category.category_notes}
                              </p>
                            )}
                          </div>
                        </button>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategoryId(category.id);
                              setEditCategoryForm({
                                name: category.name,
                                category_notes: category.category_notes,
                              });
                            }}
                            className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/40 hover:border-white/20 hover:text-white/70"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="rounded-md border border-red-500/20 px-3 py-1 text-xs text-red-400/60 hover:border-red-500/40 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Expanded items list */}
                      {isExpanded && category.menu_items.length > 0 && (
                        <div className="border-t border-white/5 px-4 py-3">
                          <div className="space-y-1">
                            {category.menu_items.map((item) => (
                              <Link
                                key={item.id}
                                href={`/admin/items/${item.id}`}
                                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all hover:bg-white/5"
                              >
                                <span className="text-white/70 hover:text-[#c4956a]">
                                  {item.item_name}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-white/30">{item.price}</span>
                                  {!item.is_active && (
                                    <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-red-300">
                                      Inactive
                                    </span>
                                  )}
                                  {item.is_active && (
                                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-green-400">
                                      Active
                                    </span>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {isExpanded && category.menu_items.length === 0 && (
                        <div className="border-t border-white/5 px-4 py-3">
                          <p className="text-xs text-white/30">No items in this category.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
