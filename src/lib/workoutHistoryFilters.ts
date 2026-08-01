import type { Workout } from '@/store/workouts';

export type WorkoutHistoryPeriod = '30d' | '90d' | 'all';

export interface WorkoutHistoryFilters {
  exerciseId: string | null;
  routineName: string | null;
  period: WorkoutHistoryPeriod;
  publishedOnly: boolean;
}

export interface WorkoutHistoryOption {
  value: string;
  label: string;
}

export const DEFAULT_WORKOUT_HISTORY_FILTERS: WorkoutHistoryFilters = {
  exerciseId: null,
  routineName: null,
  period: 'all',
  publishedOnly: false,
};

export function filterWorkoutHistory(
  history: readonly Workout[],
  filters: WorkoutHistoryFilters,
  now = new Date(),
): Workout[] {
  const nowMs = now.getTime();
  const minimumMs = periodStart(filters.period, nowMs);

  return history.filter((workout) => {
    const startedAtMs = Date.parse(workout.startedAt);
    if (!Number.isFinite(startedAtMs)) return false;
    if (minimumMs !== null && startedAtMs < minimumMs) return false;
    if (filters.publishedOnly && workout.isPublished !== true) return false;
    if (
      filters.routineName !== null &&
      (workout.routineName ?? 'Entrenamiento libre') !== filters.routineName
    ) {
      return false;
    }
    if (
      filters.exerciseId !== null &&
      !workout.exercises.some((exercise) => exercise.exerciseId === filters.exerciseId)
    ) {
      return false;
    }
    return true;
  });
}

export function workoutExerciseOptions(
  history: readonly Workout[],
): WorkoutHistoryOption[] {
  const labels = new Map<string, string>();
  for (const workout of history) {
    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId || labels.has(exercise.exerciseId)) continue;
      labels.set(exercise.exerciseId, exercise.exerciseName || exercise.exerciseId);
    }
  }
  return sortOptions(labels);
}

export function workoutRoutineOptions(
  history: readonly Workout[],
): WorkoutHistoryOption[] {
  const labels = new Map<string, string>();
  for (const workout of history) {
    const label = workout.routineName || 'Entrenamiento libre';
    labels.set(label, label);
  }
  return sortOptions(labels);
}

export function hasWorkoutHistoryFilters(filters: WorkoutHistoryFilters): boolean {
  return (
    filters.exerciseId !== null ||
    filters.routineName !== null ||
    filters.period !== 'all' ||
    filters.publishedOnly
  );
}

function periodStart(period: WorkoutHistoryPeriod, nowMs: number): number | null {
  if (period === 'all') return null;
  const days = period === '30d' ? 30 : 90;
  return nowMs - days * 24 * 60 * 60 * 1000;
}

function sortOptions(labels: Map<string, string>): WorkoutHistoryOption[] {
  return [...labels.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label, 'es'));
}
