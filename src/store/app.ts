import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RankId } from '@/theme/tokens';

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

const defaultProfile = (): UserProfile => ({
  id: 'local-user',
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

export const useAppStore = create<AppState>((set, get) => ({
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
    } catch (e) {
      console.warn('hydrate failed', e);
    }
  },

  setProfile: async (profile) => {
    set({ profile });
    await persist(get());
  },

  completeOnboarding: async () => {
    if (!get().profile) set({ profile: defaultProfile() });
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
