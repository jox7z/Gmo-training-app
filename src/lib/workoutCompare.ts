import type { Workout, WorkoutExercise } from '@/store/workouts';

export interface PreviousSetValue {
  /** Peso guardado en kg. Conversión ocurre solo en UI. */
  weightKg: number;
  reps: number;
  /** Índice cero-based dentro de las series laborales de la sesión previa. */
  sourceSetIndex: number;
  /** True cuando la sesión previa tenía menos series y se usó la última. */
  usedFallback: boolean;
  sessionId: string;
}

/**
 * Finds the closest completed working set before the target inside the same
 * workout-exercise entry. Stable IDs avoid carrying data to another set after
 * list mutations. Protected targets represent values already edited by users.
 */
export function getCarriedWeightForSet(
  exercise: WorkoutExercise,
  targetSetId: string,
  protectedSetIds: ReadonlySet<string> = new Set(),
): number | null {
  const targetIndex = exercise.sets.findIndex((set) => set.id === targetSetId);
  const target = exercise.sets[targetIndex];
  if (
    targetIndex <= 0 ||
    !target ||
    target.isCompleted ||
    target.isWarmup ||
    protectedSetIds.has(targetSetId)
  ) {
    return null;
  }

  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const candidate = exercise.sets[index];
    if (
      candidate.isCompleted &&
      !candidate.isWarmup &&
      Number.isFinite(candidate.weightKg) &&
      candidate.weightKg >= 0 &&
      candidate.weightKg <= 1000
    ) {
      return candidate.weightKg;
    }
  }

  return null;
}

/** Top-set weight for a single exercise (completed non-warmup sets only). */
export function exerciseTopWeight(ex: WorkoutExercise): number {
  const completed = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
  if (!completed.length) return 0;
  return Math.max(...completed.map((s) => s.weightKg));
}

/**
 * Returns reps/weight for a zero-based working-set position from the most
 * recent prior workout containing the same exercise. When that workout has
 * fewer working sets, its last completed working set is the fallback.
 */
export function getPreviousSetValue(
  history: Workout[],
  current: Workout,
  exerciseId: string,
  workingSetIndex: number,
): PreviousSetValue | null {
  if (workingSetIndex < 0 || !Number.isInteger(workingSetIndex)) return null;

  const currentStart = new Date(current.startedAt).getTime();
  if (!Number.isFinite(currentStart)) return null;

  const previous = history
    .filter((workout) => {
      if (workout.id === current.id) return false;
      const startedAt = new Date(workout.startedAt).getTime();
      if (!Number.isFinite(startedAt) || startedAt >= currentStart) return false;
      return workout.exercises.some(
        (exercise) =>
          exercise.exerciseId === exerciseId &&
          exercise.sets.some((set) => set.isCompleted && !set.isWarmup),
      );
    })
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )[0];

  if (!previous) return null;

  const workingSets = previous.exercises
    .filter((exercise) => exercise.exerciseId === exerciseId)
    .flatMap((exercise) =>
      exercise.sets.filter((set) => set.isCompleted && !set.isWarmup),
    );
  if (!workingSets.length) return null;

  const sourceSetIndex = Math.min(workingSetIndex, workingSets.length - 1);
  const source = workingSets[sourceSetIndex];

  return {
    weightKg: source.weightKg,
    reps: source.reps,
    sourceSetIndex,
    usedFallback: sourceSetIndex !== workingSetIndex,
    sessionId: previous.id,
  };
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

    const historicMax = historicTopWeight(history, current.id, ex.exerciseId) ?? 0;

    if (curTop > historicMax) {
      prs.add(ex.exerciseId);
    }
  }

  return prs;
}

/**
 * Detects whether one just-saved set establishes a new weight PR.
 * Requires at least one prior positive-weight record, so partial/empty history
 * never produces a live PR banner. Historical qualification stays delegated
 * to detectPRs.
 */
export function detectSetPR(
  history: Workout[],
  current: Workout,
  exerciseIndex: number,
  setIndex: number,
): boolean {
  const exercise = current.exercises[exerciseIndex];
  const set = exercise?.sets[setIndex];
  if (!exercise || !set || set.isWarmup || set.weightKg <= 0) return false;

  const historicMax = historicTopWeight(history, current.id, exercise.exerciseId);
  if (historicMax === null || historicMax <= 0) return false;

  const exerciseBeforeSave: WorkoutExercise = {
    ...exercise,
    sets: exercise.sets.map((entry, index) =>
      index === setIndex ? { ...entry, isCompleted: false } : entry,
    ),
  };
  if (set.weightKg <= exerciseTopWeight(exerciseBeforeSave)) return false;

  const projected: Workout = {
    ...current,
    exercises: current.exercises.map((entry, index) =>
      index === exerciseIndex
        ? {
            ...entry,
            sets: entry.sets.map((candidate, candidateIndex) =>
              candidateIndex === setIndex
                ? { ...candidate, isCompleted: true }
                : candidate,
            ),
          }
        : entry,
    ),
  };

  return detectPRs(history, projected).has(exercise.exerciseId);
}

function historicTopWeight(
  history: Workout[],
  currentWorkoutId: string,
  exerciseId: string,
): number | null {
  const weights = history
    .filter((workout) => workout.id !== currentWorkoutId)
    .flatMap((workout) =>
      workout.exercises.filter((exercise) => exercise.exerciseId === exerciseId),
    )
    .map(exerciseTopWeight)
    .filter((weight) => weight > 0);

  return weights.length ? Math.max(...weights) : null;
}
