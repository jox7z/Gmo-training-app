import type { SetEntry, Workout, WorkoutExercise } from '@/store/workouts';

export interface WorkoutSnapshot {
  active: Workout | null;
  history: Workout[];
  recoveredEntries: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function validDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function optionalNonNegative(value: unknown): number | undefined {
  return finiteNumber(value) && value >= 0 ? value : undefined;
}

function normalizeSet(value: unknown): SetEntry | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !finiteNumber(value.reps) ||
    !finiteNumber(value.weightKg) ||
    typeof value.isCompleted !== 'boolean'
  ) {
    return null;
  }

  return {
    id: value.id,
    reps: value.reps,
    weightKg: value.weightKg,
    isCompleted: value.isCompleted,
    ...(finiteNumber(value.rpe) ? { rpe: value.rpe } : {}),
    ...(typeof value.isWarmup === 'boolean' ? { isWarmup: value.isWarmup } : {}),
    ...(optionalNonNegative(value.durationSeconds) !== undefined
      ? { durationSeconds: value.durationSeconds as number }
      : {}),
    ...(validDateString(value.restStartedAt) ? { restStartedAt: value.restStartedAt } : {}),
    ...(optionalNonNegative(value.restAfterSeconds) !== undefined
      ? { restAfterSeconds: value.restAfterSeconds as number }
      : {}),
  };
}

function normalizeExercise(value: unknown): WorkoutExercise | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.exerciseId !== 'string' ||
    typeof value.exerciseName !== 'string' ||
    typeof value.muscleGroup !== 'string' ||
    !Array.isArray(value.sets)
  ) {
    return null;
  }

  const sets = value.sets.map(normalizeSet).filter((set): set is SetEntry => set !== null);
  if (sets.length !== value.sets.length) return null;

  return {
    id: value.id,
    exerciseId: value.exerciseId,
    exerciseName: value.exerciseName,
    muscleGroup: value.muscleGroup,
    sets,
    ...(optionalString(value.notes) ? { notes: value.notes as string } : {}),
  };
}

function normalizeWorkout(value: unknown): Workout | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !validDateString(value.startedAt) ||
    !Array.isArray(value.exercises)
  ) {
    return null;
  }

  const exercises = value.exercises
    .map(normalizeExercise)
    .filter((exercise): exercise is WorkoutExercise => exercise !== null);
  if (exercises.length !== value.exercises.length) return null;

  const completedSets = exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted);
  const totalReps = completedSets
    .filter((set) => !set.isWarmup)
    .reduce((sum, set) => sum + set.reps, 0);
  const totalActiveSeconds = completedSets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0);
  const totalRestSeconds = exercises
    .flatMap((exercise) => exercise.sets)
    .reduce((sum, set) => sum + (set.restAfterSeconds ?? 0), 0);
  const feeling = value.feeling;

  return {
    id: value.id,
    startedAt: value.startedAt,
    exercises,
    totalReps: optionalNonNegative(value.totalReps) ?? totalReps,
    totalRestSeconds: optionalNonNegative(value.totalRestSeconds) ?? totalRestSeconds,
    totalActiveSeconds: optionalNonNegative(value.totalActiveSeconds) ?? totalActiveSeconds,
    ...(optionalString(value.routineDayId) ? { routineDayId: value.routineDayId as string } : {}),
    ...(optionalString(value.routineName) ? { routineName: value.routineName as string } : {}),
    ...(validDateString(value.endedAt) ? { endedAt: value.endedAt } : {}),
    ...(optionalNonNegative(value.durationSeconds) !== undefined
      ? { durationSeconds: value.durationSeconds as number }
      : {}),
    ...(optionalNonNegative(value.avgRestSeconds) !== undefined
      ? { avgRestSeconds: value.avgRestSeconds as number }
      : {}),
    ...(feeling === 'great' || feeling === 'good' || feeling === 'tired' || feeling === 'bad'
      ? { feeling }
      : {}),
    ...(typeof value.isPublished === 'boolean' ? { isPublished: value.isPublished } : {}),
    ...(optionalString(value.photoUri) ? { photoUri: value.photoUri as string } : {}),
  };
}

export function parseWorkoutSnapshot(raw: string): WorkoutSnapshot {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.history)) {
    throw new Error('Formato de historial inválido.');
  }

  const history = parsed.history
    .map(normalizeWorkout)
    .filter((workout): workout is Workout => workout !== null);
  const active = parsed.active === null || parsed.active === undefined
    ? null
    : normalizeWorkout(parsed.active);

  return {
    active,
    history,
    recoveredEntries:
      parsed.history.length - history.length +
      (parsed.active !== null && parsed.active !== undefined && active === null ? 1 : 0),
  };
}
