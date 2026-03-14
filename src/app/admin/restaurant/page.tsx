"use client";

import { useEffect, useState, useCallback } from "react";
import type { Restaurant, KeyPerson } from "@/types/database";

interface RestaurantWithPeople extends Restaurant {
  key_people: KeyPerson[];
}

const emptyPerson: Omit<KeyPerson, "id" | "restaurant_id"> = {
  name: "",
  role: "",
  bio: "",
  is_public: true,
  sort_order: 0,
};

export default function RestaurantPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [people, setPeople] = useState<KeyPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [peopleMessage, setPeopleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPerson, setNewPerson] = useState(emptyPerson);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<KeyPerson>>({});

  const showMessage = (
    setter: typeof setMessage,
    type: "success" | "error",
    text: string
  ) => {
    setter({ type, text });
    setTimeout(() => setter(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/restaurant");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: RestaurantWithPeople = await res.json();
      const { key_people, ...rest } = data;
      setRestaurant(rest);
      setPeople(key_people ?? []);
    } catch {
      showMessage(setMessage, "error", "Failed to load restaurant data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveRestaurant = async () => {
    if (!restaurant) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/restaurant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: restaurant.name,
          tagline: restaurant.tagline,
          website: restaurant.website,
          address: restaurant.address,
          phone: restaurant.phone,
          email: restaurant.email,
          story: restaurant.story,
          cross_contamination_disclaimer: restaurant.cross_contamination_disclaimer,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setRestaurant(updated);
      showMessage(setMessage, "success", "Restaurant profile saved");
    } catch {
      showMessage(setMessage, "error", "Failed to save restaurant profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPerson = async () => {
    if (!newPerson.name || !newPerson.role) return;
    try {
      const res = await fetch("/api/admin/key-people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPerson,
          sort_order: people.length,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      const person = await res.json();
      setPeople((prev) => [...prev, person]);
      setNewPerson(emptyPerson);
      setAddingPerson(false);
      showMessage(setPeopleMessage, "success", "Person added");
    } catch {
      showMessage(setPeopleMessage, "error", "Failed to add person");
    }
  };

  const handleUpdatePerson = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/key-people/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setPeople((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
      setEditForm({});
      showMessage(setPeopleMessage, "success", "Person updated");
    } catch {
      showMessage(setPeopleMessage, "error", "Failed to update person");
    }
  };

  const handleDeletePerson = async (id: string) => {
    if (!confirm("Delete this person?")) return;
    try {
      const res = await fetch(`/api/admin/key-people/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setPeople((prev) => prev.filter((p) => p.id !== id));
      showMessage(setPeopleMessage, "success", "Person deleted");
    } catch {
      showMessage(setPeopleMessage, "error", "Failed to delete person");
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const idx = people.findIndex((p) => p.id === id);
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === people.length - 1)
    )
      return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...people];
    const [a, b] = [updated[idx], updated[swapIdx]];

    // Swap sort_order values
    await Promise.all([
      fetch(`/api/admin/key-people/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/key-people/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ]);

    const tempOrder = a.sort_order;
    a.sort_order = b.sort_order;
    b.sort_order = tempOrder;
    updated[idx] = b;
    updated[swapIdx] = a;
    setPeople(updated);
  };

  const updateField = (field: keyof Restaurant, value: string | null) => {
    if (!restaurant) return;
    setRestaurant({ ...restaurant, [field]: value });
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded bg-white/5" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-white/5" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-4 h-16 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <p className="text-white/40">No restaurant record found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-light text-white">
          Restaurant Profile
        </h1>
        <p className="mt-1 text-sm text-white/40">
          Manage your restaurant&apos;s public information and key people.
        </p>
      </div>

      {/* Restaurant Form */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-6 font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
          Restaurant Details
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-white/70">Name</label>
            <input
              type="text"
              value={restaurant.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/70">Tagline</label>
            <input
              type="text"
              value={restaurant.tagline ?? ""}
              onChange={(e) => updateField("tagline", e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/70">Website</label>
            <input
              type="url"
              value={restaurant.website ?? ""}
              onChange={(e) => updateField("website", e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/70">Phone</label>
            <input
              type="tel"
              value={restaurant.phone ?? ""}
              onChange={(e) => updateField("phone", e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/70">Email</label>
            <input
              type="email"
              value={restaurant.email ?? ""}
              onChange={(e) => updateField("email", e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/70">Address</label>
            <input
              type="text"
              value={restaurant.address ?? ""}
              onChange={(e) => updateField("address", e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs text-white/70">Story</label>
          <textarea
            rows={6}
            value={restaurant.story ?? ""}
            onChange={(e) => updateField("story", e.target.value || null)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
          />
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs text-white/70">
            Cross-Contamination Disclaimer
          </label>
          <textarea
            rows={3}
            value={restaurant.cross_contamination_disclaimer ?? ""}
            onChange={(e) =>
              updateField("cross_contamination_disclaimer", e.target.value || null)
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
          />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSaveRestaurant}
            disabled={saving}
            className="rounded-lg bg-[#c4956a] px-6 py-3 font-medium text-[#0a1628] hover:bg-[#d4a57a] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Profile"}
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

      {/* Key People */}
      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]">
            Key People
          </h2>
          <button
            onClick={() => setAddingPerson(true)}
            className="rounded-lg bg-[#c4956a] px-4 py-2 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a]"
          >
            Add Person
          </button>
        </div>

        {peopleMessage && (
          <div
            className={`mb-4 rounded-lg px-4 py-2 text-sm ${
              peopleMessage.type === "success"
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-300"
            }`}
          >
            {peopleMessage.text}
          </div>
        )}

        {/* Add person form */}
        {addingPerson && (
          <div className="mb-4 rounded-lg border border-[#c4956a]/30 bg-white/[0.03] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Name"
                value={newPerson.name}
                onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60"
              />
              <input
                placeholder="Role"
                value={newPerson.role}
                onChange={(e) => setNewPerson({ ...newPerson, role: e.target.value })}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60"
              />
            </div>
            <textarea
              placeholder="Bio"
              rows={2}
              value={newPerson.bio ?? ""}
              onChange={(e) => setNewPerson({ ...newPerson, bio: e.target.value || null })}
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60"
            />
            <div className="mt-3 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={newPerson.is_public}
                  onChange={(e) => setNewPerson({ ...newPerson, is_public: e.target.checked })}
                  className="accent-[#c4956a]"
                />
                Public
              </label>
              <div className="flex-1" />
              <button
                onClick={() => {
                  setAddingPerson(false);
                  setNewPerson(emptyPerson);
                }}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:border-white/20 hover:text-white/70"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPerson}
                className="rounded-lg bg-[#c4956a] px-4 py-1.5 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a]"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* People list */}
        {people.length === 0 ? (
          <p className="text-sm text-white/30">No key people added yet.</p>
        ) : (
          <div className="space-y-3">
            {people.map((person, idx) => (
              <div
                key={person.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
              >
                {editingId === person.id ? (
                  // Edit mode
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={editForm.name ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#c4956a]/60"
                      />
                      <input
                        value={editForm.role ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#c4956a]/60"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={editForm.bio ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value || null })}
                      className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#c4956a]/60"
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-white/70">
                        <input
                          type="checkbox"
                          checked={editForm.is_public ?? true}
                          onChange={(e) => setEditForm({ ...editForm, is_public: e.target.checked })}
                          className="accent-[#c4956a]"
                        />
                        Public
                      </label>
                      <div className="flex-1" />
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditForm({});
                        }}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:border-white/20 hover:text-white/70"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdatePerson(person.id)}
                        className="rounded-lg bg-[#c4956a] px-4 py-1.5 text-sm font-medium text-[#0a1628] hover:bg-[#d4a57a]"
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  // View mode
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleReorder(person.id, "up")}
                        disabled={idx === 0}
                        className="text-white/30 hover:text-white/70 disabled:opacity-20"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleReorder(person.id, "down")}
                        disabled={idx === people.length - 1}
                        className="text-white/30 hover:text-white/70 disabled:opacity-20"
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{person.name}</span>
                        <span className="text-sm text-white/40">{person.role}</span>
                        {!person.is_public && (
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                            Hidden
                          </span>
                        )}
                      </div>
                      {person.bio && (
                        <p className="mt-1 text-sm text-white/50">{person.bio}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(person.id);
                          setEditForm({
                            name: person.name,
                            role: person.role,
                            bio: person.bio,
                            is_public: person.is_public,
                          });
                        }}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/40 hover:border-white/20 hover:text-white/70"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePerson(person.id)}
                        className="rounded-md border border-red-500/20 px-3 py-1.5 text-sm text-red-400/60 hover:border-red-500/40 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
