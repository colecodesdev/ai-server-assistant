"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  MenuItem,
  Allergen,
  DietaryTag,
  ItemAllergen,
  ItemDietaryTag,
  ItemPairing,
  ItemStaffNote,
  AllergenStatus,
  DietaryTagStatus,
  PairingType,
  StaffNoteType,
  Menu,
} from "@/types/database";

// ─── Types ──────────────────────────────────────────────
interface CategoryOption {
  id: string;
  name: string;
  menu_id: string;
  menus: { name: string } | null;
}

interface AllergenRow {
  allergen_id: string;
  status: AllergenStatus;
  notes: string;
}

interface DietaryTagRow {
  dietary_tag_id: string;
  status: DietaryTagStatus;
}

interface PairingRow {
  pairing_type: PairingType;
  recommendation: string;
  paired_item_id: string;
}

interface StaffNoteRow {
  note_type: StaffNoteType;
  content: string;
}

interface ItemSearchOption {
  id: string;
  item_name: string;
}

const PAIRING_TYPES: PairingType[] = ["wine", "cocktail", "sake", "beer", "non_alcoholic"];
const STAFF_NOTE_TYPES: StaffNoteType[] = ["prep", "upsell", "common_question", "general"];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30";
const selectClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30 [&>option]:bg-[#0d1f35] [&>option]:text-white";
const labelClass = "mb-1.5 block text-xs text-white/70";
const cardClass = "rounded-xl border border-white/10 bg-white/5 p-6";

// ─── Component ──────────────────────────────────────────
export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;
  const isNew = itemId === "new";

  const [loading, setLoading] = useState(!isNew);

  // Basic info
  const [form, setForm] = useState<Partial<MenuItem>>({
    item_name: "",
    price: "",
    category_id: "",
    available_during: "",
    is_active: true,
    sort_order: 0,
    menu_flags: [],
    description_short: "",
    description_long: "",
    modification_notes: "",
    seasonal_availability: "",
    ingredients_high_level: "",
    ingredients_detailed: "",
  });

  // Related data
  const [allergenRows, setAllergenRows] = useState<AllergenRow[]>([]);
  const [dietaryTagRows, setDietaryTagRows] = useState<DietaryTagRow[]>([]);
  const [pairingRows, setPairingRows] = useState<PairingRow[]>([]);
  const [staffNoteRows, setStaffNoteRows] = useState<StaffNoteRow[]>([]);

  // Reference data
  const [allAllergens, setAllAllergens] = useState<Allergen[]>([]);
  const [allDietaryTags, setAllDietaryTags] = useState<DietaryTag[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [allItems, setAllItems] = useState<ItemSearchOption[]>([]);

  // Save states
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingAllergens, setSavingAllergens] = useState(false);
  const [savingDietaryTags, setSavingDietaryTags] = useState(false);
  const [savingPairings, setSavingPairings] = useState(false);
  const [savingStaffNotes, setSavingStaffNotes] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [messages, setMessages] = useState<Record<string, { type: "success" | "error"; text: string }>>({});

  // Flags input
  const [flagInput, setFlagInput] = useState("");

  const showMsg = (key: string, type: "success" | "error", text: string) => {
    setMessages((prev) => ({ ...prev, [key]: { type, text } }));
    setTimeout(() => setMessages((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    }), 3000);
  };

  // Load reference data
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/allergens").then((r) => r.json()),
      fetch("/api/admin/dietary-tags").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/menus").then((r) => r.json()),
      fetch("/api/admin/items?search=").then((r) => r.json()),
    ]).then(([a, d, c, m, items]) => {
      setAllAllergens(a);
      setAllDietaryTags(d);
      setCategories(c);
      setMenus(m);
      setAllItems(
        (items ?? []).map((i: { id: string; item_name: string }) => ({
          id: i.id,
          item_name: i.item_name,
        }))
      );
    });
  }, []);

  // Load item data
  const fetchItem = useCallback(async () => {
    if (isNew) return;
    try {
      const res = await fetch(`/api/admin/items/${itemId}`);
      if (!res.ok) {
        router.push("/admin/items");
        return;
      }
      const data = await res.json();

      const {
        item_allergens,
        item_dietary_tags,
        item_pairings,
        item_staff_notes,
        ...itemData
      } = data;

      setForm(itemData);
      setFlagInput((itemData.menu_flags ?? []).join(", "));

      setAllergenRows(
        (item_allergens ?? []).map(
          (a: ItemAllergen & { allergens?: { name: string } }) => ({
            allergen_id: a.allergen_id,
            status: a.status,
            notes: a.notes ?? "",
          })
        )
      );

      setDietaryTagRows(
        (item_dietary_tags ?? []).map(
          (t: ItemDietaryTag & { dietary_tags?: { name: string } }) => ({
            dietary_tag_id: t.dietary_tag_id,
            status: t.status,
          })
        )
      );

      setPairingRows(
        (item_pairings ?? []).map((p: ItemPairing) => ({
          pairing_type: p.pairing_type,
          recommendation: p.recommendation ?? "",
          paired_item_id: p.paired_item_id ?? "",
        }))
      );

      setStaffNoteRows(
        (item_staff_notes ?? []).map((n: ItemStaffNote) => ({
          note_type: n.note_type,
          content: n.content,
        }))
      );
    } catch {
      showMsg("basic", "error", "Failed to load item");
    } finally {
      setLoading(false);
    }
  }, [itemId, isNew, router]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  // ─── Save handlers ────────────────────────────────────
  const saveBasicInfo = async (): Promise<boolean> => {
    setSavingBasic(true);
    try {
      const flags = flagInput
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const body = {
        item_name: form.item_name,
        price: form.price,
        category_id: form.category_id,
        available_during: form.available_during || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
        menu_flags: flags,
        description_short: form.description_short || null,
        description_long: form.description_long || null,
        modification_notes: form.modification_notes || null,
        seasonal_availability: form.seasonal_availability || null,
        ingredients_high_level: form.ingredients_high_level || null,
        ingredients_detailed: form.ingredients_detailed || null,
      };

      if (isNew) {
        const res = await fetch("/api/admin/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        showMsg("basic", "success", "Item created");
        router.replace(`/admin/items/${created.id}`);
        return true;
      }

      const res = await fetch(`/api/admin/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showMsg("basic", "success", "Basic info saved");
      return true;
    } catch {
      showMsg("basic", "error", "Failed to save basic info");
      return false;
    } finally {
      setSavingBasic(false);
    }
  };

  const saveAllergens = async (): Promise<boolean> => {
    if (isNew) return true;
    setSavingAllergens(true);
    try {
      const filtered = allergenRows.filter((a) => a.status);
      const res = await fetch(`/api/admin/items/${itemId}/allergens`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allergens: filtered }),
      });
      if (!res.ok) throw new Error();
      showMsg("allergens", "success", "Allergens saved");
      return true;
    } catch {
      showMsg("allergens", "error", "Failed to save allergens");
      return false;
    } finally {
      setSavingAllergens(false);
    }
  };

  const saveDietaryTags = async (): Promise<boolean> => {
    if (isNew) return true;
    setSavingDietaryTags(true);
    try {
      const filtered = dietaryTagRows.filter((t) => t.status);
      const res = await fetch(`/api/admin/items/${itemId}/dietary-tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dietary_tags: filtered }),
      });
      if (!res.ok) throw new Error();
      showMsg("dietary", "success", "Dietary tags saved");
      return true;
    } catch {
      showMsg("dietary", "error", "Failed to save dietary tags");
      return false;
    } finally {
      setSavingDietaryTags(false);
    }
  };

  const savePairings = async (): Promise<boolean> => {
    if (isNew) return true;
    setSavingPairings(true);
    try {
      const filtered = pairingRows.filter((p) => p.recommendation || p.paired_item_id);
      const res = await fetch(`/api/admin/items/${itemId}/pairings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairings: filtered.map((p) => ({
            ...p,
            paired_item_id: p.paired_item_id || null,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      showMsg("pairings", "success", "Pairings saved");
      return true;
    } catch {
      showMsg("pairings", "error", "Failed to save pairings");
      return false;
    } finally {
      setSavingPairings(false);
    }
  };

  const saveStaffNotes = async (): Promise<boolean> => {
    if (isNew) return true;
    setSavingStaffNotes(true);
    try {
      const filtered = staffNoteRows.filter((n) => n.content);
      const res = await fetch(`/api/admin/items/${itemId}/staff-notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_notes: filtered }),
      });
      if (!res.ok) throw new Error();
      showMsg("notes", "success", "Staff notes saved");
      return true;
    } catch {
      showMsg("notes", "error", "Failed to save staff notes");
      return false;
    } finally {
      setSavingStaffNotes(false);
    }
  };

  const saveAll = async () => {
    setSavingAll(true);
    const results = await Promise.all([
      saveBasicInfo(),
      saveAllergens(),
      saveDietaryTags(),
      savePairings(),
      saveStaffNotes(),
    ]);
    setSavingAll(false);
    if (results.every(Boolean)) {
      showMsg("all", "success", "All sections saved");
    }
  };

  // ─── Allergen helpers ─────────────────────────────────
  const getAllergenRow = (allergenId: string) =>
    allergenRows.find((a) => a.allergen_id === allergenId);

  const setAllergenStatus = (allergenId: string, status: AllergenStatus | "") => {
    setAllergenRows((prev) => {
      if (!status) return prev.filter((a) => a.allergen_id !== allergenId);
      const existing = prev.find((a) => a.allergen_id === allergenId);
      if (existing) {
        return prev.map((a) =>
          a.allergen_id === allergenId ? { ...a, status: status as AllergenStatus } : a
        );
      }
      return [...prev, { allergen_id: allergenId, status: status as AllergenStatus, notes: "" }];
    });
  };

  const setAllergenNotes = (allergenId: string, notes: string) => {
    setAllergenRows((prev) =>
      prev.map((a) => (a.allergen_id === allergenId ? { ...a, notes } : a))
    );
  };

  // ─── Dietary tag helpers ──────────────────────────────
  const getDietaryTagRow = (tagId: string) =>
    dietaryTagRows.find((t) => t.dietary_tag_id === tagId);

  const setDietaryTagStatus = (tagId: string, status: DietaryTagStatus | "") => {
    setDietaryTagRows((prev) => {
      if (!status) return prev.filter((t) => t.dietary_tag_id !== tagId);
      const existing = prev.find((t) => t.dietary_tag_id === tagId);
      if (existing) {
        return prev.map((t) =>
          t.dietary_tag_id === tagId ? { ...t, status: status as DietaryTagStatus } : t
        );
      }
      return [...prev, { dietary_tag_id: tagId, status: status as DietaryTagStatus }];
    });
  };

  // ─── Group categories by menu ─────────────────────────
  const groupedCategories = menus.map((menu) => ({
    menu,
    categories: categories.filter((c) => c.menu_id === menu.id),
  }));

  // ─── Message component ────────────────────────────────
  const Msg = ({ k }: { k: string }) => {
    const msg = messages[k];
    if (!msg) return null;
    return (
      <span className={`text-sm ${msg.type === "success" ? "text-green-400" : "text-red-300"}`}>
        {msg.text}
      </span>
    );
  };

  // ─── Loading state ────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="h-8 w-48 animate-pulse rounded bg-white/5" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/admin/items"
        className="mb-6 inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70"
      >
        ← Back to Items
      </Link>

      {/* Page heading */}
      <h1 className="mb-8 font-heading text-2xl font-light text-white">
        {isNew ? "Create New Item" : form.item_name || "Edit Item"}
      </h1>

      {/* ─── Section 1: Basic Info ──────────────────────── */}
      <div className={`${cardClass} mb-6`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
            Basic Info
          </h2>
          <div className="flex items-center gap-3">
            <Msg k="basic" />
            <button
              onClick={saveBasicInfo}
              disabled={savingBasic}
              className="rounded-lg bg-[#c4956a] px-4 py-2 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
            >
              {savingBasic ? "Saving…" : "Save Section"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Item Name *</label>
            <input
              value={form.item_name ?? ""}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Price *</label>
            <input
              value={form.price ?? ""}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="e.g. $14.99 or Market Price"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={form.category_id ?? ""}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className={selectClass}
            >
              <option value="">Select category…</option>
              {groupedCategories.map((group) => (
                <optgroup key={group.menu.id} label={group.menu.name}>
                  {group.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Available During</label>
            <input
              value={form.available_during ?? ""}
              onChange={(e) => setForm({ ...form, available_during: e.target.value })}
              placeholder="e.g. Dinner Only"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Sort Order</label>
            <input
              type="number"
              value={form.sort_order ?? 0}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Menu Flags</label>
            <input
              value={flagInput}
              onChange={(e) => setFlagInput(e.target.value)}
              placeholder="GF, HS, NF (comma-separated)"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="accent-[#c4956a]"
            />
            Active
          </label>
        </div>
      </div>

      {/* ─── Section 2: Descriptions ───────────────────── */}
      <div className={`${cardClass} mb-6`}>
        <h2 className="mb-5 font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
          Descriptions
        </h2>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Short Description</label>
            <textarea
              rows={2}
              value={form.description_short ?? ""}
              onChange={(e) => setForm({ ...form, description_short: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Long Description</label>
            <textarea
              rows={4}
              value={form.description_long ?? ""}
              onChange={(e) => setForm({ ...form, description_long: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Modification Notes</label>
            <textarea
              rows={2}
              value={form.modification_notes ?? ""}
              onChange={(e) => setForm({ ...form, modification_notes: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Seasonal Availability</label>
            <input
              value={form.seasonal_availability ?? ""}
              onChange={(e) => setForm({ ...form, seasonal_availability: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ─── Section 3: Ingredients ────────────────────── */}
      <div className={`${cardClass} mb-6`}>
        <h2 className="mb-5 font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
          Ingredients
        </h2>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>High-Level Ingredients</label>
            <textarea
              rows={2}
              value={form.ingredients_high_level ?? ""}
              onChange={(e) => setForm({ ...form, ingredients_high_level: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Detailed Ingredients</label>
            <textarea
              rows={3}
              value={form.ingredients_detailed ?? ""}
              onChange={(e) => setForm({ ...form, ingredients_detailed: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ─── Section 4: Allergens ──────────────────────── */}
      {!isNew && (
        <div className={`${cardClass} mb-6`}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
              Allergens
            </h2>
            <div className="flex items-center gap-3">
              <Msg k="allergens" />
              <button
                onClick={saveAllergens}
                disabled={savingAllergens}
                className="rounded-lg bg-[#c4956a] px-4 py-2 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
              >
                {savingAllergens ? "Saving…" : "Save Section"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {allAllergens.map((allergen) => {
              const row = getAllergenRow(allergen.id);
              return (
                <div
                  key={allergen.id}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="w-32 text-sm font-medium text-white">
                      {allergen.name}
                    </span>
                    <div className="flex gap-3">
                      {(["contains", "free_of", "verify"] as AllergenStatus[]).map(
                        (status) => (
                          <label
                            key={status}
                            className="flex cursor-pointer items-center gap-1.5 text-xs text-white/60"
                          >
                            <input
                              type="radio"
                              name={`allergen-${allergen.id}`}
                              checked={row?.status === status}
                              onChange={() => setAllergenStatus(allergen.id, status)}
                              className="accent-[#c4956a]"
                            />
                            {status === "free_of" ? "Free Of" : status.charAt(0).toUpperCase() + status.slice(1)}
                          </label>
                        )
                      )}
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/30">
                        <input
                          type="radio"
                          name={`allergen-${allergen.id}`}
                          checked={!row}
                          onChange={() => setAllergenStatus(allergen.id, "")}
                          className="accent-[#c4956a]"
                        />
                        None
                      </label>
                    </div>
                    {row && (
                      <input
                        placeholder="Notes…"
                        value={row.notes}
                        onChange={(e) => setAllergenNotes(allergen.id, e.target.value)}
                        className="ml-auto w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-[#c4956a]/60"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Section 5: Dietary Tags ───────────────────── */}
      {!isNew && (
        <div className={`${cardClass} mb-6`}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
              Dietary Tags
            </h2>
            <div className="flex items-center gap-3">
              <Msg k="dietary" />
              <button
                onClick={saveDietaryTags}
                disabled={savingDietaryTags}
                className="rounded-lg bg-[#c4956a] px-4 py-2 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
              >
                {savingDietaryTags ? "Saving…" : "Save Section"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {allDietaryTags.map((tag) => {
              const row = getDietaryTagRow(tag.id);
              return (
                <div
                  key={tag.id}
                  className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  <span className="w-32 text-sm font-medium text-white">
                    {tag.name}
                  </span>
                  <div className="flex gap-3">
                    {(["confirmed", "verify"] as DietaryTagStatus[]).map(
                      (status) => (
                        <label
                          key={status}
                          className="flex cursor-pointer items-center gap-1.5 text-xs text-white/60"
                        >
                          <input
                            type="radio"
                            name={`dietary-${tag.id}`}
                            checked={row?.status === status}
                            onChange={() => setDietaryTagStatus(tag.id, status)}
                            className="accent-[#c4956a]"
                          />
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </label>
                      )
                    )}
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/30">
                      <input
                        type="radio"
                        name={`dietary-${tag.id}`}
                        checked={!row}
                        onChange={() => setDietaryTagStatus(tag.id, "")}
                        className="accent-[#c4956a]"
                      />
                      None
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Section 6: Pairings ───────────────────────── */}
      {!isNew && (
        <div className={`${cardClass} mb-6`}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
              Pairings
            </h2>
            <div className="flex items-center gap-3">
              <Msg k="pairings" />
              <button
                onClick={savePairings}
                disabled={savingPairings}
                className="rounded-lg bg-[#c4956a] px-4 py-2 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
              >
                {savingPairings ? "Saving…" : "Save Section"}
              </button>
            </div>
          </div>

          {pairingRows.length === 0 ? (
            <p className="mb-4 text-sm text-white/30">No pairings added.</p>
          ) : (
            <div className="mb-4 space-y-3">
              {pairingRows.map((pairing, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-white/40">Pairing {idx + 1}</span>
                    <button
                      onClick={() =>
                        setPairingRows((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="rounded-md border border-red-500/20 px-2 py-1 text-xs text-red-400/60 hover:border-red-500/40 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>Type</label>
                      <select
                        value={pairing.pairing_type}
                        onChange={(e) =>
                          setPairingRows((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? { ...p, pairing_type: e.target.value as PairingType }
                                : p
                            )
                          )
                        }
                        className={selectClass}
                      >
                        {PAIRING_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t === "non_alcoholic"
                              ? "Non-Alcoholic"
                              : t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Paired With (optional)</label>
                      <select
                        value={pairing.paired_item_id}
                        onChange={(e) =>
                          setPairingRows((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, paired_item_id: e.target.value } : p
                            )
                          )
                        }
                        className={selectClass}
                      >
                        <option value="">None</option>
                        {allItems
                          .filter((item) => item.id !== itemId)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.item_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className={labelClass}>Recommendation</label>
                    <textarea
                      rows={2}
                      value={pairing.recommendation}
                      onChange={(e) =>
                        setPairingRows((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, recommendation: e.target.value } : p
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() =>
              setPairingRows((prev) => [
                ...prev,
                { pairing_type: "wine", recommendation: "", paired_item_id: "" },
              ])
            }
            className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:border-white/20 hover:text-white/70"
          >
            + Add Pairing
          </button>
        </div>
      )}

      {/* ─── Section 7: Staff Notes ────────────────────── */}
      {!isNew && (
        <div className={`${cardClass} mb-6`}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
              Staff Notes
            </h2>
            <div className="flex items-center gap-3">
              <Msg k="notes" />
              <button
                onClick={saveStaffNotes}
                disabled={savingStaffNotes}
                className="rounded-lg bg-[#c4956a] px-4 py-2 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
              >
                {savingStaffNotes ? "Saving…" : "Save Section"}
              </button>
            </div>
          </div>

          {staffNoteRows.length === 0 ? (
            <p className="mb-4 text-sm text-white/30">No staff notes added.</p>
          ) : (
            <div className="mb-4 space-y-3">
              {staffNoteRows.map((note, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <label className={labelClass}>Type</label>
                      <select
                        value={note.note_type}
                        onChange={(e) =>
                          setStaffNoteRows((prev) =>
                            prev.map((n, i) =>
                              i === idx
                                ? { ...n, note_type: e.target.value as StaffNoteType }
                                : n
                            )
                          )
                        }
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#c4956a]/60 [&>option]:bg-[#0d1f35] [&>option]:text-white"
                      >
                        {STAFF_NOTE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t === "common_question"
                              ? "Common Question"
                              : t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() =>
                        setStaffNoteRows((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="rounded-md border border-red-500/20 px-2 py-1 text-xs text-red-400/60 hover:border-red-500/40 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                  <div>
                    <label className={labelClass}>Content</label>
                    <textarea
                      rows={2}
                      value={note.content}
                      onChange={(e) =>
                        setStaffNoteRows((prev) =>
                          prev.map((n, i) =>
                            i === idx ? { ...n, content: e.target.value } : n
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() =>
              setStaffNoteRows((prev) => [
                ...prev,
                { note_type: "general", content: "" },
              ])
            }
            className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:border-white/20 hover:text-white/70"
          >
            + Add Note
          </button>
        </div>
      )}

      {/* ─── Save All ──────────────────────────────────── */}
      <div className="flex items-center gap-4 border-t border-white/10 pt-6">
        <button
          onClick={isNew ? saveBasicInfo : saveAll}
          disabled={savingAll || savingBasic}
          className="rounded-lg bg-[#c4956a] px-8 py-3 font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
        >
          {savingAll ? "Saving All…" : isNew ? "Create Item" : "Save All Sections"}
        </button>
        <Msg k="all" />
      </div>
    </div>
  );
}
