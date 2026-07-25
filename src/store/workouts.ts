import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidv4 } from '@/lib/ids';
import { exerciseById } from '@/data/exercises';
import type { WarmupSuggestion } from '@/lib/warmupSets';
import { dissolveNonContiguousGroups } from '@/lib/supersets';

export interface SetEntry {
  id: string;
  reps: number;
  weightKg: number;
  rpe?: number;
  isWarmup?: boolean;
  isCompleted: boolean;
  durationSeconds?: number;
  restAfterSeconds?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: SetEntry[];
  notes?: string;
  /**
   * Miembros de un mismo superset comparten este id (uuid) y quedan contiguos en
   * `Workout.exercises`. `undefined` = ejercicio suelto. Heredado de la rutina al
   * arrancar la sesión y conservado por `swapExercise`. MVP: grupos de 2.
   */
  supersetGroupId?: string;
}

export interface Workout {
  id: string;
  routineDayId?: string;
  routineName?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  totalReps: number;
  totalRestSeconds: number;
  totalActiveSeconds: number;
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
  mergeHistory: (remote: Workout[]) => void;
  startWorkout: (init: { routineDayId?: string; routineName?: string; exercises: WorkoutExercise[] }) => void;
  cancelWorkout: () => void;
  finishWorkout: (extras: { feeling?: Workout['feeling']; photoUri?: string; published?: boolean }) => Workout | null;
  updateSet: (exerciseIndex: number, setIndex: number, patch: Partial<SetEntry>) => void;
  addSet: (exerciseIndex: number) => void;
  /**
   * Inserta series de calentamiento al FRENTE del ejercicio (antes de las de
   * trabajo). Cada una queda como `isWarmup: true` e incompleta, sin alterar el
   * orden relativo de las series ya existentes. Los cálculos de records/1RM/
   * logros ya filtran `isWarmup`, así que no afectan PRs.
   */
  addWarmupSets: (exerciseIndex: number, suggestions: WarmupSuggestion[]) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  /**
   * Reemplaza el ejercicio en curso SOLO para esta sesión (la rutina no se toca).
   * Las series ya completadas se conservan bajo el ejercicio original; las
   * pendientes pasan al nuevo. Devuelve el índice del ejercicio nuevo.
   */
  swapExercise: (exerciseIndex: number, newExerciseId: string) => number;
}

const KEY = 'gmo:workouts:v1';

function nid() {
  return uuidv4();
}

function calcTotalReps(w: Workout): number {
  return w.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted && !s.isWarmup).reduce((a, s) => a + s.reps, 0),
    0,
  );
}

function calcTotalActiveSeconds(w: Workout): number {
  return w.exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets
        .filter((s) => s.isCompleted && typeof s.durationSeconds === 'number')
        .reduce((a, s) => a + (s.durationSeconds ?? 0), 0),
    0,
  );
}

function calcTotalRestSeconds(w: Workout): number {
  return w.exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets
        .filter((s) => typeof s.restAfterSeconds === 'number')
        .reduce((a, s) => a + (s.restAfterSeconds ?? 0), 0),
    0,
  );
}

function calcAvgRest(w: Workout): number | undefined {
  const rests = w.exercises
    .flatMap((ex) => ex.sets)
    .map((s) => s.restAfterSeconds)
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

  mergeHistory: (remote) => {
    const current = get().history;
    const ids = new Set(current.map((w) => w.id));
    const toAdd = remote.filter((w) => !ids.has(w.id));
    if (!toAdd.length) return;
    const merged = [...toAdd, ...current].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
    set({ history: merged });
  },

  startWorkout: ({ routineDayId, routineName, exercises }) => {
    set({
      active: {
        id: nid(),
        routineDayId,
        routineName,
        startedAt: new Date().toISOString(),
        totalReps: 0,
        totalRestSeconds: 0,
        totalActiveSeconds: 0,
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
      totalReps: calcTotalReps(a),
      totalRestSeconds: calcTotalRestSeconds(a),
      totalActiveSeconds: calcTotalActiveSeconds(a),
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
    const ex = exercises[exIdx];
    const sets = [...ex.sets];
    const last = sets[sets.length - 1];
    const isBodyweight = exerciseById(ex.exerciseId)?.equipment === 'bodyweight';
    const defaultWeight = isBodyweight ? 0 : 20;
    sets.push({
      id: nid(),
      reps: last?.reps ?? 8,
      weightKg: last?.weightKg ?? defaultWeight,
      isCompleted: false,
    });
    exercises[exIdx] = { ...ex, sets };
    set({ active: { ...a, exercises } });
  },

  addWarmupSets: (exIdx, suggestions) => {
    const a = get().active;
    if (!a || suggestions.length === 0) return;
    const exercises = [...a.exercises];
    const ex = exercises[exIdx];
    if (!ex) return;
    const warmups: SetEntry[] = suggestions.map((s) => ({
      id: nid(),
      reps: s.reps,
      weightKg: s.weightKg,
      isWarmup: true,
      isCompleted: false,
    }));
    exercises[exIdx] = { ...ex, sets: [...warmups, ...ex.sets] };
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

  swapExercise: (exIdx, newExerciseId) => {
    const a = get().active;
    if (!a) return exIdx;
    const meta = exerciseById(newExerciseId);
    const exercises = [...a.exercises];
    const cur = exercises[exIdx];
    const completed = cur.sets.filter((s) => s.isCompleted);
    const pending = cur.sets.filter((s) => !s.isCompleted);
    const defaultWeight = meta?.equipment === 'bodyweight' ? 0 : 20;

    const newEx: WorkoutExercise = {
      id: nid(),
      exerciseId: newExerciseId,
      exerciseName: meta?.name ?? newExerciseId,
      muscleGroup: meta?.muscle ?? cur.muscleGroup,
      // Hereda el grupo del ejercicio sustituido para quedar contiguo y en el
      // mismo superset (cuando el original pertenecía a uno).
      supersetGroupId: cur.supersetGroupId,
      sets: (pending.length > 0 ? pending : [{ reps: 8 } as SetEntry]).map((s) => ({
        id: nid(),
        reps: s.reps ?? 8,
        weightKg: defaultWeight,
        isCompleted: false,
      })),
    };

    let newIndex: number;
    if (completed.length === 0) {
      exercises[exIdx] = newEx;
      newIndex = exIdx;
    } else {
      // Conserva lo ya hecho bajo el ejercicio original e inserta el nuevo después.
      // El remanente completado sale del grupo (si tenía uno): si no, quedarían 3
      // ejercicios contiguos con el mismo supersetGroupId (remanente + nuevo + pareja
      // original), fusionando una pareja de 2 en una ronda de 3.
      exercises[exIdx] = { ...cur, sets: completed, supersetGroupId: undefined };
      exercises.splice(exIdx + 1, 0, newEx);
      newIndex = exIdx + 1;
    }
    // Swapear un miembro DEL MEDIO de un grupo de 3-4 inserta el remanente entre
    // sus antiguos compañeros, partiendo la corrida contigua en dos: el/los que
    // quedan antes del remanente conservan el mismo supersetGroupId por VALOR pero
    // ya no son adyacentes a los que quedan después — buildStepSequence solo agrupa
    // por contigüidad, así que quedarían "huérfanos" con un id que ya no significa
    // nada (y el badge de compañeros, que matchea por valor, mentiría). Normaliza.
    set({ active: { ...a, exercises: dissolveNonContiguousGroups(exercises) } });
    return newIndex;
  },
}));
