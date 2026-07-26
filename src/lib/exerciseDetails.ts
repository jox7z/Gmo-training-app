import type { SetEntry, Workout } from '@/store/workouts';
import { hasValidSetPerformance } from '@/lib/workoutValidation';

export interface ExerciseSessionDetail {
  workoutId: string;
  startedAt: string;
  setCount: number;
  totalReps: number;
  volumeKg: number;
  bestWeightKg: number;
  bestWeightReps: number;
  bestSetReps: number;
  activeSeconds: number | null;
}

export interface ExerciseRecord {
  weightKg: number;
  reps: number;
  startedAt: string;
}

export interface ExerciseDetails {
  sessions: ExerciseSessionDetail[];
  sessionCount: number;
  workingSetCount: number;
  totalReps: number;
  maxWeight: ExerciseRecord | null;
  maxReps: ExerciseRecord | null;
  maxRepsSession: ExerciseSessionDetail | null;
  maxActiveSession: ExerciseSessionDetail | null;
}

export type ExerciseTrendMetric = 'weight' | 'reps';

function isWorkingSet(set: SetEntry) {
  return (
    set.isCompleted &&
    !set.isWarmup &&
    hasValidSetPerformance(set)
  );
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function exerciseTrendMetric(
  sessions: ExerciseSessionDetail[],
  limit = 7,
): ExerciseTrendMetric {
  const recent = sessions.slice(0, limit);
  return recent.length > 0 && recent.every((session) => session.bestWeightKg > 0)
    ? 'weight'
    : 'reps';
}

export function buildExerciseDetails(
  history: Workout[],
  exerciseId: string,
): ExerciseDetails {
  const sessions: ExerciseSessionDetail[] = [];
  let workingSetCount = 0;
  let totalReps = 0;
  let maxWeight: ExerciseDetails['maxWeight'] = null;
  let maxReps: ExerciseDetails['maxReps'] = null;

  for (const workout of history) {
    const exerciseEntries = workout.exercises.filter(
      (entry) => entry.exerciseId === exerciseId,
    );
    const sets = exerciseEntries.flatMap((entry) =>
      entry.sets.filter(isWorkingSet),
    );
    if (sets.length === 0) continue;

    let sessionReps = 0;
    let sessionVolumeKg = 0;
    let sessionBestWeightKg = 0;
    let sessionBestWeightReps = 0;
    let sessionBestSetReps = 0;
    let sessionActiveSeconds = 0;
    let hasDuration = false;

    for (const set of sets) {
      const record = {
        weightKg: set.weightKg,
        reps: set.reps,
        startedAt: workout.startedAt,
      };

      sessionReps += set.reps;
      sessionVolumeKg += set.weightKg * set.reps;
      sessionBestSetReps = Math.max(sessionBestSetReps, set.reps);
      workingSetCount += 1;
      totalReps += set.reps;

      if (
        set.weightKg > sessionBestWeightKg ||
        (set.weightKg === sessionBestWeightKg && set.reps > sessionBestWeightReps)
      ) {
        sessionBestWeightKg = set.weightKg;
        sessionBestWeightReps = set.reps;
      }

      if (
        maxWeight === null ||
        set.weightKg > maxWeight.weightKg ||
        (set.weightKg === maxWeight.weightKg && set.reps > maxWeight.reps)
      ) {
        maxWeight = record;
      }

      if (
        maxReps === null ||
        set.reps > maxReps.reps ||
        (set.reps === maxReps.reps && set.weightKg > maxReps.weightKg)
      ) {
        maxReps = record;
      }

      if (
        set.durationSeconds !== undefined &&
        Number.isFinite(set.durationSeconds) &&
        set.durationSeconds >= 0
      ) {
        sessionActiveSeconds += set.durationSeconds;
        hasDuration = true;
      }
    }

    sessions.push({
      workoutId: workout.id,
      startedAt: workout.startedAt,
      setCount: sets.length,
      totalReps: sessionReps,
      volumeKg: sessionVolumeKg,
      bestWeightKg: sessionBestWeightKg,
      bestWeightReps: sessionBestWeightReps,
      bestSetReps: sessionBestSetReps,
      activeSeconds: hasDuration ? sessionActiveSeconds : null,
    });
  }

  sessions.sort((a, b) => timestamp(b.startedAt) - timestamp(a.startedAt));

  return {
    sessions,
    sessionCount: sessions.length,
    workingSetCount,
    totalReps,
    maxWeight,
    maxReps,
    maxRepsSession: maxSession(sessions, (session) => session.totalReps),
    maxActiveSession: maxSession(
      sessions.filter((session) => session.activeSeconds !== null),
      (session) => session.activeSeconds ?? 0,
    ),
  };
}

function maxSession(
  sessions: ExerciseSessionDetail[],
  value: (session: ExerciseSessionDetail) => number,
): ExerciseSessionDetail | null {
  let best: ExerciseSessionDetail | null = null;
  for (const session of sessions) {
    if (
      best === null ||
      value(session) > value(best) ||
      (value(session) === value(best) &&
        timestamp(session.startedAt) > timestamp(best.startedAt))
    ) {
      best = session;
    }
  }
  return best;
}
