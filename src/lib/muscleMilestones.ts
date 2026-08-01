import {
  ACHIEVEMENTS,
  type AchievementDef,
  type AchievementTier,
} from '@/lib/achievements';
import {
  exerciseById,
  MUSCLE_GROUP_LABELS,
  type MuscleGroup,
} from '@/data/exercises';
import { normalizeSearchText } from '@/lib/format';
import { hasValidSetPerformance } from '@/lib/workoutValidation';
import type { Workout } from '@/store/workouts';

export type MilestoneMuscle = Exclude<MuscleGroup, 'full_body'>;
export type MilestoneLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MuscleMilestoneFilter = 'all' | 'with' | 'without';

export const MILESTONE_LEVEL_LABELS = [
  'Sin registro',
  'Registrado',
  'Base',
  'Sólido',
  'Fuerte',
  'Potente',
  'Dominante',
  'Cumbre',
] as const;

export const MILESTONE_MUSCLES = [
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
] as const satisfies readonly MilestoneMuscle[];

export interface LiftMilestone {
  track: AchievementDef;
  exerciseId: string;
  exerciseName: string;
  topWeightKg: number;
  validSetCount: number;
  hasRecord: boolean;
  level: MilestoneLevel;
  levelLabel: (typeof MILESTONE_LEVEL_LABELS)[MilestoneLevel];
  currentTier: AchievementTier | null;
  nextTier: AchievementTier | null;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: readonly MuscleGroup[];
  evidence: LiftMilestoneEvidence | null;
}

export interface LiftMilestoneEvidence {
  workoutId: string;
  workoutName: string;
  workoutStartedAt: string;
  exerciseEntryId: string;
  setId: string;
  weightKg: number;
  reps: number;
}

export interface MuscleMilestoneContribution {
  exerciseId: string;
  exerciseName: string;
  role: 'primary' | 'secondary';
  /** Nivel factual del levantamiento antes de aplicar su rol muscular. */
  liftLevel: MilestoneLevel;
  /** Primario conserva nivel; secundario baja exactamente uno. */
  level: MilestoneLevel;
  levelLabel: (typeof MILESTONE_LEVEL_LABELS)[MilestoneLevel];
  topWeightKg: number;
  hasRecord: boolean;
  evidence: LiftMilestoneEvidence;
}

export interface MuscleMilestoneResult {
  muscle: MilestoneMuscle;
  muscleLabel: string;
  level: MilestoneLevel;
  levelLabel: (typeof MILESTONE_LEVEL_LABELS)[MilestoneLevel];
  contributions: MuscleMilestoneContribution[];
}

export interface MuscleMilestoneSummary {
  lifts: LiftMilestone[];
  muscles: MuscleMilestoneResult[];
}

const STRENGTH_TRACKS = ACHIEVEMENTS.filter(
  (track): track is AchievementDef & { exerciseId: string } =>
    track.category === 'strength' && typeof track.exerciseId === 'string',
);

function toLevel(value: number): MilestoneLevel {
  return Math.max(0, Math.min(7, Math.trunc(value))) as MilestoneLevel;
}

function liftMilestone(
  history: readonly Workout[],
  track: AchievementDef & { exerciseId: string },
): LiftMilestone | null {
  const exercise = exerciseById(track.exerciseId);
  if (!exercise) return null;

  let validSetCount = 0;
  let evidence: LiftMilestoneEvidence | null = null;

  for (const workout of history) {
    for (const entry of workout.exercises) {
      if (entry.exerciseId !== track.exerciseId) continue;

      for (const set of entry.sets) {
        if (
          set.isCompleted !== true ||
          set.isWarmup === true ||
          !hasValidSetPerformance(set)
        ) {
          continue;
        }
        validSetCount++;
        const candidate: LiftMilestoneEvidence = {
          workoutId: workout.id,
          workoutName: workout.routineName ?? 'Entrenamiento libre',
          workoutStartedAt: workout.startedAt,
          exerciseEntryId: entry.id,
          setId: set.id,
          weightKg: set.weightKg,
          reps: set.reps,
        };
        if (!evidence || compareEvidence(candidate, evidence) > 0) {
          evidence = candidate;
        }
      }
    }
  }

  const hasRecord = evidence !== null;
  const topWeightKg = evidence?.weightKg ?? 0;
  const unlocked = hasRecord
    ? track.tiers.filter((tier) => topWeightKg >= tier.threshold)
    : [];
  const level = toLevel(hasRecord ? unlocked.length + 1 : 0);

  return {
    track,
    exerciseId: track.exerciseId,
    exerciseName: exercise.name,
    topWeightKg,
    validSetCount,
    hasRecord,
    level,
    levelLabel: MILESTONE_LEVEL_LABELS[level],
    currentTier: unlocked.at(-1) ?? null,
    nextTier:
      track.tiers.find((tier) => topWeightKg < tier.threshold) ?? null,
    primaryMuscle: exercise.muscle,
    secondaryMuscles: exercise.secondary ?? [],
    evidence,
  };
}

