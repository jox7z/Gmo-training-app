import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RankId } from '@/theme/tokens';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { weeklyTrainingProgress } from '@/lib/weeklyStreak';
import { useWorkoutsStore } from '@/store/workouts';

export type Unit = 'kg' | 'lb';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'strength' | 'hypertrophy' | 'fat_loss' | 'general';
export type Sex = 'male' | 'female';

export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  fullName?: string;
  bio?: string;
  location?: string;
  country?: string;
  avatarUrl?: string;
  instagramUsername?: string;
  instagramVerified?: boolean;
  followers: number;
  following: number;
  weightKg: number;
  heightCm: number;
  sex: Sex;
  unit: Unit;
  level: Level;
  goal: Goal;
  weeklyGoalDays: number;
  rankPoints: number;
  currentRank: RankId;
}

interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  profile: UserProfile | null;
  // Estado de sesión: si el perfil remoto está completo. null = aún no consultado.
  // NO se persiste en AsyncStorage; solo es estado de sesión (se recalcula en cada login).
  profileComplete: boolean | null;
  /** Snapshot derivado; nunca es fuente de verdad ni se persiste. */
  streakWeeks: number;
  /** Snapshot derivado; nunca es fuente de verdad ni se persiste. */
  daysThisWeek: number;
  hydrate: () => Promise<void>;
  setProfile: (p: UserProfile) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  markOnboarded: () => Promise<void>;
  setProfileComplete: (v: boolean | null) => void;
  addWorkoutDay: () => void;
  refreshWeeklyProgress: (now?: Date) => void;
  addPoints: (n: number) => void;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'gmo:app:v1';

function progressFromCurrentHistory(profile: UserProfile | null, now?: Date) {
  const { streakWeeks, daysThisWeek } = weeklyTrainingProgress(
    useWorkoutsStore.getState().history,
    profile?.weeklyGoalDays,
    now,
  );
  return { streakWeeks, daysThisWeek };
}

/**
 * Sentinel id used when the app runs without Supabase (dev / offline). Code
 * comparing a profile id against this knows the profile hasn't been bound to
 * a real auth user yet, so it can decide to skip writes to the backend.
 */
export const LOCAL_USER_ID = 'local-user';

const defaultProfile = (id = LOCAL_USER_ID): UserProfile => ({
  id,
  username: 'gmo_athlete',
  displayName: 'Atleta',
  fullName: '',
  bio: '',
  location: '',
  country: '',
  avatarUrl: undefined,
  followers: 0,
  following: 0,
  weightKg: 75,
  heightCm: 175,
  sex: 'male',
  unit: 'kg',
  level: 'intermediate',
  goal: 'hypertrophy',
  weeklyGoalDays: 4,
  rankPoints: 0,
  currentRank: 'rookie',
});

async function getAuthUserId(): Promise<string> {
  if (!isSupabaseConfigured) return LOCAL_USER_ID;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? LOCAL_USER_ID;
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  onboarded: false,
  profile: null,
  profileComplete: null,
  streakWeeks: 0,
  daysThisWeek: 0,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const profile = data.profile ? migrateProfile(data.profile) : null;
        set({
          onboarded: data.onboarded ?? false,
          profile,
          ...progressFromCurrentHistory(profile),
        });
      }
      console.log('[Store] hydrate: AsyncStorage read OK', {
        onboarded: get().onboarded,
        hasProfile: !!get().profile,
      });

      // Sync real auth user ID if Supabase is configured.
      // Wrapped in a 2s timeout: on Android the Supabase auth call can hang
      // when AsyncStorage is slow during cold start. We don't want to block
      // the splash screen on this — it's a background sync.
      if (isSupabaseConfigured) {
        const userPromise = supabase.auth.getUser().then((r) => r.data.user);
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 2000),
        );
        const user = await Promise.race([userPromise, timeoutPromise]).catch(() => null);
        if (user) {
          const profile = get().profile;
          if (profile && profile.id !== user.id) {
            const updated = { ...profile, id: user.id };
            set({ profile: updated });
            await persist({ ...get(), profile: updated });
          }
        }
      }
    } catch (e) {
      console.warn('[Store] hydrate failed', e);
    } finally {
      set({ hydrated: true });
      console.log('[Store] hydrate finished');
    }
  },

  setProfile: async (profile) => {
    set({ profile, ...progressFromCurrentHistory(profile) });
    await persist(get());
  },

  setProfileComplete: (v) => {
    set({ profileComplete: v });
  },

  completeOnboarding: async () => {
    const userId = await getAuthUserId();
    const existing = get().profile;

    if (!existing) {
      set({ profile: defaultProfile(userId) });
    } else if (existing.id === LOCAL_USER_ID && userId !== LOCAL_USER_ID) {
      set({ profile: { ...existing, id: userId } });
    }

    const profile = get().profile;
    set({ onboarded: true, ...progressFromCurrentHistory(profile) });
    await persist(get());
  },

  markOnboarded: async () => {
    if (get().onboarded) return;
    set({ onboarded: true });
    await persist(get());
  },

  addWorkoutDay: () => {
    // Compatibilidad con el flujo de finish actual. No incrementa: recalcula
    // desde el historial ya cerrado para evitar dobles conteos y rollover.
    get().refreshWeeklyProgress();
  },

  refreshWeeklyProgress: (now) => {
    const progress = progressFromCurrentHistory(get().profile, now);
    if (
      progress.streakWeeks === get().streakWeeks &&
      progress.daysThisWeek === get().daysThisWeek
    ) return;
    set(progress);
  },

  addPoints: (n) => {
    const profile = get().profile;
    if (!profile) return;
    set({ profile: { ...profile, rankPoints: profile.rankPoints + n } });
    persist(get());
  },

  signOut: async () => {
    // 1. Wipe local state FIRST so any subscriber that re-reads the store
    //    while we're awaiting supabase sees a coherent "logged out" state
    //    instead of a half-state (profile present but session gone).
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
    set({
      profile: null,
      onboarded: false,
      profileComplete: null,
      streakWeeks: 0,
      daysThisWeek: 0,
      // keep hydrated=true; we don't want the splash loader to reappear
    });
    // 2. Now sign out from Supabase. The onAuthStateChange listener in
    //    _layout will pick this up and trigger the redirect to /auth/login,
    //    by which time the store is already clean.
    if (isSupabaseConfigured) {
      try { await supabase.auth.signOut(); } catch (e) { console.warn('[Store] supabase signOut failed', e); }
    }
    console.log('[Store] signOut complete');
  },
}));

// El historial se hidrata/mezcla en otro store. Mantiene los snapshots de UI
// alineados sin convertirlos en contadores ni volver a persistirlos.
useWorkoutsStore.subscribe((state, previousState) => {
  if (state.history !== previousState.history) {
    useAppStore.getState().refreshWeeklyProgress();
  }
});

function migrateProfile(p: any): UserProfile {
  const def = defaultProfile(p?.id ?? LOCAL_USER_ID);
  const profile: UserProfile & Record<string, unknown> = {
    ...def,
    ...p,
  };
  delete profile.privacy;
  delete profile.notifications;
  if ((profile.currentRank as string) === 'legend') profile.currentRank = 'olympus';
  return profile;
}

async function persist(state: AppState) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      onboarded: state.onboarded,
      profile: state.profile,
    }),
  );
}
