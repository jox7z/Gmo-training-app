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
  aiReasoning?: string;
  isPublic?: boolean;
  createdAt: string;
}

interface State {
  routines: Routine[];
  activeRoutineId: string | null;
  hydrate: () => Promise<void>;
  upsertRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => Routine | undefined;
  setActiveRoutine: (id: string) => void;
}

const KEY = 'gmo:routines:v1';

export function nid() {
  return uuidv4();
}

export const useRoutinesStore = create<State>((set, get) => ({
  routines: [],
  activeRoutineId: null,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    let routines: Routine[] = [];
    let activeRoutineId: string | null = null;

    if (raw) {
      const data = JSON.parse(raw);
      routines = (data.routines ?? []).filter((r: Routine) => r.id !== 'seed-ppl');
      activeRoutineId = data.activeRoutineId ?? null;
    }

    // Migration: if activeRoutineId was seed-ppl or no longer exists, pick first or null
    if (activeRoutineId === 'seed-ppl' || !routines.find((r) => r.id === activeRoutineId)) {
      activeRoutineId = routines.length > 0 ? routines[0].id : null;
    }

    set({ routines, activeRoutineId });
    // Re-persist migrated result so seed never reappears
    AsyncStorage.setItem(KEY, JSON.stringify({ routines, activeRoutineId })).catch(() => {});
  },

  upsertRoutine: (r) => {
    const existing = get().routines.some((x) => x.id === r.id);
    // Una sola rutina por usuario: una rutina nueva reemplaza a la anterior;
    // editar la existente (mismo id) la actualiza en sitio.
    const routines = existing
      ? get().routines.map((x) => (x.id === r.id ? r : x))
      : [r];
    set({ routines, activeRoutineId: r.id });
    AsyncStorage.setItem(KEY, JSON.stringify({ routines, activeRoutineId: r.id })).catch(() => {});
  },

  deleteRoutine: (id) => {
    const routines = get().routines.filter((r) => r.id !== id);
    set({ routines });
    AsyncStorage.setItem(KEY, JSON.stringify({ routines, activeRoutineId: get().activeRoutineId })).catch(() => {});
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
    AsyncStorage.setItem(KEY, JSON.stringify({ routines: get().routines, activeRoutineId: id })).catch(() => {});
  },
}));
