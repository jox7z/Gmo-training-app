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
      ai_reasoning: r.aiReasoning ?? null,
      is_public: r.isPublic ?? false,
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
          superset_group_id: ex.supersetGroupId ?? null,
        },
        { onConflict: 'id' },
      );

      if (eErr) throw eErr;
    }
  }
}

// Mapea una fila de `routines` (con embed routine_days → routine_day_exercises)
// al shape de dominio `Routine`. Único punto de mapeo snake_case→camelCase para
// que getRoutines y getPublicRoutineDetail no diverjan.
function mapRoutineRow(row: any): Routine {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    splitType: row.split_type,
    isAiGenerated: row.is_ai_generated,
    aiReasoning: row.ai_reasoning ?? undefined,
    isPublic: row.is_public ?? undefined,
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
            supersetGroupId: ex.superset_group_id ?? undefined,
          })),
      })),
  };
}

export async function getRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select(`*, routine_days ( *, routine_day_exercises (*) )`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapRoutineRow);
}

export async function deleteRoutineRemote(routineId: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', routineId);
  if (error) throw error;
}

// =====================================================
// Rutinas públicas (solo lectura, RLS `routines read own or public`)
// =====================================================

export interface PublicRoutineSummary {
  id: string;
  name: string;
  description?: string;
  splitType: string;
  dayCount: number;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatarUrl?: string;
  createdAt: string;
}

// Lista rutinas marcadas is_public=true con el dueño embebido vía el FK
// routines.user_id -> profiles.id. `!inner` descarta rutinas huérfanas de perfil.
export async function listPublicRoutines(limit = 30): Promise<PublicRoutineSummary[]> {
  const { data, error } = await supabase
    .from('routines')
    .select(
      `id, name, description, split_type, created_at,
       routine_days ( id ),
       profiles!inner ( username, display_name, avatar_url )`,
    )
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const owner = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      splitType: row.split_type,
      dayCount: Array.isArray(row.routine_days) ? row.routine_days.length : 0,
      ownerUsername: owner?.username ?? '',
      ownerDisplayName: owner?.display_name ?? '',
      ownerAvatarUrl: owner?.avatar_url ?? undefined,
      createdAt: row.created_at,
    };
  });
}

// Detalle de una rutina pública. Reusa la misma query que getRoutines pero por
// id, y verifica is_public en el resultado: si no es pública o no existe,
// devuelve null (un "no encontrado" legítimo, no un error).
export async function getPublicRoutineDetail(routineId: string): Promise<Routine | null> {
  const { data, error } = await supabase
    .from('routines')
    .select(`*, routine_days ( *, routine_day_exercises (*) )`)
    .eq('id', routineId)
    .maybeSingle();

  if (error) throw error;
  if (!data || (data as any).is_public !== true) return null;
  return mapRoutineRow(data);
}
