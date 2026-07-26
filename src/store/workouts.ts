import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidv4 } from '@/lib/ids';
import { parseWorkoutSnapshot } from '@/lib/workoutPersistence';
import { exerciseById } from '@/data/exercises';

export interface SetEntry {
  id: string;
  reps: number;
  weightKg: number;
  rpe?: number;
  isWarmup?: boolean;
  isCompleted: boolean;
  durationSeconds?: number;
  /** Timestamp ISO local mientras el descanso posterior sigue abierto. */
  restStartedAt?: string;
  restAfterSeconds?: number;
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
  markWorkoutPublished: (workoutId: string) => void;
  startWorkout: (init: { routineDayId?: string; routineName?: string; exercises: WorkoutExercise[] }) => void;
  cancelWorkout: () => void;
  finishWorkout: (extras: { feeling?: Workout['feeling']; photoUri?: string; published?: boolean }) => Workout | null;
  updateSet: (exerciseIndex: number, setIndex: number, patch: Partial<SetEntry>) => void;
  addSet: (exerciseIndex: number) => void;
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
let persistQueue: Promise<void> = Promise.resolve();

function persistSnapshot(history: Workout[], active: Workout | null) {
  const snapshot = JSON.stringify({ history, active });
  persistQueue = persistQueue
    .then(() => AsyncStorage.setItem(KEY, snapshot))
    .catch((error) => {
      console.warn('[Workouts] No se pudo persistir el historial.', error);
    });
}

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
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return;
      const snapshot = parseWorkoutSnapshot(raw);
      if (snapshot.recoveredEntries > 0) {
        console.warn(`[Workouts] Se ignoraron ${snapshot.recoveredEntries} registros locales corruptos.`);
      }
      set({ active: snapshot.active, history: snapshot.history });
    } catch (error) {
      console.warn('[Workouts] No se pudo hidratar el historial local.', error);
    }
  },

  mergeHistory: (remote) => {
    const current = get().history;
    const remoteById = new Map(remote.map((workout) => [workout.id, workout]));
    const reconciled = current.map((workout) => {
      const remoteWorkout = remoteById.get(workout.id);
      return remoteWorkout?.isPublished && !workout.isPublished
        ? { ...workout, isPublished: true }
        : workout;
    });
    const ids = new Set(current.map((w) => w.id));
    const toAdd = remote.filter((w) => !ids.has(w.id));
    const publicationChanged = reconciled.some(
      (workout, index) => workout !== current[index],
    );
    if (!toAdd.length && !publicationChanged) return;
    const merged = [...toAdd, ...reconciled].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
    set({ history: merged });
    persistSnapshot(merged, get().active);
  },

  markWorkoutPublished: (workoutId) => {
    const history = get().history.map((workout) =>
      workout.id === workoutId ? { ...workout, isPublished: true } : workout,
    );
    set({ history });
    persistSnapshot(history, get().active);
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
    persistSnapshot(get().history, get().active);
  },

  cancelWorkout: () => {
    set({ active: null });
    persistSnapshot(get().history, null);
  },

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
    persistSnapshot(history, null);
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
    persistSnapshot(get().history, get().active);
  },

  toggleSetComplete: (exIdx, setIdx) => {
    const a = get().active;
    if (!a) return;
    const exercises = [...a.exercises];
    const sets = [...exercises[exIdx].sets];
    sets[setIdx] = { ...sets[setIdx], isCompleted: !sets[setIdx].isCompleted };
    exercises[exIdx] = { ...exercises[exIdx], sets };
    set({ active: { ...a, exercises } });
    persistSnapshot(get().history, get().active);
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
    persistSnapshot(get().history, get().active);
  },

  removeSet: (exIdx, setIdx) => {
    const a = get().active;
    if (!a) return;
    const exercises = [...a.exercises];
    const sets = exercises[exIdx].sets.filter((_, i) => i !== setIdx);
    exercises[exIdx] = { ...exercises[exIdx], sets };
    set({ active: { ...a, exercises } });
    persistSnapshot(get().history, get().active);
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
      exercises[exIdx] = { ...cur, sets: completed };
      exercises.splice(exIdx + 1, 0, newEx);
      newIndex = exIdx + 1;
    }
    set({ active: { ...a, exercises } });
    persistSnapshot(get().history, get().active);
    return newIndex;
  },
}));
