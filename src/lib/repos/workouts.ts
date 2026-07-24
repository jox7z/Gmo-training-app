import { supabase } from '@/lib/supabase';
import { Workout } from '@/store/workouts';
import { exerciseById } from '@/data/exercises';

interface DbWorkoutRow {
  id: string;
  routine_day_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_reps: number | null;
  total_rest_seconds: number | null;
  total_active_seconds: number | null;
  feeling: Workout['feeling'] | null;
  is_published: boolean;
  workout_exercises: DbWorkoutExerciseRow[];
}

interface DbWorkoutExerciseRow {
  id: string;
  exercise_id: string;
  position: number;
  superset_group_id: string | null;
  workout_sets: DbWorkoutSetRow[];
}

interface DbWorkoutSetRow {
  id: string;
  set_index: number;
  reps: number;
  weight_kg: number | string;
  rpe: number | null;
  is_warmup: boolean;
  is_completed: boolean;
  duration_seconds: number | null;
  rest_after_seconds: number | null;
}

async function insertWorkoutRows(userId: string, w: Workout): Promise<void> {
  const { data: wRow, error: wErr } = await supabase
    .from('workouts')
    .insert({
      id: w.id,
      user_id: userId,
      routine_day_id: null,
      started_at: w.startedAt,
      ended_at: w.endedAt ?? null,
      duration_seconds: w.durationSeconds ?? null,
      total_reps: w.totalReps,
      total_rest_seconds: w.totalRestSeconds,
      total_active_seconds: w.totalActiveSeconds,
      feeling: w.feeling ?? null,
      is_published: w.isPublished ?? false,
    })
    .select('id')
    .single();

  if (wErr) throw wErr;

  for (let i = 0; i < w.exercises.length; i++) {
    const ex = w.exercises[i];

    const { data: exRow, error: exErr } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: wRow.id,
        exercise_id: ex.exerciseId,
        position: i,
        superset_group_id: ex.supersetGroupId ?? null,
      })
      .select('id')
      .single();

    if (exErr) throw exErr;

    const sets = ex.sets.map((s, j) => ({
      workout_exercise_id: exRow.id,
      set_index: j,
      reps: s.reps,
      weight_kg: s.weightKg,
      rpe: s.rpe ?? null,
      is_warmup: s.isWarmup ?? false,
      is_completed: s.isCompleted,
      duration_seconds: s.durationSeconds ?? null,
      rest_after_seconds: s.restAfterSeconds ?? null,
    }));

    if (sets.length > 0) {
      const { error: sErr } = await supabase.from('workout_sets').insert(sets);
      if (sErr) throw sErr;
    }
  }
}

export async function saveWorkout(userId: string, w: Workout): Promise<void> {
  try {
    return await insertWorkoutRows(userId, w);
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') return;
    throw err;
  }
}

/**
 * Idempotent: checks if the workout already exists in the DB before
 * inserting. Safe to call multiple times (e.g. before publishing).
 */
export async function ensureWorkoutSynced(userId: string, w: Workout): Promise<void> {
  const { data } = await supabase
    .from('workouts')
    .select('id')
    .eq('id', w.id)
    .maybeSingle();

  if (data) return;

  try {
    return await insertWorkoutRows(userId, w);
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') return;
    throw err;
  }
}

export async function getWorkouts(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `*, workout_exercises ( id, exercise_id, position, superset_group_id, workout_sets ( id, set_index, reps, weight_kg, rpe, is_warmup, is_completed, duration_seconds, rest_after_seconds ) )`,
    )
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return ((data ?? []) as DbWorkoutRow[]).map((row) => ({
    id: row.id,
    routineDayId: row.routine_day_id ?? undefined,
    routineName: undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    totalReps: row.total_reps ?? 0,
    totalRestSeconds: row.total_rest_seconds ?? 0,
    totalActiveSeconds: row.total_active_seconds ?? 0,
    feeling: row.feeling ?? undefined,
    isPublished: row.is_published,
    exercises: row.workout_exercises
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((ex) => {
        const exercise = exerciseById(ex.exercise_id);
        return {
          id: ex.id,
          exerciseId: ex.exercise_id,
          exerciseName: exercise?.name ?? ex.exercise_id,
          muscleGroup: exercise?.muscle ?? '',
          supersetGroupId: ex.superset_group_id ?? undefined,
          sets: ex.workout_sets
            .slice()
            .sort((a, b) => a.set_index - b.set_index)
            .map((s) => ({
              id: s.id,
              reps: s.reps,
              weightKg: Number(s.weight_kg),
              rpe: s.rpe ?? undefined,
              isWarmup: s.is_warmup,
              isCompleted: s.is_completed,
              durationSeconds: s.duration_seconds ?? undefined,
              restAfterSeconds: s.rest_after_seconds ?? undefined,
            })),
        };
      }),
  }));
}
