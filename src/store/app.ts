import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RankId } from '@/theme/tokens';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type Unit = 'kg' | 'lb';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'strength' | 'hypertrophy' | 'fat_loss' | 'general';

export interface PrivacySettings {
  profilePublic: boolean;
  showActivity: boolean;
  showStats: boolean;
}

export interface NotificationSettings {
  workoutReminders: boolean;
  socialUpdates: boolean;
  achievements: boolean;
  weeklyReport: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  fullName?: string;
  bio?: string;
  location?: string;
  country?: string;
  avatarUrl?: string;
  followers: number;
  following: number;
  weightKg: number;
  heightCm: number;
  unit: Unit;
  level: Level;
  goal: Goal;
  weeklyGoalDays: number;
  rankPoints: number;
  currentRank: RankId;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
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
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'gmo:app:v1';

const defaultProfile = (id = 'local-user'): UserProfile => ({
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
  unit: 'kg',
  level: 'intermediate',
  goal: 'hypertrophy',
  weeklyGoalDays: 4,
  rankPoints: 120,
  currentRank: 'silver',
  privacy: { profilePublic: true, showActivity: true, showStats: true },
  notifications: { workoutReminders: true, socialUpdates: true, achievements: true, weeklyReport: true },
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
        const profile = data.profile ? migrateProfile(data.profile) : null;
        set({
          onboarded: data.onboarded ?? false,
          profile,
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

  signOut: async () => {
    // 1. Sign out from Supabase (clears the JWT in AsyncStorage too)
    if (isSupabaseConfigured) {
      try { await supabase.auth.signOut(); } catch (e) { console.warn('[Store] supabase signOut failed', e); }
    }
    // 2. Wipe local app state from storage
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
    // 3. Reset in-memory state so guards re-evaluate immediately
    set({
      profile: null,
      onboarded: false,
      streakWeeks: 0,
      daysThisWeek: 0,
      // keep hydrated=true; we don't want the splash loader to reappear
    });
    console.log('[Store] signOut complete');
  },
}));

function migrateProfile(p: any): UserProfile {
  const def = defaultProfile(p?.id ?? 'local-user');
  return {
    ...def,
    ...p,
    privacy: { ...def.privacy, ...(p?.privacy ?? {}) },
    notifications: { ...def.notifications, ...(p?.notifications ?? {}) },
  };
}

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
