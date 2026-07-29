import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidv4 } from '@/lib/ids';
import { parseWorkoutSnapshot } from '@/lib/workoutPersistence';
import { exerciseById } from '@/data/exercises';
import type { WorkoutVisibility } from '@/lib/workoutVisibility';

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

export interface SetPatch {
  reps?: number;
  weightKg?: number;
  rpe?: number;
  isWarmup?: boolean;
  isCompleted?: boolean;
  durationSeconds?: number;
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
  supersetGroupId?: string;
  groupRestEnabled?: boolean;
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
  visibility?: WorkoutVisibility;
  photoUri?: string;
}

interface State {
  history: Workout[];
  active: Workout | null;
  hydrate: () => Promise<void>;
  reset: () => Promise<void>;
  mergeHistory: (remote: Workout[]) => void;
  markWorkoutPublished: (
    workoutId: string,
    visibility?: WorkoutVisibility,
  ) => void;
  startWorkout: (init: { routineDayId?: string; routineName?: string; exercises: WorkoutExercise[] }) => void;
  cancelWorkout: () => void;
  finishWorkout: (extras: { feeling?: Workout['feeling']; photoUri?: string; published?: boolean }) => Workout | null;
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    patch: SetPatch,
  ) => boolean;
  updateSetById: (
    exerciseEntryId: string,
    setId: string,
    patch: SetPatch,
  ) => boolean;
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
let storageGeneration = 0;

function persistSnapshot(history: Workout[], active: Workout | null) {
  persistQueue = persistQueue
    .then(() =>
      AsyncStorage.setItem(KEY, JSON.stringify({ history, active })),
    )
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

const SET_PATCH_KEYS = new Set<keyof SetPatch>([
  'reps',
  'weightKg',
  'rpe',
  'isWarmup',
  'isCompleted',
  'durationSeconds',
  'restStartedAt',
  'restAfterSeconds',
]);

function isValidSetPatch(patch: SetPatch): boolean {
  if (
    Object.keys(patch).some(
      (key) => !SET_PATCH_KEYS.has(key as keyof SetPatch),
    )
  ) {
    return false;
  }
  for (const requiredKey of ['reps', 'weightKg', 'isCompleted'] as const) {
    if (
      Object.prototype.hasOwnProperty.call(patch, requiredKey) &&
      patch[requiredKey] === undefined
    ) {
      return false;
    }
  }
  if (
    patch.isCompleted !== undefined &&
    typeof patch.isCompleted !== 'boolean'
  ) {
    return false;
  }
  if (
    patch.isWarmup !== undefined &&
    typeof patch.isWarmup !== 'boolean'
  ) {
    return false;
  }
  if (
    patch.rpe !== undefined &&
    (!Number.isFinite(patch.rpe) || patch.rpe < 0 || patch.rpe > 10)
  ) {
    return false;
  }
  if (
    patch.restStartedAt !== undefined &&
    (typeof patch.restStartedAt !== 'string' ||
      !Number.isFinite(Date.parse(patch.restStartedAt)))
  ) {
    return false;
  }
  if (
    patch.reps !== undefined &&
    (!Number.isInteger(patch.reps) || patch.reps < 1 || patch.reps > 999)
  ) {
    return false;
  }
  if (
    patch.weightKg !== undefined &&
    (!Number.isFinite(patch.weightKg) ||
      patch.weightKg < 0 ||
      patch.weightKg > 1000)
  ) {
    return false;
  }
  for (const value of [
    patch.durationSeconds,
    patch.restAfterSeconds,
  ]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      return false;
    }
  }
  return true;
}

function patchSetAt(
  workout: Workout,
  exerciseIndex: number,
  setIndex: number,
  patch: SetPatch,
): Workout | null {
  const exercise = workout.exercises[exerciseIndex];
  const currentSet = exercise?.sets[setIndex];
  if (!exercise || !currentSet || !isValidSetPatch(patch)) return null;
  const patchEntries = Object.entries(patch);
  if (
    patchEntries.length === 0 ||
    patchEntries.every(
      ([key, value]) =>
        Object.is(currentSet[key as keyof SetEntry], value),
    )
  ) {
    return null;
  }

  const exercises = [...workout.exercises];
  const sets = [...exercise.sets];
  sets[setIndex] = { ...currentSet, ...patch, id: currentSet.id };
  exercises[exerciseIndex] = { ...exercise, sets };
  return { ...workout, exercises };
}

export const useWorkoutsStore = create<State>((set, get) => ({
  history: [],
  active: null,

  hydrate: async () => {
    const generation = storageGeneration;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (generation !== storageGeneration) return;
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

  reset: async () => {
    storageGeneration += 1;
    set({ history: [], active: null });
    persistQueue = persistQueue
      .then(() => AsyncStorage.removeItem(KEY))
      .catch((error) => {
        console.warn('[Workouts] No se pudo limpiar el historial local.', error);
      });
    await persistQueue;
  },

  mergeHistory: (remote) => {
    const current = get().history;
    const remoteById = new Map(remote.map((workout) => [workout.id, workout]));
    const reconciled = current.map((workout) => {
      const remoteWorkout = remoteById.get(workout.id);
      if (!remoteWorkout) return workout;
      const isPublished = workout.isPublished || remoteWorkout.isPublished;
      const visibility = remoteWorkout.visibility ?? workout.visibility;
      if (
        isPublished === workout.isPublished &&
        visibility === workout.visibility
      ) {
        return workout;
      }
      return { ...workout, isPublished, visibility };
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

  markWorkoutPublished: (workoutId, visibility) => {
    const history = get().history.map((workout) =>
      workout.id === workoutId
        ? {
            ...workout,
            isPublished: true,
            ...(visibility ? { visibility } : {}),
          }
        : workout,
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
    if (!a) return false;
    const next = patchSetAt(a, exIdx, setIdx, patch);
    if (!next) return false;
    set({ active: next });
    persistSnapshot(get().history, next);
    return true;
  },

  updateSetById: (exerciseEntryId, setId, patch) => {
    const a = get().active;
    if (!a) return false;
    const exerciseIndex = a.exercises.findIndex(
      (exercise) => exercise.id === exerciseEntryId,
    );
    if (exerciseIndex < 0) return false;
    const setIndex = a.exercises[exerciseIndex].sets.findIndex(
      (entry) => entry.id === setId,
    );
    if (setIndex < 0) return false;
    const next = patchSetAt(a, exerciseIndex, setIndex, patch);
    if (!next) return false;
    set({ active: next });
    persistSnapshot(get().history, next);
    return true;
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
      supersetGroupId: cur.supersetGroupId,
      groupRestEnabled: cur.groupRestEnabled,
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
      // Dividir un miembro completado rompería la contigüidad del grupo.
      // Disuelve la superserie completa antes de conservar el ledger y continuar.
      if (cur.supersetGroupId) {
        for (let index = 0; index < exercises.length; index++) {
          if (exercises[index].supersetGroupId === cur.supersetGroupId) {
            exercises[index] = {
              ...exercises[index],
              supersetGroupId: undefined,
              groupRestEnabled: undefined,
            };
          }
        }
      }
      exercises[exIdx] = {
        ...cur,
        sets: completed,
        supersetGroupId: undefined,
        groupRestEnabled: undefined,
      };
      exercises.splice(exIdx + 1, 0, {
        ...newEx,
        supersetGroupId: undefined,
        groupRestEnabled: undefined,
      });
      newIndex = exIdx + 1;
    }
    set({ active: { ...a, exercises } });
    persistSnapshot(get().history, get().active);
    return newIndex;
  },
}));
