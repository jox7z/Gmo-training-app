import { Workout, WorkoutExercise, SetEntry } from '@/store/workouts';

/** Top-set weight for a single exercise (completed non-warmup sets only). */
export function exerciseTopWeight(ex: WorkoutExercise): number {
  const completed = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
  if (!completed.length) return 0;
  return Math.max(...completed.map((s) => s.weightKg));
}

/**
 * Reps of the top set (heaviest; ties broken by most reps).
 * Returns 0 if no completed non-warmup sets.
 */
export function exerciseTopReps(ex: WorkoutExercise): number {
  const completed = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
  if (!completed.length) return 0;
  const topWeight = Math.max(...completed.map((s) => s.weightKg));
  const topSets = completed.filter((s) => s.weightKg === topWeight);
  return Math.max(...topSets.map((s) => s.reps));
}

/**
 * Devuelve las series (completadas, no de calentamiento) del ejercicio
 * `exerciseId` en la sesión más reciente que lo contenga. `history` ya viene
 * ordenado descendente por `startedAt`, así que la primera coincidencia es la
 * más reciente. Se puede excluir un workout (p. ej. el que está en curso) con
 * `excludeWorkoutId`. Devuelve `null` si nunca se registró ese ejercicio.
 *
 * Uso: mostrar "Anterior" y autocompletar peso/reps por defecto al empezar.
 */
export function previousExerciseSets(
  history: Workout[],
  exerciseId: string,
  excludeWorkoutId?: string,
): SetEntry[] | null {
  for (const w of history) {
    if (w.id === excludeWorkoutId) continue;
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const sets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
    if (sets.length > 0) return sets;
  }
  return null;
}

/**
 * Máximo peso histórico (top-set) del ejercicio `exerciseId` a lo largo de
 * `history`, excluyendo opcionalmente `excludeWorkoutId`. Devuelve 0 si nunca
 * se registró con peso. Base para detectar PRs en vivo y al cerrar el workout.
 */
export function historicMaxWeight(
  history: Workout[],
  exerciseId: string,
  excludeWorkoutId?: string,
): number {
  return history
    .filter((w) => w.id !== excludeWorkoutId)
    .flatMap((w) => w.exercises.filter((e) => e.exerciseId === exerciseId))
    .reduce((max, e) => Math.max(max, exerciseTopWeight(e)), 0);
}

/**
 * Returns the most recent workout in `history` that shares the same
 * `routineDayId` as `current` but has a different `id` and started before it.
 */
export function findPreviousSession(
  history: Workout[],
  current: Workout,
): Workout | null {
  if (!current.routineDayId) return null;

  const currentStart = new Date(current.startedAt).getTime();

  const candidates = history.filter(
    (w) =>
      w.id !== current.id &&
      w.routineDayId === current.routineDayId &&
      new Date(w.startedAt).getTime() < currentStart,
  );

  if (!candidates.length) return null;

  // Most recent first
  candidates.sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  return candidates[0];
}

export interface ExerciseComparison {
  exerciseId: string;
  /** Delta in top-set weight vs previous session (null if not present) */
  topWeightDelta: number | null;
  /** Delta in reps of the top set vs previous session (null if no prior exercise) */
  repsDelta: number | null;
  /** True if there was any improvement in weight or reps */
  improved: boolean;
}

/**
 * For each exercise in `current`, computes the top-weight and reps delta
 * relative to the same exercise in `previous`.
 */
export function comparePerExercise(
  current: Workout,
  previous: Workout | null,
): ExerciseComparison[] {
  return current.exercises.map((ex) => {
    const prevEx = previous?.exercises.find(
      (p) => p.exerciseId === ex.exerciseId,
    );

    const curTop = exerciseTopWeight(ex);
    const curReps = exerciseTopReps(ex);

    if (!prevEx) {
      return {
        exerciseId: ex.exerciseId,
        topWeightDelta: null,
        repsDelta: null,
        improved: false,
      };
    }

    const topWeightDelta = curTop - exerciseTopWeight(prevEx);
    const repsDelta = curReps - exerciseTopReps(prevEx);

    return {
      exerciseId: ex.exerciseId,
      topWeightDelta,
      repsDelta,
      improved: topWeightDelta > 0 || repsDelta > 0,
    };
  });
}

export interface ProgressSummary {
  improvedCount: number;
  prCount: number;
  gainedWeight: boolean;
  gainedReps: boolean;
}

/**
 * Aggregates comparisons and PRs into a high-level progress summary.
 */
export function summarizeProgress(
  comparisons: ExerciseComparison[],
  prs: Set<string>,
): ProgressSummary {
  const improvedCount = comparisons.filter((c) => c.improved).length;
  const prCount = prs.size;
  const gainedWeight = comparisons.some((c) => (c.topWeightDelta ?? 0) > 0);
  const gainedReps = comparisons.some((c) => (c.repsDelta ?? 0) > 0);
  return { improvedCount, prCount, gainedWeight, gainedReps };
}

/**
 * Returns a Set of exerciseIds whose maximum weight in `current` exceeds
 * the all-time maximum weight for that exercise across all prior history
 * entries (excluding `current` itself).
 */
export function detectPRs(history: Workout[], current: Workout): Set<string> {
  const prs = new Set<string>();

  for (const ex of current.exercises) {
    const curTop = exerciseTopWeight(ex);
    if (curTop <= 0) continue;

    const historicMax = historicMaxWeight(history, ex.exerciseId, current.id);

    if (curTop > historicMax) {
      prs.add(ex.exerciseId);
    }
  }

  return prs;
}
