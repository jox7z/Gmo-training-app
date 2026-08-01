import {
  calculatePlannedMuscleVolume,
  type MuscleVolumeResult,
  type MuscleVolumeZone,
  type VolumeMuscleGroup,
} from '@/lib/muscleVolume';
import type { Routine } from '@/store/routines';

export type RoutineQualityLabel =
  | 'Muy baja'
  | 'Baja'
  | 'Media'
  | 'Alta'
  | 'Muy alta';

export type RoutineFunctionalRegion =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'quads'
  | 'posterior_chain'
  | 'calves'
  | 'core';

export interface RoutineQualityComponent {
  /** Resultado normalizado del componente, entre 0 y 100. */
  score: number;
  /** Peso porcentual del componente dentro del total. */
  weight: number;
  /** Puntos aportados al total de 100. */
  points: number;
}

export interface RoutineCoverageBreakdown extends RoutineQualityComponent {
  coveredRegions: RoutineFunctionalRegion[];
  totalRegions: number;
}

export interface RoutineMuscleBreakdown extends RoutineQualityComponent {
  assessedMuscles: number;
}

export interface RoutineStructureBreakdown extends RoutineQualityComponent {
  totalDays: number;
  nonEmptyDays: number;
  emptyDays: number;
  extremeDensityDays: number;
}

export interface RoutineQualityBreakdown {
  coverage: RoutineCoverageBreakdown;
  volume: RoutineMuscleBreakdown;
  frequency: RoutineMuscleBreakdown;
  structure: RoutineStructureBreakdown;
}

export interface RoutineQualityScore {
  score: number;
  label: RoutineQualityLabel;
  breakdown: RoutineQualityBreakdown;
}

const COMPONENT_WEIGHTS = {
  coverage: 35,
  volume: 30,
  frequency: 20,
  structure: 15,
} as const;

const FUNCTIONAL_REGIONS: Readonly<
  Record<RoutineFunctionalRegion, readonly VolumeMuscleGroup[]>
> = {
  chest: ['chest'],
  back: ['back'],
  shoulders: ['front_delt', 'lateral_delt', 'rear_delt'],
  arms: ['biceps', 'triceps'],
  quads: ['quads'],
  posterior_chain: ['hamstrings', 'glutes'],
  calves: ['calves'],
  core: ['core'],
};

const VOLUME_ZONE_SCORES: Readonly<Record<MuscleVolumeZone, number>> = {
  none: 0,
  minimal: 50,
  effective: 85,
  productive: 100,
  very_high: 40,
};

const MAX_STANDARD_DAYS = 7;
const MAX_STANDARD_EXERCISES_PER_DAY = 10;

export function computeRoutineQualityScore(
  routine: Pick<Routine, 'days'>,
): RoutineQualityScore {
  const volume = calculatePlannedMuscleVolume(routine);
  const coveredMuscles = volume.filter((item) => item.totalSets > 0);

  const coverage = coverageBreakdown(volume);
  const volumeScore = average(
    coveredMuscles.map((item) => VOLUME_ZONE_SCORES[item.zone]),
  );
  const frequencyScore = average(
    coveredMuscles.map((item) => scoreFrequency(item.frequency)),
  );
  const structure = structureBreakdown(routine.days);

  const breakdown: RoutineQualityBreakdown = {
    coverage: component(coverage.score, COMPONENT_WEIGHTS.coverage, {
      coveredRegions: coverage.coveredRegions,
      totalRegions: Object.keys(FUNCTIONAL_REGIONS).length,
    }),
    volume: component(volumeScore, COMPONENT_WEIGHTS.volume, {
      assessedMuscles: coveredMuscles.length,
    }),
    frequency: component(frequencyScore, COMPONENT_WEIGHTS.frequency, {
      assessedMuscles: coveredMuscles.length,
    }),
    structure: component(structure.score, COMPONENT_WEIGHTS.structure, {
      totalDays: routine.days.length,
      nonEmptyDays: structure.nonEmptyDays,
      emptyDays: structure.emptyDays,
      extremeDensityDays: structure.extremeDensityDays,
    }),
  };

  const score = Math.round(
    breakdown.coverage.points +
      breakdown.volume.points +
      breakdown.frequency.points +
      breakdown.structure.points,
  );

  return {
    score,
    label: labelForScore(score),
    breakdown,
  };
}

export function labelForScore(score: number): RoutineQualityLabel {
  const normalized = clamp(score, 0, 100);
  if (normalized < 20) return 'Muy baja';
  if (normalized < 40) return 'Baja';
  if (normalized < 60) return 'Media';
  if (normalized < 80) return 'Alta';
  return 'Muy alta';
}

function coverageBreakdown(volume: readonly MuscleVolumeResult[]): {
  score: number;
  coveredRegions: RoutineFunctionalRegion[];
} {
  const coveredMuscles = new Set(
    volume
      .filter((item) => item.totalSets > 0)
      .map((item) => item.muscle),
  );
  const coveredRegions = (
    Object.keys(FUNCTIONAL_REGIONS) as RoutineFunctionalRegion[]
  ).filter((region) =>
    FUNCTIONAL_REGIONS[region].some((muscle) => coveredMuscles.has(muscle)),
  );

  return {
    score: (coveredRegions.length / Object.keys(FUNCTIONAL_REGIONS).length) * 100,
    coveredRegions,
  };
}

function scoreFrequency(frequency: number): number {
  if (frequency <= 0) return 0;
  if (frequency === 1) return 55;
  if (frequency === 2) return 100;
  if (frequency === 3) return 85;
  return 70;
}

function structureBreakdown(days: Routine['days']): {
  score: number;
  nonEmptyDays: number;
  emptyDays: number;
  extremeDensityDays: number;
} {
  if (days.length === 0) {
    return {
      score: 0,
      nonEmptyDays: 0,
      emptyDays: 0,
      extremeDensityDays: 0,
    };
  }

  const exerciseCounts = days.map(
    (day) =>
      day.exercises.filter(
        (exercise) =>
          Number.isFinite(exercise.targetSets) && exercise.targetSets > 0,
      ).length,
  );
  const nonEmptyCounts = exerciseCounts.filter((count) => count > 0);
  const nonEmptyDays = nonEmptyCounts.length;
  const emptyDays = days.length - nonEmptyDays;
  const extremeDensityDays = nonEmptyCounts.filter(
    (count) => count > MAX_STANDARD_EXERCISES_PER_DAY,
  ).length;

  if (nonEmptyDays === 0) {
    return {
      score: 0,
      nonEmptyDays,
      emptyDays,
      extremeDensityDays,
    };
  }

  const nonEmptyScore = (nonEmptyDays / days.length) * 100;
  const dayCountScore =
    days.length <= MAX_STANDARD_DAYS
      ? 100
      : (MAX_STANDARD_DAYS / days.length) * 100;
  const densityScore = average(
    nonEmptyCounts.map((count) =>
      count <= MAX_STANDARD_EXERCISES_PER_DAY
        ? 100
        : (MAX_STANDARD_EXERCISES_PER_DAY / count) * 100,
    ),
  );

  return {
    score: nonEmptyScore * 0.5 + dayCountScore * 0.2 + densityScore * 0.3,
    nonEmptyDays,
    emptyDays,
    extremeDensityDays,
  };
}

function component<T extends object>(
  score: number,
  weight: number,
  details: T,
): RoutineQualityComponent & T {
  const normalizedScore = roundToOne(clamp(score, 0, 100));
  return {
    score: normalizedScore,
    weight,
    points: roundToOne((normalizedScore * weight) / 100),
    ...details,
  };
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}
