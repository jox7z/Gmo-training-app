import { supabase } from '@/lib/supabase';
import { Workout } from '@/store/workouts';
import { exerciseById } from '@/data/exercises';

export async function saveWorkout(userId: string, w: Workout): Promise<void> {
  const { data: wRow, error: wErr } = await supabase
    .from('workouts')
    .insert({
      id: w.id,
      user_id: userId,
      routine_day_id: w.routineDayId ?? null,
      started_at: w.startedAt,
      ended_at: w.endedAt ?? null,
      duration_seconds: w.durationSeconds ?? null,
      total_volume_kg: w.totalVolumeKg,
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
      .insert({ workout_id: wRow.id, exercise_id: ex.exerciseId, position: i })
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
    }));

    if (sets.length > 0) {
      const { error: sErr } = await supabase.from('workout_sets').insert(sets);
      if (sErr) throw sErr;
    }
  }
}

export async function getWorkouts(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `*, workout_exercises ( id, exercise_id, position, workout_sets ( id, set_index, reps, weight_kg, rpe, is_warmup, is_completed ) )`,
    )
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    routineDayId: row.routine_day_id ?? undefined,
    routineName: undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    totalVolumeKg: Number(row.total_volume_kg),
    feeling: row.feeling ?? undefined,
    isPublished: row.is_published,
    exercises: (row.workout_exercises as any[])
      .sort((a: any, b: any) => a.position - b.position)
      .map((ex: any) => {
        const exercise = exerciseById(ex.exercise_id);
        return {
          id: ex.id,
          exerciseId: ex.exercise_id,
          exerciseName: exercise?.name ?? ex.exercise_id,
          muscleGroup: exercise?.muscle ?? '',
          sets: (ex.workout_sets as any[])
            .sort((a: any, b: any) => a.set_index - b.set_index)
            .map((s: any) => ({
              id: s.id,
              reps: s.reps,
              weightKg: Number(s.weight_kg),
              rpe: s.rpe ?? undefined,
              isWarmup: s.is_warmup,
              isCompleted: s.is_completed,
            })),
        };
      }),
  }));
}
