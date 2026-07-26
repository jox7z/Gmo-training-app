import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type AchievementContext,
  type AchievementDef,
  type AchievementTier,
  lookupTier,
  unlockedTierIds,
} from '@/lib/achievements';
import {
  ACHIEVEMENTS_STORAGE_VERSION,
  migrateAchievementSnapshot,
} from '@/lib/achievementPersistence';

export interface UnlockedAchievement {
  def: AchievementDef;
  tier: AchievementTier;
  /** Fecha ISO en la que se desbloqueó. */
  unlockedAt: string;
}

interface AchievementsState {
  hydrated: boolean;
  /** tierId → fecha ISO de desbloqueo. */
  unlocked: Record<string, string>;
  /** Marca que ya se hizo el backfill inicial (para no celebrar el historial). */
  seeded: boolean;
  hydrate: () => Promise<void>;
  /**
   * Recalcula los niveles desbloqueados a partir del contexto y persiste los
   * nuevos. Devuelve SOLO los recién desbloqueados (vacío en el backfill inicial)
   * para que la pantalla los celebre.
   */
  sync: (ctx: AchievementContext) => UnlockedAchievement[];
  /** Fecha de desbloqueo de un nivel concreto, si existe. */
  unlockedAt: (tierId: string) => string | undefined;
  reset: () => Promise<void>;
}

const KEY = 'gmo:achievements:v1';

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  hydrated: false,
  unlocked: {},
  seeded: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        set(migrateAchievementSnapshot(JSON.parse(raw)));
      }
    } catch (e) {
      console.warn('[Achievements] hydrate failed', e);
    } finally {
      set({ hydrated: true });
    }
  },

  sync: (ctx) => {
    const currentlyUnlocked = unlockedTierIds(ctx);
    const now = new Date().toISOString();
    const newlyUnlocked: UnlockedAchievement[] = [];

    // Merge atómico vía updater: lee y escribe `unlocked` en una sola transición
    // de estado, evitando que dos `sync()` concurrentes pisen los desbloqueos
    // del otro al partir ambos del mismo snapshot.
    set((state) => {
      const next: Record<string, string> = { ...state.unlocked };
      for (const tierId of currentlyUnlocked) {
        if (next[tierId]) continue; // ya registrado
        next[tierId] = now;
        // En el primer backfill no celebramos los niveles que ya correspondían
        // al historial previo; solo a partir de entonces se notifican.
        if (state.seeded) {
          const resolved = lookupTier(tierId);
          if (resolved) newlyUnlocked.push({ ...resolved, unlockedAt: now });
        }
      }
      return { unlocked: next, seeded: true };
    });
    persist(get());

    // Ordena los nuevos por nivel ascendente para una celebración coherente.
    newlyUnlocked.sort((a, b) => a.tier.threshold - b.tier.threshold);
    return newlyUnlocked;
  },

  unlockedAt: (tierId) => get().unlocked[tierId],

  reset: async () => {
    set({ unlocked: {}, seeded: false });
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {}
  },
}));

function persist(state: AchievementsState) {
  AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      version: ACHIEVEMENTS_STORAGE_VERSION,
      unlocked: state.unlocked,
      seeded: state.seeded,
    }),
  ).catch(() => {});
}
