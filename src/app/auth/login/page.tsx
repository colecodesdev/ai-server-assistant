"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useAuth } from "@/components/providers/auth-provider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const { signIn, role, user } = useAuth();
  const justSignedIn = useRef(false);

  // Check for session expiry redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "1") {
      setExpired(true);
      // Clean up URL
      window.history.replaceState({}, "", "/auth/login");
    }
  }, []);

  // After sign-in, the auth provider will update with the user's role.
  // Redirect based on role using a full navigation so middleware sets cookies.
  useEffect(() => {
    if (!justSignedIn.current || !user || !role) return;
    if (role === "admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/staff";
    }
  }, [user, role]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setIsSubmitting(false);
      return;
    }

    justSignedIn.current = true;
    // Auth provider's onAuthStateChange will fire and update user/role,
    // which triggers the useEffect redirect above.
  }

  return (
    <div className="flex min-h-screen min-h-dvh items-center justify-center bg-[#0a1628] px-4">
      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#1a3a5c]/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#0d4a3a]/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mb-2 font-heading text-sm font-medium uppercase tracking-[0.3em] text-[#c4956a]">
            Old Florida Fish House
          </div>
          <h1 className="font-heading text-2xl font-light text-white">Staff Portal</h1>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
                placeholder="you@oldfloridafishhouse.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30"
                placeholder="••••••••"
              />
            </div>

            {expired && !error && (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                Your session has expired. Please sign in again.
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#c4956a] px-4 py-3 font-medium text-[#0a1628] transition-all hover:bg-[#d4a57a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-white/30">
            Staff and admin access only.
            <br />
            Contact your manager for credentials.
          </div>
        </div>

        {/* Back to guest */}
        <div className="mt-6 text-center">
          <a
            href="/chat"
            className="text-sm text-white/40 transition-colors hover:text-white/70"
          >
            ← Browse as a guest
          </a>
        </div>
      </div>
    </div>
  );
}
