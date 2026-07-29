import { supabase } from '@/lib/supabase';
import { Workout } from '@/store/workouts';
import { exerciseById } from '@/data/exercises';
import { normalizeWorkoutVisibility } from '@/lib/workoutVisibility';

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
  visibility?: string | null;
  workout_exercises: DbWorkoutExerciseRow[];
}

interface DbWorkoutExerciseRow {
  id: string;
  exercise_id: string;
  position: number;
  superset_group_id: string | null;
  group_rest_enabled: boolean;
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

const syncQueues = new Map<string, Promise<void>>();

/**
 * Envía el snapshot completo a una sola transacción en Postgres. El RPC valida
 * auth.uid(), serializa por workout y reconstruye todo el árbol hijo.
 */
async function reconcileWorkoutRows(w: Workout): Promise<void> {
  const snapshot = (includeSupersets: boolean) => ({
      started_at: w.startedAt,
      ended_at: w.endedAt ?? null,
      duration_seconds: w.durationSeconds ?? null,
      total_reps: w.totalReps,
      total_rest_seconds: w.totalRestSeconds,
      total_active_seconds: w.totalActiveSeconds,
      feeling: w.feeling ?? null,
      is_published: w.isPublished ?? false,
      exercises: w.exercises.map((ex) => ({
        exercise_id: ex.exerciseId,
        ...(includeSupersets && ex.supersetGroupId
          ? { superset_group_id: ex.supersetGroupId }
          : {}),
        ...(includeSupersets && typeof ex.groupRestEnabled === 'boolean'
          ? { group_rest_enabled: ex.groupRestEnabled }
          : {}),
        sets: ex.sets.map((s) => ({
          reps: s.reps,
          weight_kg: s.weightKg,
          rpe: s.rpe ?? null,
          is_warmup: s.isWarmup ?? false,
          is_completed: s.isCompleted,
          duration_seconds: s.durationSeconds ?? null,
          rest_after_seconds: s.restAfterSeconds ?? null,
        })),
      })),
    });

  const { error } = await supabase.rpc('sync_workout_snapshot', {
    p_workout_id: w.id,
    p_snapshot: snapshot(true),
  });

  if (!error) return;

  const legacyRpcRejectsSupersets =
    (error as { code?: string; message?: string }).code === '22023' &&
    (error as { message?: string }).message?.includes('unsupported fields');
  if (!legacyRpcRejectsSupersets) throw error;

  // Live conserva atomicidad 0041–0046, pero aún no acepta metadata de grupos.
  // Reintentar sin esos campos mantiene el workout completo y deja el grouping
  // como estado local hasta desplegar 0051 tras reconciliar el ledger.
  const { error: legacyError } = await supabase.rpc('sync_workout_snapshot', {
    p_workout_id: w.id,
    p_snapshot: snapshot(false),
  });
  if (legacyError) throw legacyError;
}

function queueWorkoutSync(_userId: string, w: Workout): Promise<void> {
  const previous = syncQueues.get(w.id) ?? Promise.resolve();
  const next = previous
    .catch(() => {
      // Un intento fallido no bloquea la reconciliación siguiente.
    })
    .then(() => reconcileWorkoutRows(w));

  syncQueues.set(w.id, next);
  void next
    .finally(() => {
      if (syncQueues.get(w.id) === next) syncQueues.delete(w.id);
    })
    .catch(() => {
      // El caller recibe el rechazo de `next`; este catch solo cierra `finally`.
    });
  return next;
}

export function saveWorkout(userId: string, w: Workout): Promise<void> {
  return queueWorkoutSync(userId, w);
}

/**
 * Reconciliación idempotente antes de publicar o reintentar una sesión.
 */
export function ensureWorkoutSynced(userId: string, w: Workout): Promise<void> {
  return queueWorkoutSync(userId, w);
}

export async function getWorkouts(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      `*, workout_exercises ( id, exercise_id, position, superset_group_id, group_rest_enabled, workout_sets ( id, set_index, reps, weight_kg, rpe, is_warmup, is_completed, duration_seconds, rest_after_seconds ) )`,
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
    visibility: normalizeWorkoutVisibility(row.visibility),
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
          groupRestEnabled: ex.group_rest_enabled || undefined,
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
