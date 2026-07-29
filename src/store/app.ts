import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RankId } from '@/theme/tokens';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { weeklyTrainingProgress } from '@/lib/weeklyStreak';
import { useWorkoutsStore } from '@/store/workouts';
import { useRoutinesStore } from '@/store/routines';
import { useAchievementsStore } from '@/store/achievements';
import {
  DEFAULT_WORKOUT_VISIBILITY,
  normalizeWorkoutVisibility,
  type WorkoutVisibility,
} from '@/lib/workoutVisibility';

export type Unit = 'kg' | 'lb';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'strength' | 'hypertrophy' | 'fat_loss' | 'general';
export type Sex = 'male' | 'female';

export const GOALS: readonly Goal[] = [
  'strength',
  'hypertrophy',
  'fat_loss',
  'general',
];

export function isGoal(value: unknown): value is Goal {
  return typeof value === 'string' && GOALS.includes(value as Goal);
}

export function normalizeSecondaryGoals(
  primaryGoal: Goal,
  values: unknown,
): Goal[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter(isGoal))].filter((goal) => goal !== primaryGoal);
}

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
  defaultWorkoutVisibility: WorkoutVisibility;
  level: Level;
  goal: Goal;
  secondaryGoals: Goal[];
  /** Retry local requerido mientras live aún no tenga `0053`. */
  secondaryGoalsSyncPending?: boolean;
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
  resetLocalData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'gmo:app:v1';
let persistQueue: Promise<void> = Promise.resolve();
let storageGeneration = 0;

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
  defaultWorkoutVisibility: DEFAULT_WORKOUT_VISIBILITY,
  level: 'intermediate',
  goal: 'hypertrophy',
  secondaryGoals: [],
  secondaryGoalsSyncPending: false,
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
    const generation = storageGeneration;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (generation !== storageGeneration) return;
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
        if (generation !== storageGeneration) return;
        if (user) {
          const profile = get().profile;
          if (profile?.id === LOCAL_USER_ID) {
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
    const generation = storageGeneration;
    const userId = await getAuthUserId();
    if (generation !== storageGeneration) return;
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

  resetLocalData: async () => {
    storageGeneration += 1;
    set({
      profile: null,
      onboarded: false,
      profileComplete: null,
      streakWeeks: 0,
      daysThisWeek: 0,
    });

    persistQueue = persistQueue
      .then(() => AsyncStorage.removeItem(STORAGE_KEY))
      .catch((error) => {
        console.warn('[Store] No se pudo limpiar el perfil local.', error);
      });

    await Promise.all([
      persistQueue,
      useWorkoutsStore.getState().reset(),
      useRoutinesStore.getState().reset(),
      useAchievementsStore.getState().reset(),
    ]);
  },

  signOut: async () => {
    // Limpiar todos los stores y sus colas de persistencia antes del signout
    // remoto. El evento SIGNED_OUT repetirá un reset idempotente sin recursión.
    await get().resetLocalData();
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
  profile.defaultWorkoutVisibility = normalizeWorkoutVisibility(
    profile.defaultWorkoutVisibility,
  );
  delete profile.defaultPostVisibility;
  profile.goal = isGoal(profile.goal) ? profile.goal : def.goal;
  profile.secondaryGoals = normalizeSecondaryGoals(
    profile.goal,
    profile.secondaryGoals,
  );
  profile.secondaryGoalsSyncPending =
    profile.secondaryGoals.length > 0 &&
    profile.secondaryGoalsSyncPending === true;
  if ((profile.currentRank as string) === 'legend') profile.currentRank = 'olympus';
  return profile;
}

async function persist(state: AppState) {
  const snapshot = JSON.stringify({
    onboarded: state.onboarded,
    profile: state.profile,
  });
  persistQueue = persistQueue
    .then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot))
    .catch((error) => {
      console.warn('[Store] No se pudo persistir el perfil local.', error);
    });
  await persistQueue;
}
