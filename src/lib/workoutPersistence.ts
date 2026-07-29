import type { SetEntry, Workout, WorkoutExercise } from '@/store/workouts';
import { isWorkoutVisibility } from '@/lib/workoutVisibility';

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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    ...(optionalString(value.supersetGroupId) &&
    UUID_PATTERN.test(value.supersetGroupId as string)
      ? { supersetGroupId: value.supersetGroupId as string }
      : {}),
    ...(typeof value.groupRestEnabled === 'boolean'
      ? { groupRestEnabled: value.groupRestEnabled }
      : {}),
  };
}

function normalizeSupersetGroups(
  exercises: WorkoutExercise[],
): WorkoutExercise[] {
  const groups = new Map<string, number[]>();
  for (let index = 0; index < exercises.length; index++) {
    const groupId = exercises[index].supersetGroupId;
    if (!groupId) continue;
    const indices = groups.get(groupId) ?? [];
    indices.push(index);
    groups.set(groupId, indices);
  }

  const invalidGroups = new Set<string>();
  for (const [groupId, indices] of groups) {
    const contiguous =
      indices[indices.length - 1] - indices[0] + 1 === indices.length;
    const restModes = new Set(
      indices.map((index) => exercises[index].groupRestEnabled ?? false),
    );
    if (
      indices.length < 2 ||
      indices.length > 4 ||
      !contiguous ||
      restModes.size !== 1
    ) {
      invalidGroups.add(groupId);
    }
  }

  return exercises.map((exercise) => {
    if (
      !exercise.supersetGroupId ||
      invalidGroups.has(exercise.supersetGroupId)
    ) {
      const {
        supersetGroupId: _supersetGroupId,
        groupRestEnabled: _groupRestEnabled,
        ...plainExercise
      } = exercise;
      return plainExercise;
    }
    return exercise;
  });
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

  const parsedExercises = value.exercises
    .map(normalizeExercise)
    .filter((exercise): exercise is WorkoutExercise => exercise !== null);
  if (parsedExercises.length !== value.exercises.length) return null;
  const exercises = normalizeSupersetGroups(parsedExercises);

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
    ...(isWorkoutVisibility(value.visibility) ? { visibility: value.visibility } : {}),
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
