import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SetEntry {
  id: string;
  reps: number;
  weightKg: number;
  rpe?: number;
  isWarmup?: boolean;
  isCompleted: boolean;
  restSeconds?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: SetEntry[];
  notes?: string;
}

export interface Workout {
  id: string;
  routineDayId?: string;
  routineName?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  totalVolumeKg: number;
  avgRestSeconds?: number;
  exercises: WorkoutExercise[];
  feeling?: 'great' | 'good' | 'tired' | 'bad';
  isPublished?: boolean;
  photoUri?: string;
}

interface State {
  history: Workout[];
  active: Workout | null;
  hydrate: () => Promise<void>;
  startWorkout: (init: { routineDayId?: string; routineName?: string; exercises: WorkoutExercise[] }) => void;
  cancelWorkout: () => void;
  finishWorkout: (extras: { feeling?: Workout['feeling']; photoUri?: string; published?: boolean }) => Workout | null;
  updateSet: (exerciseIndex: number, setIndex: number, patch: Partial<SetEntry>) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
}

const KEY = 'gmo:workouts:v1';

function nid() {
  return Math.random().toString(36).slice(2, 10);
}

function calcVolume(w: Workout) {
  return w.exercises.reduce(
    (acc, ex) =>
      acc + ex.sets.filter((s) => s.isCompleted && !s.isWarmup).reduce((a, s) => a + s.reps * s.weightKg, 0),
    0,
  );
}

function calcAvgRest(w: Workout): number | undefined {
  const rests = w.exercises
    .flatMap((ex) => ex.sets)
    .map((s) => s.restSeconds)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  if (rests.length === 0) return undefined;
  return Math.round(rests.reduce((a, b) => a + b, 0) / rests.length);
}

export const useWorkoutsStore = create<State>((set, get) => ({
  history: [],
  active: null,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) set(JSON.parse(raw));
  },

  startWorkout: ({ routineDayId, routineName, exercises }) => {
    set({
      active: {
        id: nid(),
        routineDayId,
        routineName,
        startedAt: new Date().toISOString(),
        totalVolumeKg: 0,
        exercises: exercises.map((e) => ({ ...e, id: nid() })),
      },
    });
  },

  cancelWorkout: () => set({ active: null }),

  finishWorkout: ({ feeling, photoUri, published }) => {
    const a = get().active;
    if (!a) return null;
    const ended = new Date();
    const duration = Math.floor((ended.getTime() - new Date(a.startedAt).getTime()) / 1000);
    const finished: Workout = {
      ...a,
      endedAt: ended.toISOString(),
      durationSeconds: duration,
      totalVolumeKg: calcVolume(a),
      avgRestSeconds: calcAvgRest(a),
      feeling,
      photoUri,
      isPublished: !!published,
    };
    const history = [finished, ...get().history];
    set({ active: null, history });
    AsyncStorage.setItem(KEY, JSON.stringify({ history })).catch(() => {});
    return finished;
  },

  updateSet: (exIdx, setIdx, patch) => {
    const a = get().active;
    if (!a) return;
    const exercises = [...a.exercises];
    const sets = [...exercises[exIdx].sets];
    sets[setIdx] = { ...sets[setIdx], ...patch };
    exercises[exIdx] = { ...exercises[exIdx], sets };
    set({ active: { ...a, exercises } });
  },

  toggleSetComplete: (exIdx, setIdx) => {
    const a = get().active;
    if (!a) return;
    const exercises = [...a.exercises];
    const sets = [...exercises[exIdx].sets];
    sets[setIdx] = { ...sets[setIdx], isCompleted: !sets[setIdx].isCompleted };
    exercises[exIdx] = { ...exercises[exIdx], sets };
    set({ active: { ...a, exercises } });
  },

  addSet: (exIdx) => {
    const a = get().active;
    if (!a) return;
    const exercises = [...a.exercises];
    const sets = [...exercises[exIdx].sets];
    const last = sets[sets.length - 1];
    sets.push({
      id: nid(),
      reps: last?.reps ?? 8,
      weightKg: last?.weightKg ?? 20,
      isCompleted: false,
    });
    exercises[exIdx] = { ...exercises[exIdx], sets };
    set({ active: { ...a, exercises } });
  },

  removeSet: (exIdx, setIdx) => {
    const a = get().active;
    if (!a) return;
    const exercises = [...a.exercises];
    const sets = exercises[exIdx].sets.filter((_, i) => i !== setIdx);
    exercises[exIdx] = { ...exercises[exIdx], sets };
    set({ active: { ...a, exercises } });
  },
}));
