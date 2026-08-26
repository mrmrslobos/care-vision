"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getActiveCircleId,
  getMyCircles,
  setActiveCircleId,
} from "@/lib/visits-repository";
import type { CareCircle, CircleMember } from "@/types/care";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  circles: Array<CareCircle & { role: CircleMember["role"] }>;
  activeCircleId: string | null;
  setActiveCircle: (id: string) => void;
  refreshCircles: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  configured: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [circles, setCircles] = useState<
    Array<CareCircle & { role: CircleMember["role"] }>
  >([]);
  const [activeCircleId, setActiveCircleIdState] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  const refreshCircles = useCallback(async () => {
    const list = await getMyCircles();
    setCircles(list);
    const stored = getActiveCircleId();
    if (stored && list.some((c) => c.id === stored)) {
      setActiveCircleIdState(stored);
    } else if (list[0]) {
      setActiveCircleId(list[0].id);
      setActiveCircleIdState(list[0].id);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshCircles();
    } else {
      setCircles([]);
      setActiveCircleIdState(null);
    }
  }, [user, refreshCircles]);

  const signInWithEmail = async (email: string) => {
    const supabase = createClient();
    if (!supabase) return { error: "Cloud sync is not configured." };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message };
  };

  const signOut = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setCircles([]);
    setActiveCircleIdState(null);
  };

  const setActiveCircle = (id: string) => {
    setActiveCircleId(id);
    setActiveCircleIdState(id);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      circles,
      activeCircleId,
      setActiveCircle,
      refreshCircles,
      signInWithEmail,
      signOut,
      configured,
    }),
    [user, loading, circles, activeCircleId, refreshCircles, configured]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
