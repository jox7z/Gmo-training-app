import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  return Math.random().toString(36).slice(2, 10);
}

const seedRoutine: Routine = {
  id: 'seed-ppl',
  name: 'Push / Pull / Legs (PPL)',
  description: 'Split clásico de 6 días para hipertrofia.',
  splitType: 'ppl',
  isAiGenerated: false,
  createdAt: new Date().toISOString(),
  days: [
    {
      id: nid(),
      name: 'Push',
      exercises: [
        { id: nid(), exerciseId: 'bench-press', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120 },
        { id: nid(), exerciseId: 'overhead-press', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 },
        { id: nid(), exerciseId: 'incline-db-press', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 75 },
        { id: nid(), exerciseId: 'lateral-raise', targetSets: 4, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { id: nid(), exerciseId: 'triceps-pushdown', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 60 },
      ],
    },
    {
      id: nid(),
      name: 'Pull',
      exercises: [
        { id: nid(), exerciseId: 'deadlift', targetSets: 3, targetRepsMin: 5, targetRepsMax: 6, restSeconds: 180 },
        { id: nid(), exerciseId: 'pull-up', targetSets: 4, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120 },
        { id: nid(), exerciseId: 'barbell-row', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 90 },
        { id: nid(), exerciseId: 'face-pull', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { id: nid(), exerciseId: 'biceps-curl', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
      ],
    },
    {
      id: nid(),
      name: 'Legs',
      exercises: [
        { id: nid(), exerciseId: 'squat', targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 180 },
        { id: nid(), exerciseId: 'romanian-deadlift', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 },
        { id: nid(), exerciseId: 'leg-press', targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 90 },
        { id: nid(), exerciseId: 'leg-curl', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60 },
        { id: nid(), exerciseId: 'standing-calf', targetSets: 4, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 45 },
      ],
    },
  ],
};

export const useRoutinesStore = create<State>((set, get) => ({
  routines: [seedRoutine],
  activeRoutineId: 'seed-ppl',

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      set({
        routines: data.routines?.length ? data.routines : [seedRoutine],
        activeRoutineId: data.activeRoutineId ?? 'seed-ppl',
      });
    }
  },

  upsertRoutine: (r) => {
    const existing = get().routines.find((x) => x.id === r.id);
    const routines = existing
      ? get().routines.map((x) => (x.id === r.id ? r : x))
      : [r, ...get().routines];
    set({ routines });
    AsyncStorage.setItem(KEY, JSON.stringify({ routines, activeRoutineId: get().activeRoutineId })).catch(() => {});
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
