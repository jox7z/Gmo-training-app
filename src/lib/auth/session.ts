import { useEffect } from 'react';
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AuthError } from '@/lib/auth/index';
import { humanizeAuthError } from '@/lib/authErrors';

interface SessionState {
  user: Session['user'] | null;
  loading: boolean;
  error: AuthError | null;
  setUser: (user: Session['user'] | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AuthError | null) => void;
  initialize: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ user: null, loading: false });
      return;
    }

    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({
        user: null,
        loading: false,
        error: new AuthError('UNKNOWN', humanizeAuthError(error), error),
      });
      return;
    }
    set({ user: data.session?.user ?? null, loading: false });
  },
}));

export function useSession() {
  const user = useSessionStore((s) => s.user);
  const loading = useSessionStore((s) => s.loading);
  const error = useSessionStore((s) => s.error);
  const setUser = useSessionStore((s) => s.setUser);
  const setError = useSessionStore((s) => s.setError);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setError(null);
    });

    return () => subscription?.unsubscribe();
  }, [setUser, setError]);

  return { user, loading, error };
}
