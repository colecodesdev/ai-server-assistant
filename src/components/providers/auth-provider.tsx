"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase-client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

interface AuthState {
  user: SupabaseUser | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Stable singleton — avoids re-creating the client on every render
const supabase = createClient();

async function fetchRole(): Promise<UserRole | null> {
  try {
    const res = await fetch("/api/me");
    if (!res.ok) return null;
    const { role } = await res.json();
    return role ?? null;
  } catch (err) {
    console.error("fetchRole error:", err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
  });

  const refreshRole = useCallback(async () => {
    if (!state.user) return;
    const role = await fetchRole();
    setState((prev) => ({ ...prev, role }));
  }, [state.user]);

  useEffect(() => {
    let mounted = true;

    // Use onAuthStateChange as the single source of truth.
    // INITIAL_SESSION fires synchronously after subscribe with the
    // session from storage (and triggers a background token refresh
    // if needed).  Subsequent events handle sign-in / sign-out / refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      const user = session?.user ?? null;

      if (user) {
        // Set user/session immediately but keep loading until role is fetched
        setState((prev) => ({ ...prev, user, session }));
        const role = await fetchRole();
        if (mounted) {
          setState((prev) => ({ ...prev, role, isLoading: false }));
        }
      } else {
        setState({ user: null, session: null, role: null, isLoading: false });
      }
    });

    // Safety net: if onAuthStateChange never fires (rare edge case),
    // unblock after 5 seconds so the UI isn't stuck forever.
    const timeout = setTimeout(() => {
      if (mounted) {
        setState((prev) =>
          prev.isLoading ? { ...prev, isLoading: false } : prev
        );
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };

    // Set session start timestamp for timeout enforcement
    document.cookie = `session_start=${Date.now()}; path=/; max-age=${8 * 60 * 60}; SameSite=Lax`;

    return { error: null };
  };

  const signOut = () => {
    // Fire-and-forget client-side cleanup — don't await, it can hang
    // if the session hasn't hydrated yet.
    supabase.auth.signOut().catch(() => {});
    setState({ user: null, session: null, role: null, isLoading: false });

    // Hit the server route to clear httpOnly session cookies,
    // then redirect to login. This is what actually matters.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/signout";
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, refreshRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
