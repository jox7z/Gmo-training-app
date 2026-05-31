import { Workout, WorkoutExercise } from '@/store/workouts';

/** Volume for a single exercise (completed non-warmup sets only). */
function exerciseVolume(ex: WorkoutExercise): number {
  return ex.sets
    .filter((s) => s.isCompleted && !s.isWarmup)
    .reduce((sum, s) => sum + s.reps * s.weightKg, 0);
}

/** Top-set weight for a single exercise (completed non-warmup sets only). */
function exerciseTopWeight(ex: WorkoutExercise): number {
  const completed = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
  if (!completed.length) return 0;
  return Math.max(...completed.map((s) => s.weightKg));
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
  /** Delta in total volume kg vs previous session (null if exercise not in previous) */
  volumeDelta: number | null;
  /** Delta in top-set weight vs previous session (null if not present) */
  topWeightDelta: number | null;
}

/**
 * For each exercise in `current`, computes the volume and top-weight delta
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

    const curVol = exerciseVolume(ex);
    const curTop = exerciseTopWeight(ex);

    if (!prevEx) {
      return {
        exerciseId: ex.exerciseId,
        volumeDelta: null,
        topWeightDelta: null,
      };
    }

    return {
      exerciseId: ex.exerciseId,
      volumeDelta: curVol - exerciseVolume(prevEx),
      topWeightDelta: curTop - exerciseTopWeight(prevEx),
    };
  });
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

    const historicMax = history
      .filter((w) => w.id !== current.id)
      .flatMap((w) => w.exercises.filter((e) => e.exerciseId === ex.exerciseId))
      .reduce((max, e) => Math.max(max, exerciseTopWeight(e)), 0);

    if (curTop > historicMax) {
      prs.add(ex.exerciseId);
    }
  }

  return prs;
}
