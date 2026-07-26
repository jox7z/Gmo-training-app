import { exerciseById } from '@/data/exercises';
import type { Workout } from '@/store/workouts';
import { hasValidSetPerformance } from '@/lib/workoutValidation';

export interface WorkoutPostExerciseMetadata {
  exerciseId?: string;
  name: string;
  muscleGroup?: string;
  workingSetCount?: number;
  totalReps?: number;
  /** Trabajo externo registrado. Unidad: kg·rep. */
  volumeKg?: number;
}

export interface WorkoutPostPrMetadata {
  exerciseId?: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
}

export interface WorkoutPostMetadata {
  exerciseCount?: number;
  durationSeconds?: number;
  workingSetCount?: number;
  totalReps?: number;
  /** Trabajo externo registrado. Unidad: kg·rep. */
  volumeKg?: number;
  /** Grupos primarios, ordenados por cantidad de series efectivas. */
  muscleGroups: string[];
  exercises: WorkoutPostExerciseMetadata[];
  prs: WorkoutPostPrMetadata[];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function optionalNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  const number = optionalNonNegativeNumber(value);
  return number !== undefined && Number.isInteger(number) ? number : undefined;
}

function roundWork(value: number): number {
  return Math.round(value * 100) / 100;
}

function workoutDurationSeconds(workout: Workout): number | undefined {
  if (
    typeof workout.durationSeconds === 'number' &&
    Number.isFinite(workout.durationSeconds) &&
    workout.durationSeconds >= 0
  ) {
    return Math.floor(workout.durationSeconds);
  }

  if (!workout.endedAt) return undefined;
  const startedAt = new Date(workout.startedAt).getTime();
  const endedAt = new Date(workout.endedAt).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
    return undefined;
  }
  return Math.floor((endedAt - startedAt) / 1000);
}

/**
 * Construye las métricas sociales desde la sesión local.
 *
 * Solo entran series efectivas completadas con reps/peso dentro de los mismos
 * límites usados al finalizar y sincronizar un workout.
 */
export function buildWorkoutPostMetadata(workout: Workout): WorkoutPostMetadata {
  const exercises: WorkoutPostExerciseMetadata[] = [];
  const muscleTotals = new Map<string, { sets: number; firstPosition: number }>();
  let workingSetCount = 0;
  let totalReps = 0;
  let volumeKg = 0;

  workout.exercises.forEach((workoutExercise, position) => {
    const sets = workoutExercise.sets.filter(
      (set) => set.isCompleted && !set.isWarmup && hasValidSetPerformance(set),
    );
    if (sets.length === 0) return;

    const exercise = exerciseById(workoutExercise.exerciseId);
    const muscleGroup = exercise?.muscle ?? optionalString(workoutExercise.muscleGroup);
    const exerciseReps = sets.reduce((sum, set) => sum + set.reps, 0);
    const exerciseVolumeKg = roundWork(
      sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0),
    );

    exercises.push({
      exerciseId: workoutExercise.exerciseId,
      name: exercise?.name ?? workoutExercise.exerciseName,
      muscleGroup,
      workingSetCount: sets.length,
      totalReps: exerciseReps,
      volumeKg: exerciseVolumeKg,
    });
    workingSetCount += sets.length;
    totalReps += exerciseReps;
    volumeKg += exerciseVolumeKg;

    if (muscleGroup) {
      const current = muscleTotals.get(muscleGroup);
      muscleTotals.set(muscleGroup, {
        sets: (current?.sets ?? 0) + sets.length,
        firstPosition: current?.firstPosition ?? position,
      });
    }
  });

  const muscleGroups = [...muscleTotals.entries()]
    .sort(([, a], [, b]) => b.sets - a.sets || a.firstPosition - b.firstPosition)
    .map(([muscle]) => muscle);

  return {
    exerciseCount: exercises.length,
    durationSeconds: workoutDurationSeconds(workout),
    workingSetCount,
    totalReps,
    volumeKg: roundWork(volumeKg),
    muscleGroups,
    exercises,
    prs: [],
  };
}

function parseExercise(value: unknown): WorkoutPostExerciseMetadata | undefined {
  if (typeof value === 'string') {
    const name = optionalString(value);
    return name ? { name } : undefined;
  }
  if (!isRecord(value)) return undefined;

  const name = optionalString(value.name);
  if (!name) return undefined;
  return {
    exerciseId: optionalString(value.exercise_id),
    name,
    muscleGroup: optionalString(value.muscle_group),
    workingSetCount: optionalNonNegativeInteger(value.working_set_count),
    totalReps: optionalNonNegativeInteger(value.total_reps),
    volumeKg: optionalNonNegativeNumber(value.volume_kg),
  };
}

function parsePr(value: unknown): WorkoutPostPrMetadata | undefined {
  if (!isRecord(value)) return undefined;
  const exerciseName = optionalString(value.exercise_name);
  const weightKg = optionalNonNegativeNumber(value.weight_kg);
  const reps = optionalNonNegativeInteger(value.reps);
  if (!exerciseName || weightKg === undefined || weightKg > 1_000) return undefined;
  if (reps === undefined || reps < 1 || reps > 999) return undefined;
  return {
    exerciseId: optionalString(value.exercise_id),
    exerciseName,
    weightKg,
    reps,
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((item) => {
    const normalized = optionalString(item);
    if (normalized) unique.add(normalized);
  });
  return [...unique];
}

/**
 * Normaliza metadata remota y mantiene lectura de posts anteriores a las
 * métricas completas (`duration_min` y `muscle_group`).
 */
export function parseWorkoutPostMetadata(metadata: unknown): WorkoutPostMetadata {
  if (!isRecord(metadata)) {
    return { muscleGroups: [], exercises: [], prs: [] };
  }

  const durationSeconds = optionalNonNegativeInteger(metadata.duration_seconds);
  const legacyDurationMinutes = optionalNonNegativeInteger(metadata.duration_min);
  const legacyMuscle = optionalString(metadata.muscle_group);
  const muscleGroups = stringList(metadata.muscle_groups);
  if (muscleGroups.length === 0 && legacyMuscle) muscleGroups.push(legacyMuscle);

  return {
    exerciseCount: optionalNonNegativeInteger(metadata.exercise_count),
    durationSeconds:
      durationSeconds ??
      (legacyDurationMinutes !== undefined ? legacyDurationMinutes * 60 : undefined),
    workingSetCount: optionalNonNegativeInteger(metadata.working_set_count),
    totalReps: optionalNonNegativeInteger(metadata.total_reps),
    volumeKg: optionalNonNegativeNumber(metadata.volume_kg),
    muscleGroups,
    exercises: Array.isArray(metadata.exercises)
      ? metadata.exercises.flatMap((item) => {
          const exercise = parseExercise(item);
          return exercise ? [exercise] : [];
        })
      : [],
    prs: Array.isArray(metadata.prs)
      ? metadata.prs.flatMap((item) => {
          const pr = parsePr(item);
          return pr ? [pr] : [];
        })
      : [],
  };
}
