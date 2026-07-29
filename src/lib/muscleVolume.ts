import {
  EXERCISES,
  type Exercise,
  type MuscleGroup,
} from '@/data/exercises';
import type { Routine } from '@/store/routines';
import type { Workout } from '@/store/workouts';
import { hasValidSetPerformance } from '@/lib/workoutValidation';

export type VolumeMuscleGroup = Exclude<MuscleGroup, 'full_body'>;

export type MuscleVolumeZone =
  | 'none'
  | 'minimal'
  | 'effective'
  | 'productive'
  | 'very_high';

export const MUSCLE_VOLUME_ZONE_LABELS: Record<MuscleVolumeZone, string> = {
  none: '0 series',
  minimal: '0.5–4.5',
  effective: '5–9.5',
  productive: '10–20',
  very_high: 'Más de 20',
};

export const MUSCLE_VOLUME_GROUPS: readonly VolumeMuscleGroup[] = [
  'chest',
  'back',
  'front_delt',
  'lateral_delt',
  'rear_delt',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];

export interface ExerciseVolumeContribution {
  exerciseId: string;
  exerciseName: string;
  /** Series equivalentes aportadas a este músculo, en pasos de 0.5. */
  equivalentSets: number;
  /** Días de rutina o sesiones completadas donde aportó al músculo. */
  frequency: number;
}

export interface MuscleVolumeResult {
  muscle: VolumeMuscleGroup;
  /** Series equivalentes totales, en pasos de 0.5. */
  totalSets: number;
  /** Días de rutina o sesiones completadas con aporte al músculo. */
  frequency: number;
  zone: MuscleVolumeZone;
  exercises: ExerciseVolumeContribution[];
}

export type MuscleContributionOverrides = Partial<
  Record<VolumeMuscleGroup, number>
>;

export interface MuscleVolumeOptions {
  /**
   * Ajustes por id de ejercicio. Cada clave presente reemplaza el valor del
   * catálogo o el valor derivado. Los valores se normalizan a pasos de 0.5.
   */
  contributionOverrides?: Readonly<
    Record<string, MuscleContributionOverrides>
  >;
}

interface ExerciseAccumulator {
  exerciseId: string;
  exerciseName: string;
  equivalentSets: number;
  occurrences: Set<string>;
}

interface MuscleAccumulator {
  totalSets: number;
  occurrences: Set<string>;
  exercises: Map<string, ExerciseAccumulator>;
}

type RoutineVolumeInput = Pick<Routine, 'days'>;

const EXERCISES_BY_ID = new Map(
  EXERCISES.map((exercise) => [exercise.id, exercise] as const),
);

/** Mantiene el contrato público en incrementos de media serie. */
export function normalizeEquivalentSets(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 2) / 2;
}

export function classifyMuscleVolume(totalSets: number): MuscleVolumeZone {
  const normalized = normalizeEquivalentSets(totalSets);
  if (normalized === 0) return 'none';
  if (normalized < 5) return 'minimal';
  if (normalized < 10) return 'effective';
  if (normalized <= 20) return 'productive';
  return 'very_high';
}

export function calculatePlannedMuscleVolume(
  routine: RoutineVolumeInput,
  options: MuscleVolumeOptions = {},
): MuscleVolumeResult[] {
  const accumulator = createAccumulator();

  for (const day of routine.days) {
    for (const plannedExercise of day.exercises) {
      const exercise = EXERCISES_BY_ID.get(plannedExercise.exerciseId);
      const setCount = validPlannedSetCount(plannedExercise.targetSets);
      if (!exercise || setCount === 0) continue;

      addExerciseVolume(
        accumulator,
        exercise,
        setCount,
        day.id,
        options.contributionOverrides?.[exercise.id],
      );
    }
  }

  return finishAccumulator(accumulator);
}

