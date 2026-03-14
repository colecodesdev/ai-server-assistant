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
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Stable singleton — avoids re-creating the client on every render
const supabase = createClient();

async function fetchRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("fetchRole query error:", error);
      return null;
    }
    return data.role as UserRole;
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
    const role = await fetchRole(state.user.id);
    setState((prev) => ({ ...prev, role }));
  }, [state.user]);

  useEffect(() => {
    let initialDone = false;

    // Listen for auth changes (includes INITIAL_SESSION event)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, "user:", !!session?.user);

      const user = session?.user ?? null;
      let role: UserRole | null = null;

      if (user) {
        role = await fetchRole(user.id);
      }

      setState({ user, session, role, isLoading: false });
      initialDone = true;
    });

    // Safety net: if onAuthStateChange doesn't fire within 3s, unblock the UI
    const timeout = setTimeout(() => {
      if (!initialDone) {
        console.warn("Auth timeout — unblocking UI");
        setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
      }
    }, 3000);

    return () => {
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
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, session: null, role: null, isLoading: false });
    window.location.href = "/";
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
