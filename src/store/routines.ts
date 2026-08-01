import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidv4 } from '@/lib/ids';

export interface RoutineDayExercise {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRir?: number;
  restSeconds: number;
}

export interface RoutineDay {
  id: string;
  name: string;
  notes?: string;
  exercises: RoutineDayExercise[];
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  splitType: string;
  days: RoutineDay[];
  isAiGenerated?: boolean;
  createdAt: string;
}

interface State {
  routines: Routine[];
  activeRoutineId: string | null;
  hydrate: () => Promise<void>;
  reset: () => Promise<void>;
  upsertRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => Routine | undefined;
  setActiveRoutine: (id: string) => void;
}

const KEY = 'gmo:routines:v1';
let persistQueue: Promise<void> = Promise.resolve();
let storageGeneration = 0;

function persistSnapshot(routines: Routine[], activeRoutineId: string | null) {
  const snapshot = JSON.stringify({ routines, activeRoutineId });
  persistQueue = persistQueue
    .then(() => AsyncStorage.setItem(KEY, snapshot))
    .catch((error) => {
      console.warn('[Routines] No se pudo persistir la rutina.', error);
    });
}

export function nid() {
  return uuidv4();
}

function withoutLegacyReasoning(
  routine: Routine & { aiReasoning?: unknown },
): Routine {
  const migrated = { ...routine };
  delete migrated.aiReasoning;
  return migrated;
}

export const useRoutinesStore = create<State>((set, get) => ({
  routines: [],
  activeRoutineId: null,

  hydrate: async () => {
    const generation = storageGeneration;
    const raw = await AsyncStorage.getItem(KEY);
    if (generation !== storageGeneration) return;
    let routines: Routine[] = [];
    let activeRoutineId: string | null = null;

    if (raw) {
      const data = JSON.parse(raw);
      routines = (data.routines ?? [])
        .filter((r: Routine) => r.id !== 'seed-ppl')
        .map(withoutLegacyReasoning);
      activeRoutineId = data.activeRoutineId ?? null;
    }

    // Migration: if activeRoutineId was seed-ppl or no longer exists, pick first or null
    if (activeRoutineId === 'seed-ppl' || !routines.find((r) => r.id === activeRoutineId)) {
      activeRoutineId = routines.length > 0 ? routines[0].id : null;
    }

    set({ routines, activeRoutineId });
    // Re-persist migrated result so seed never reappears
    persistSnapshot(routines, activeRoutineId);
  },

  reset: async () => {
    storageGeneration += 1;
    set({ routines: [], activeRoutineId: null });
    persistQueue = persistQueue
      .then(() => AsyncStorage.removeItem(KEY))
      .catch((error) => {
        console.warn('[Routines] No se pudo limpiar la rutina local.', error);
      });
    await persistQueue;
  },

  upsertRoutine: (r) => {
    const existing = get().routines.some((x) => x.id === r.id);
    // Una sola rutina por usuario: una rutina nueva reemplaza a la anterior;
    // editar la existente (mismo id) la actualiza en sitio.
    const routines = existing
      ? get().routines.map((x) => (x.id === r.id ? r : x))
      : [r];
    set({ routines, activeRoutineId: r.id });
    persistSnapshot(routines, r.id);
  },

  deleteRoutine: (id) => {
    const routines = get().routines.filter((r) => r.id !== id);
    set({ routines });
    persistSnapshot(routines, get().activeRoutineId);
  },

  duplicateRoutine: (id) => {
    const r = get().routines.find((x) => x.id === id);
    if (!r) return undefined;
    const copy: Routine = { ...r, id: nid(), name: `${r.name} (copia)`, createdAt: new Date().toISOString() };
    set({ routines: [copy, ...get().routines] });
    return copy;
  },

  setActiveRoutine: (id) => {
    set({ activeRoutineId: id });
    persistSnapshot(get().routines, id);
  },
}));
