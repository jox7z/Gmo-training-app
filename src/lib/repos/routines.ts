import { supabase } from '@/lib/supabase';
import { Routine } from '@/store/routines';

export async function saveRoutine(userId: string, r: Routine): Promise<void> {
  const { error: rErr } = await supabase.from('routines').upsert(
    {
      id: r.id,
      user_id: userId,
      name: r.name,
      description: r.description ?? null,
      split_type: r.splitType,
      is_ai_generated: r.isAiGenerated ?? false,
    },
    { onConflict: 'id' },
  );

  if (rErr) throw rErr;

  for (let di = 0; di < r.days.length; di++) {
    const day = r.days[di];

    const { error: dErr } = await supabase.from('routine_days').upsert(
      { id: day.id, routine_id: r.id, day_index: di, name: day.name, notes: day.notes ?? null },
      { onConflict: 'id' },
    );

    if (dErr) throw dErr;

    for (let ei = 0; ei < day.exercises.length; ei++) {
      const ex = day.exercises[ei];

      const { error: eErr } = await supabase.from('routine_day_exercises').upsert(
        {
          id: ex.id,
          routine_day_id: day.id,
          exercise_id: ex.exerciseId,
          position: ei,
          target_sets: ex.targetSets,
          target_reps_min: ex.targetRepsMin,
          target_reps_max: ex.targetRepsMax,
          target_rir: ex.targetRir ?? null,
          rest_seconds: ex.restSeconds,
        },
        { onConflict: 'id' },
      );

      if (eErr) throw eErr;
    }
  }
}

export async function getRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select(`*, routine_days ( *, routine_day_exercises (*) )`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    splitType: row.split_type,
    isAiGenerated: row.is_ai_generated,
    createdAt: row.created_at,
    days: (row.routine_days as any[])
      .sort((a: any, b: any) => a.day_index - b.day_index)
      .map((day: any) => ({
        id: day.id,
        name: day.name,
        notes: day.notes ?? undefined,
        exercises: (day.routine_day_exercises as any[])
          .sort((a: any, b: any) => a.position - b.position)
          .map((ex: any) => ({
            id: ex.id,
            exerciseId: ex.exercise_id,
            targetSets: ex.target_sets,
            targetRepsMin: ex.target_reps_min,
            targetRepsMax: ex.target_reps_max,
            targetRir: ex.target_rir ?? undefined,
            restSeconds: ex.rest_seconds,
          })),
      })),
  }));
}

export async function deleteRoutineRemote(routineId: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', routineId);
  if (error) throw error;
}
