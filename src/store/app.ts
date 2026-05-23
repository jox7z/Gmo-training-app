import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RankId } from '@/theme/tokens';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type Unit = 'kg' | 'lb';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'strength' | 'hypertrophy' | 'fat_loss' | 'general';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  weightKg: number;
  heightCm: number;
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
  streakWeeks: number;
  daysThisWeek: number;
  hydrate: () => Promise<void>;
  setProfile: (p: UserProfile) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  addWorkoutDay: () => void;
  addPoints: (n: number) => void;
}

const STORAGE_KEY = 'gmo:app:v1';

const defaultProfile = (id = 'local-user'): UserProfile => ({
  id,
  username: 'gmo_athlete',
  displayName: 'Atleta',
  weightKg: 75,
  heightCm: 175,
  unit: 'kg',
  level: 'intermediate',
  goal: 'hypertrophy',
  weeklyGoalDays: 4,
  rankPoints: 120,
  currentRank: 'silver',
});

async function getAuthUserId(): Promise<string> {
  if (!isSupabaseConfigured) return 'local-user';
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? 'local-user';
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  onboarded: false,
  profile: null,
  streakWeeks: 0,
  daysThisWeek: 0,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          onboarded: data.onboarded ?? false,
          profile: data.profile ?? null,
          streakWeeks: data.streakWeeks ?? 0,
          daysThisWeek: data.daysThisWeek ?? 0,
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
    set({ profile });
    await persist(get());
  },

  completeOnboarding: async () => {
    const userId = await getAuthUserId();
    const existing = get().profile;

    if (!existing) {
      set({ profile: defaultProfile(userId) });
    } else if (existing.id === 'local-user' && userId !== 'local-user') {
      set({ profile: { ...existing, id: userId } });
    }

    set({ onboarded: true, streakWeeks: 1, daysThisWeek: 0 });
    await persist(get());
  },

  addWorkoutDay: () => {
    const next = Math.min(7, get().daysThisWeek + 1);
    set({ daysThisWeek: next });
    persist(get());
  },

  addPoints: (n) => {
    const profile = get().profile;
    if (!profile) return;
    set({ profile: { ...profile, rankPoints: profile.rankPoints + n } });
    persist(get());
  },
}));

async function persist(state: AppState) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      onboarded: state.onboarded,
      profile: state.profile,
      streakWeeks: state.streakWeeks,
      daysThisWeek: state.daysThisWeek,
    }),
  );
}
