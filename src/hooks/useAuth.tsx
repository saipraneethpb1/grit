import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    let authEventReceived = false;
    let previousUserId: string | undefined;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && !authEventReceived) {
        previousUserId = data.session?.user.id;
        setSession(data.session);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted && !authEventReceived) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // Drop the previous account's plans and stats, otherwise the next sign-in
      // paints cached data from the last user before its own fetch resolves.
      if (!mounted) return;
      authEventReceived = true;
      if (event === 'SIGNED_OUT' || previousUserId !== next?.user.id) queryClient.clear();
      previousUserId = next?.user.id;
      setSession(next);
      setLoading(false);
    });

    const refresh = (state: string) => {
      if (Platform.OS === 'web') return;
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const appState = AppState.addEventListener('change', refresh);

    return () => {
      appState.remove();
      if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured. Add keys to .env.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!isSupabaseConfigured) {
        return { error: 'Supabase is not configured. Add keys to .env.' };
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName ?? email.split('@')[0] },
        },
      });
      return { error: error?.message ?? null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured. Add keys to .env.' };
    }
    const { error } = await supabase.rpc('delete_account');
    if (!error) await supabase.auth.signOut({ scope: 'local' });
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      deleteAccount,
    }),
    [session, loading, signIn, signUp, signOut, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