export function calculateCompletedMuscleVolume(
  history: readonly Workout[],
  options: MuscleVolumeOptions = {},
): MuscleVolumeResult[] {
  const accumulator = createAccumulator();

  for (const workout of history) {
    for (const workoutExercise of workout.exercises) {
      const exercise = EXERCISES_BY_ID.get(workoutExercise.exerciseId);
      if (!exercise) continue;

      const setCount = workoutExercise.sets.filter(
        (set) =>
          set.isCompleted === true &&
          set.isWarmup !== true &&
          hasValidSetPerformance(set),
      ).length;
      if (setCount === 0) continue;

      addExerciseVolume(
        accumulator,
        exercise,
        setCount,
        workout.id,
        options.contributionOverrides?.[exercise.id],
      );
    }
  }

  return finishAccumulator(accumulator);
}

function validPlannedSetCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

function createAccumulator(): Map<VolumeMuscleGroup, MuscleAccumulator> {
  return new Map(
    MUSCLE_VOLUME_GROUPS.map((muscle) => [
      muscle,
      {
        totalSets: 0,
        occurrences: new Set<string>(),
        exercises: new Map<string, ExerciseAccumulator>(),
      },
    ]),
  );
}

function contributionWeights(
  exercise: Exercise,
  overrides?: MuscleContributionOverrides,
): Map<VolumeMuscleGroup, number> {
  const weights = new Map<VolumeMuscleGroup, number>();

  if (exercise.muscle !== 'full_body') {
    weights.set(exercise.muscle, 1);
  }
  for (const secondary of exercise.secondary ?? []) {
    if (secondary !== 'full_body') weights.set(secondary, 0.5);
  }

  const catalogOverrides = exercise.volumeContributions;
  if (catalogOverrides) {
    for (const muscle of MUSCLE_VOLUME_GROUPS) {
      if (catalogOverrides[muscle] !== undefined) {
        weights.set(
          muscle,
          normalizeEquivalentSets(catalogOverrides[muscle] ?? 0),
        );
      }
    }
  }

  if (overrides) {
    for (const muscle of MUSCLE_VOLUME_GROUPS) {
      if (overrides[muscle] !== undefined) {
        weights.set(
          muscle,
          normalizeEquivalentSets(overrides[muscle] ?? 0),
        );
      }
    }
  }

  return weights;
}

function addExerciseVolume(
  accumulator: Map<VolumeMuscleGroup, MuscleAccumulator>,
  exercise: Exercise,
  setCount: number,
  occurrenceId: string,
  overrides?: MuscleContributionOverrides,
) {
  for (const [muscle, weight] of contributionWeights(exercise, overrides)) {
    if (weight <= 0) continue;

    const contribution = normalizeEquivalentSets(setCount * weight);
    if (contribution === 0) continue;

    const muscleAccumulator = accumulator.get(muscle);
    if (!muscleAccumulator) continue;

    muscleAccumulator.totalSets += contribution;
    muscleAccumulator.occurrences.add(occurrenceId);

    const existingExercise = muscleAccumulator.exercises.get(exercise.id);
    if (existingExercise) {
      existingExercise.equivalentSets += contribution;
      existingExercise.occurrences.add(occurrenceId);
    } else {
      muscleAccumulator.exercises.set(exercise.id, {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        equivalentSets: contribution,
        occurrences: new Set([occurrenceId]),
      });
    }
  }
}

function finishAccumulator(
  accumulator: Map<VolumeMuscleGroup, MuscleAccumulator>,
): MuscleVolumeResult[] {
  return MUSCLE_VOLUME_GROUPS.map((muscle) => {
    const value = accumulator.get(muscle);
    const totalSets = normalizeEquivalentSets(value?.totalSets ?? 0);
    const exercises = [...(value?.exercises.values() ?? [])]
      .map((exercise) => ({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        equivalentSets: normalizeEquivalentSets(exercise.equivalentSets),
        frequency: exercise.occurrences.size,
      }))
      .sort(
        (a, b) =>
          b.equivalentSets - a.equivalentSets ||
          a.exerciseName.localeCompare(b.exerciseName, 'es'),
      );

    return {
      muscle,
      totalSets,
      frequency: value?.occurrences.size ?? 0,
      zone: classifyMuscleVolume(totalSets),
      exercises,
    };
  });
}
