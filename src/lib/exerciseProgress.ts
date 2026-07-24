import { Workout } from '@/store/workouts';
import { exerciseTopWeight } from '@/lib/workoutCompare';
import { exerciseById } from '@/data/exercises';

export type ExercisePeriod = '7d' | '30d' | '90d' | 'all';

export interface ExerciseProgressPoint {
  date: string;
  topWeightKg: number;
  repsAtTop: number;
}

export interface TrainedExercise {
  exerciseId: string;
  name: string;
  sessions: number;
  lastDate: string;
}

function periodCutoff(period: ExercisePeriod): number {
  if (period === 'all') return 0;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return Date.now() - days * 24 * 3600 * 1000;
}

/**
 * Builds one data point per session that contains `exerciseId`, ordered
 * ascending by startedAt. topWeightKg = max weight of completed non-warmup
 * sets; repsAtTop = reps of that set.
 */
export function buildExerciseTimeline(
  history: Workout[],
  exerciseId: string,
  period: ExercisePeriod,
): ExerciseProgressPoint[] {
  const cutoff = periodCutoff(period);

  const relevant = history
    .filter((w) => {
      if (new Date(w.startedAt).getTime() < cutoff) return false;
      return w.exercises.some((ex) => ex.exerciseId === exerciseId);
    })
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  return relevant
    .map((w) => {
      const ex = w.exercises.find((e) => e.exerciseId === exerciseId)!;
      const completed = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
      const topWeight = exerciseTopWeight(ex);
      const topSet = completed.find((s) => s.weightKg === topWeight);
      return {
        date: w.startedAt.slice(0, 10),
        topWeightKg: topWeight,
        repsAtTop: topSet?.reps ?? 0,
      };
    })
    // Skip sessions with no completed working sets (warmup-only / incomplete):
    // they would otherwise draw a misleading dip to 0 in the chart.
    .filter((p) => p.topWeightKg > 0);
}

/**
 * Returns all exercises present in the history, ordered by recency then
 * frequency.
 */
export function listTrainedExercises(history: Workout[]): TrainedExercise[] {
  const map = new Map<string, { sessions: number; lastDate: string }>();

  for (const w of history) {
    for (const ex of w.exercises) {
      const existing = map.get(ex.exerciseId);
      const date = w.startedAt.slice(0, 10);
      if (!existing) {
        map.set(ex.exerciseId, { sessions: 1, lastDate: date });
      } else {
        map.set(ex.exerciseId, {
          sessions: existing.sessions + 1,
          lastDate: date > existing.lastDate ? date : existing.lastDate,
        });
      }
    }
  }

  return [...map.entries()]
    .map(([exerciseId, { sessions, lastDate }]) => ({
      exerciseId,
      name: exerciseById(exerciseId)?.name ?? exerciseId,
      sessions,
      lastDate,
    }))
    .sort((a, b) => {
      // Primary: most recent; secondary: most frequent
      if (b.lastDate !== a.lastDate) return b.lastDate.localeCompare(a.lastDate);
      return b.sessions - a.sessions;
    });
}