function compareEvidence(
  left: LiftMilestoneEvidence,
  right: LiftMilestoneEvidence,
): number {
  if (left.weightKg !== right.weightKg) {
    return left.weightKg - right.weightKg;
  }
  if (left.reps !== right.reps) return left.reps - right.reps;

  const leftTime = Date.parse(left.workoutStartedAt);
  const rightTime = Date.parse(right.workoutStartedAt);
  const safeLeftTime = Number.isFinite(leftTime)
    ? leftTime
    : Number.NEGATIVE_INFINITY;
  const safeRightTime = Number.isFinite(rightTime)
    ? rightTime
    : Number.NEGATIVE_INFINITY;
  if (safeLeftTime !== safeRightTime) return safeLeftTime - safeRightTime;

  return [
    left.workoutId,
    left.exerciseEntryId,
    left.setId,
  ].join('\u0000').localeCompare(
    [right.workoutId, right.exerciseEntryId, right.setId].join('\u0000'),
  );
}

/**
 * Mapea los cuatro levantamientos de fuerza del catálogo de logros al cuerpo.
 *
 * El ejercicio conserva su nivel en el músculo primario. Cada músculo
 * secundario recibe un nivel menos. `full_body` nunca se pinta: peso muerto se
 * reparte únicamente entre sus secundarios explícitos del catálogo.
 */
export function buildMuscleMilestones(
  history: readonly Workout[],
): MuscleMilestoneSummary {
  const lifts = STRENGTH_TRACKS.map((track) =>
    liftMilestone(history, track),
  ).filter((lift): lift is LiftMilestone => lift !== null);
  const contributions = new Map<
    MilestoneMuscle,
    MuscleMilestoneContribution[]
  >(MILESTONE_MUSCLES.map((muscle) => [muscle, []]));

  const addContribution = (
    muscle: MuscleGroup,
    lift: LiftMilestone,
    role: MuscleMilestoneContribution['role'],
  ) => {
    if (muscle === 'full_body' || !lift.evidence) return;
    const level = toLevel(
      role === 'primary' ? lift.level : Math.max(0, lift.level - 1),
    );
    contributions.get(muscle)?.push({
      exerciseId: lift.exerciseId,
      exerciseName: lift.exerciseName,
      role,
      liftLevel: lift.level,
      level,
      levelLabel: MILESTONE_LEVEL_LABELS[level],
      topWeightKg: lift.topWeightKg,
      hasRecord: lift.hasRecord,
      evidence: lift.evidence,
    });
  };

  for (const lift of lifts) {
    addContribution(lift.primaryMuscle, lift, 'primary');
    for (const muscle of lift.secondaryMuscles) {
      addContribution(muscle, lift, 'secondary');
    }
  }

  const muscles = MILESTONE_MUSCLES.map((muscle) => {
    const sources = [...(contributions.get(muscle) ?? [])].sort(
      (a, b) =>
        b.level - a.level ||
        Number(b.role === 'primary') - Number(a.role === 'primary') ||
        a.exerciseName.localeCompare(b.exerciseName, 'es'),
    );
    const level = toLevel(
      sources.reduce((highest, source) => Math.max(highest, source.level), 0),
    );

    return {
      muscle,
      muscleLabel: MUSCLE_GROUP_LABELS[muscle],
      level,
      levelLabel: MILESTONE_LEVEL_LABELS[level],
      contributions: sources,
    } satisfies MuscleMilestoneResult;
  });

  return { lifts, muscles };
}

export function filterMuscleMilestones(
  results: readonly MuscleMilestoneResult[],
  filters: {
    query?: string;
    status?: MuscleMilestoneFilter;
  } = {},
): MuscleMilestoneResult[] {
  const query = normalizeSearchText(filters.query ?? '');
  const status = filters.status ?? 'all';

  return results.filter((result) => {
    const hasMilestone = result.level > 0;
    if (status === 'with' && !hasMilestone) return false;
    if (status === 'without' && hasMilestone) return false;
    if (!query) return true;

    return normalizeSearchText(
      [
        result.muscleLabel,
        ...result.contributions.map(
          (contribution) => contribution.exerciseName,
        ),
      ].join(' '),
    ).includes(query);
  });
}
