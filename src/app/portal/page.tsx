"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";

const cyclingPhrases = [
  "Table 4 has a shellfish allergy",
  "What pairs with the grouper?",
  "How's the mahi prepped?",
  "Upsell for the sushi table?",
];

export default function PortalPage() {
  const { user, role, isLoading } = useAuth();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const cyclePhrase = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setPhraseIndex((prev) => (prev + 1) % cyclingPhrases.length);
      setIsVisible(true);
    }, 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(cyclePhrase, 3000);
    return () => clearInterval(interval);
  }, [cyclePhrase]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      window.location.replace("/auth/login");
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen min-h-dvh items-center justify-center bg-[#0a1628]">
        <div className="text-sm text-white/30">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen min-h-dvh items-center justify-center bg-[#0a1628]">
        <div className="text-sm text-white/30">Redirecting…</div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex min-h-screen min-h-dvh flex-col items-center justify-center bg-[#0a1628] px-4">
        <h1 className="mb-2 font-heading text-2xl font-medium text-white">
          No Access
        </h1>
        <p className="text-sm text-white/40">
          Your account does not have a role assigned. Contact your manager.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen min-h-dvh flex-col items-center justify-center bg-[#0a1628] px-4">
      <div className="flex flex-col items-center text-center">
        {/* Branding */}
        <h1 className="mb-4 font-heading text-4xl font-medium uppercase tracking-tight text-white sm:text-5xl">
          Old Florida Fish House
        </h1>
        <p
          className={`mb-6 font-accent text-3xl font-medium tracking-[0.2em] text-[#c4956a]/70 transition-opacity duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {cyclingPhrases[phraseIndex]}
        </p>

        {/* Action buttons */}
        <a
          href="/staff"
          className="mb-3 flex h-12 w-64 items-center justify-center rounded-xl bg-[#c4956a] text-sm font-bold text-[#0a1628] transition-all hover:bg-[#d4a57a] hover:shadow-lg hover:shadow-[#c4956a]/20"
        >
          Staff Assistant
        </a>
        {role === "admin" && (
          <a
            href="/admin"
            className="mb-6 flex h-12 w-64 items-center justify-center rounded-xl border border-white/10 text-sm font-bold text-white/50 transition-all hover:border-white/20 hover:text-white/70"
          >
            Admin Panel
          </a>
        )}

        {/* User info */}
        <div className="mt-4 text-center">
          <div className="text-xs text-white/30">{user.email}</div>
          <div className="font-heading text-[10px] font-medium uppercase tracking-wider text-[#c4956a]/50">
            {role}
          </div>
        </div>
      </div>
    </div>
  );
}
