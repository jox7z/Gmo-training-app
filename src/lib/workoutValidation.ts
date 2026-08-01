import type { SetEntry, Workout } from '@/store/workouts';

export const MIN_SET_REPS = 1;
export const MAX_SET_REPS = 999;
export const MIN_SET_WEIGHT_KG = 0;
export const MAX_SET_WEIGHT_KG = 1_000;

export interface WorkoutValidationResult {
  canFinish: boolean;
  completedWorkingSets: number;
  pendingSets: number;
  errors: string[];
  warnings: string[];
}

export function hasValidSetPerformance(
  set: Pick<SetEntry, 'reps' | 'weightKg'>,
): boolean {
  return (
    Number.isInteger(set.reps) &&
    set.reps >= MIN_SET_REPS &&
    set.reps <= MAX_SET_REPS &&
    Number.isFinite(set.weightKg) &&
    set.weightKg >= MIN_SET_WEIGHT_KG &&
    set.weightKg <= MAX_SET_WEIGHT_KG
  );
}

export function validateSetForCompletion(
  set: Pick<SetEntry, 'reps' | 'weightKg' | 'durationSeconds'>,
  label = 'Esta serie',
): string[] {
  const errors: string[] = [];
  if (
    !Number.isInteger(set.reps) ||
    set.reps < MIN_SET_REPS ||
    set.reps > MAX_SET_REPS
  ) {
    errors.push(
      `${label}: las repeticiones deben estar entre ${MIN_SET_REPS} y ${MAX_SET_REPS}.`,
    );
  }
  if (
    !Number.isFinite(set.weightKg) ||
    set.weightKg < MIN_SET_WEIGHT_KG ||
    set.weightKg > MAX_SET_WEIGHT_KG
  ) {
    errors.push(`${label}: revisa el peso registrado.`);
  }
  if (
    set.durationSeconds !== undefined &&
    (!Number.isFinite(set.durationSeconds) || set.durationSeconds < 0)
  ) {
    errors.push(`${label}: la duración no es válida.`);
  }
  return errors;
}

/**
 * Validación defensiva antes de mover una sesión al historial.
 *
 * Las series pendientes son válidas (el usuario puede terminar antes), pero
 * una serie marcada como completada nunca debe guardar repeticiones/peso
 * imposibles ni valores no finitos.
 */
export function validateWorkoutForFinish(workout: Workout): WorkoutValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let completedWorkingSets = 0;
  let pendingSets = 0;

  workout.exercises.forEach((exercise) => {
    exercise.sets.forEach((set, setIndex) => {
      if (!set.isCompleted) {
        pendingSets += 1;
        return;
      }

      const label = `${exercise.exerciseName}, serie ${setIndex + 1}`;
      errors.push(...validateSetForCompletion(set, label));
      if (!set.isWarmup) completedWorkingSets += 1;
    });
  });

  if (completedWorkingSets === 0) {
    errors.unshift('Completa al menos una serie de trabajo antes de terminar.');
  }
  if (pendingSets > 0) {
    warnings.push(
      `${pendingSets} ${pendingSets === 1 ? 'serie quedará pendiente' : 'series quedarán pendientes'}.`,
    );
  }

  return {
    canFinish: errors.length === 0,
    completedWorkingSets,
    pendingSets,
    errors,
    warnings,
  };
}
