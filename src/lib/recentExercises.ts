import type { Workout } from '@/store/workouts';

/**
 * IDs de ejercicios del catálogo ordenados por la última sesión que los usó.
 * Los IDs legacy se preservan en el historial, pero los selectores solo los usan
 * como señal de orden: no se crean filas que el catálogo no pueda representar.
 */
export function recentExerciseIds(history: readonly Workout[]): string[] {
  const latestByExercise = new Map<string, number>();

  for (const workout of history) {
    const timestamp = Date.parse(workout.startedAt);
    if (!Number.isFinite(timestamp)) continue;

    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId) continue;
      const previous = latestByExercise.get(exercise.exerciseId);
      if (previous === undefined || timestamp > previous) {
        latestByExercise.set(exercise.exerciseId, timestamp);
      }
    }
  }

  return [...latestByExercise.entries()]
    .sort(([, left], [, right]) => right - left)
    .map(([exerciseId]) => exerciseId);
}

/** Aplica el orden reciente después de los filtros propios de cada selector. */
export function sortByRecentExercise<T extends { id: string }>(
  exercises: readonly T[],
  recentIds: readonly string[],
): T[] {
  const rank = new Map(recentIds.map((id, index) => [id, index]));
  return [...exercises].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (leftRank === undefined && rightRank === undefined) return 0;
    if (leftRank === undefined) return 1;
    if (rightRank === undefined) return -1;
    return leftRank - rightRank;
  });
}
