import { exerciseById } from '@/data/exercises';
import type { SetEntry, Workout } from '@/store/workouts';
import { hasValidSetPerformance } from '@/lib/workoutValidation';

const DAY_MS = 24 * 60 * 60 * 1000;

export type PerformanceMetric = 'weight' | 'reps' | 'duration';
export type PerformanceRange = '30d' | '90d' | 'all';

export interface ExercisePerformanceSession {
  workoutId: string;
  startedAt: string;
  ms: number;
  setCount: number;
  totalReps: number;
  topWeightKg: number;
  activeSeconds: number | null;
}

export interface ExercisePerformance {
  exerciseId: string;
  name: string;
  sessions: ExercisePerformanceSession[];
  latest: ExercisePerformanceSession;
  defaultMetric: PerformanceMetric;
}

export interface PerformanceTimelinePoint {
  workoutId: string;
  ms: number;
  value: number;
}

/**
 * Construye rendimiento real por ejercicio. Solo usa series efectivas completadas.
 * No estima máximos ni convierte señales distintas en una puntuación artificial.
 */
export function buildExercisePerformance(history: Workout[]): ExercisePerformance[] {
  const byExercise = new Map<
    string,
    { name: string; sessions: ExercisePerformanceSession[] }
  >();

  for (const workout of history) {
    const ms = Date.parse(workout.startedAt);
    if (!Number.isFinite(ms)) continue;

    const workoutGroups = new Map<string, { name: string; sets: SetEntry[] }>();
    for (const workoutExercise of workout.exercises) {
      const sets = workoutExercise.sets.filter(isValidWorkingSet);
      if (sets.length === 0) continue;
      const name =
        exerciseById(workoutExercise.exerciseId)?.name ??
        workoutExercise.exerciseName ??
        workoutExercise.exerciseId;
      const group = workoutGroups.get(workoutExercise.exerciseId);
      if (group) group.sets.push(...sets);
      else workoutGroups.set(workoutExercise.exerciseId, { name, sets });
    }

    for (const [exerciseId, group] of workoutGroups) {
      const session = summarizeSession(
        workout.id,
        workout.startedAt,
        ms,
        group.sets,
      );
      const existing = byExercise.get(exerciseId);
      if (existing) {
        existing.sessions.push(session);
      } else {
        byExercise.set(exerciseId, { name: group.name, sessions: [session] });
      }
    }
  }

  return [...byExercise.entries()]
    .map(([exerciseId, value]) => {
      const sessions = value.sessions.sort((a, b) => b.ms - a.ms);
      const latest = sessions[0];
      return {
        exerciseId,
        name: value.name,
        sessions,
        latest,
        defaultMetric: latest.topWeightKg > 0 ? ('weight' as const) : ('reps' as const),
      };
    })
    .sort((a, b) => b.latest.ms - a.latest.ms);
}

export function buildPerformanceTimeline(
  performance: ExercisePerformance,
  metric: PerformanceMetric,
  range: PerformanceRange,
  nowMs = Date.now(),
): PerformanceTimelinePoint[] {
  const cutoff =
    range === 'all'
      ? Number.NEGATIVE_INFINITY
      : nowMs - Number.parseInt(range, 10) * DAY_MS;

  return performance.sessions
    .filter((session) => session.ms >= cutoff && session.ms <= nowMs)
    .map((session) => ({
      workoutId: session.workoutId,
      ms: session.ms,
      value: performanceMetricValue(session, metric),
    }))
    .filter((point): point is PerformanceTimelinePoint => point.value !== null)
    .sort((a, b) => a.ms - b.ms);
}

export function performanceMetricValue(
  session: ExercisePerformanceSession,
  metric: PerformanceMetric,
): number | null {
  if (metric === 'weight') return session.topWeightKg > 0 ? session.topWeightKg : null;
  if (metric === 'duration') return session.activeSeconds;
  return session.totalReps;
}

export function resolvePerformanceMetric(
  performance: ExercisePerformance,
  preferred: PerformanceMetric | null,
): PerformanceMetric {
  const requested = preferred ?? performance.defaultMetric;
  return performance.sessions.some(
    (session) => performanceMetricValue(session, requested) !== null,
  )
    ? requested
    : performance.defaultMetric;
}

function summarizeSession(
  workoutId: string,
  startedAt: string,
  ms: number,
  sets: SetEntry[],
): ExercisePerformanceSession {
  let totalReps = 0;
  let topWeightKg = 0;
  let activeSeconds = 0;
  let hasDuration = false;

  for (const set of sets) {
    const weightKg = Math.max(0, set.weightKg);
    totalReps += set.reps;

    if (weightKg > topWeightKg) {
      topWeightKg = weightKg;
    }

    if (
      set.durationSeconds !== undefined &&
      Number.isFinite(set.durationSeconds) &&
      set.durationSeconds >= 0
    ) {
      activeSeconds += set.durationSeconds;
      hasDuration = true;
    }
  }

  return {
    workoutId,
    startedAt,
    ms,
    setCount: sets.length,
    totalReps,
    topWeightKg,
    activeSeconds: hasDuration ? activeSeconds : null,
  };
}

function isCompletedWorkingSet(set: SetEntry): boolean {
  return set.isCompleted === true && set.isWarmup !== true;
}

function isValidWorkingSet(set: SetEntry): boolean {
  return (
    isCompletedWorkingSet(set) &&
    hasValidSetPerformance(set)
  );
}
