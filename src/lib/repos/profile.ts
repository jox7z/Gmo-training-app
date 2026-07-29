import { supabase } from '@/lib/supabase';
import {
  UserProfile,
  Sex,
  type Goal,
  isGoal,
  normalizeSecondaryGoals,
} from '@/store/app';
import {
  DEFAULT_WORKOUT_VISIBILITY,
  normalizeWorkoutVisibility,
  type WorkoutVisibility,
} from '@/lib/workoutVisibility';
import { resolveUserRank } from '@/lib/rankMilestone';

interface DbProfile {
  id: string;
  email?: string | null;
  username: string;
  display_name: string;
  weight_kg: number | null;
  height_cm: number | null;
  unit_preference: 'kg' | 'lb';
  default_workout_visibility?: WorkoutVisibility | null;
  experience_level: string;
  goal: string;
  goals?: string[] | null;
  /** Compatibilidad con el contrato repo-only retirado. */
  secondary_goals?: string[] | null;
  current_rank: string;
  rank_points: number;
  weekly_goal_days: number;
  sex: 'male' | 'female';
  instagram_username?: string | null;
  instagram_verified?: boolean | null;
}

function toApp(row: DbProfile): UserProfile {
  const goal = isGoal(row.goal) ? row.goal : 'hypertrophy';
  return {
    id: row.id,
    email: row.email ?? undefined,
    username: row.username,
    displayName: row.display_name,
    fullName: '',
    bio: '',
    location: '',
    country: '',
    followers: 0,
    following: 0,
    sex: (row.sex ?? 'male') as Sex,
    weightKg: row.weight_kg ?? 75,
    heightCm: row.height_cm ?? 175,
    unit: row.unit_preference,
    defaultWorkoutVisibility: normalizeWorkoutVisibility(
      row.default_workout_visibility,
      DEFAULT_WORKOUT_VISIBILITY,
    ),
    level: row.experience_level as UserProfile['level'],
    goal,
    secondaryGoals: normalizeSecondaryGoals(
      goal,
      row.goals?.slice(1) ?? row.secondary_goals,
    ),
    secondaryGoalsSyncPending: false,
    currentRank: resolveUserRank(row.current_rank, row.rank_points),
    rankPoints: row.rank_points,
    weeklyGoalDays: row.weekly_goal_days,
    instagramUsername: row.instagram_username ?? undefined,
    instagramVerified: row.instagram_verified ?? false,
  };
}

function toDb(p: UserProfile): DbProfile {
  return {
    id: p.id,
    // NOTE: la tabla `profiles` desplegada no tiene columna `email` (el email
    // vive en auth.users). Enviarlo provocaba un 400 en el upsert y el falso
    // error "No pudimos guardar tu perfil" al terminar el onboarding.
    username: p.username,
    display_name: p.displayName,
    sex: p.sex,
    weight_kg: p.weightKg,
    height_cm: p.heightCm,
    unit_preference: p.unit,
    experience_level: p.level,
    goal: p.goal,
    current_rank: p.currentRank,
    rank_points: p.rankPoints,
    weekly_goal_days: p.weeklyGoalDays,
    instagram_username: p.instagramUsername ?? null,
    // `goals` se guarda mediante updateProfileGoals() o complete_signup().
    // Mantenerlo fuera del upsert general evita que una edición ordinaria del
    // perfil reemplace accidentalmente prioridades ya persistidas.
    // NOTE: instagram_verified, instagram_user_id e instagram_linked_at NO se
    // envían en toDb(): el trigger protect_instagram_verification los protege,
    // pero mantener el payload limpio evita que un objeto UserProfile obsoleto
    // degradee accidentalmente la verificación en un upsert ordinario.
    // (Mismo patrón que `email`, que vive en auth.users y no en profiles.)
  };
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  // maybeSingle: distingue "no existe fila" (data=null, sin error) de un error
  // real de red/permiso (error != null). Es clave para que _layout solo cierre
  // sesión cuando el perfil REALMENTE no existe, y no ante un fallo transitorio.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toApp(data as DbProfile);
}

export async function upsertProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(toDb(profile), { onConflict: 'id' });

  if (error) throw error;
}

export interface UpdateProfileGoalsResult {
  /** false = servidor legacy; solo se persistió el objetivo principal. */
  secondaryGoalsPersisted: boolean;
}

function isMissingGoalsColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  return (
    (code === '42703' || code === 'PGRST204') &&
    message.includes('goals')
  );
}

/**
 * Guarda el objetivo principal como goals[0] y las prioridades restantes en el
 * array `profiles.goals` desplegado. Un servidor legacy conserva `goal`.
 */
export async function updateProfileGoals(
  userId: string,
  goal: Goal,
  secondaryGoals: readonly Goal[],
): Promise<UpdateProfileGoalsResult> {
  const normalizedSecondaryGoals = normalizeSecondaryGoals(goal, secondaryGoals);
  const goals = [goal, ...normalizedSecondaryGoals];
  const { data, error } = await supabase
    .from('profiles')
    .update({
      goal,
      goals,
    })
    .eq('id', userId)
    .select('id')
    .maybeSingle();

  if (!error) {
    if (!data) throw new Error('No se encontró el perfil que se intentó actualizar.');
    return { secondaryGoalsPersisted: true };
  }
  if (!isMissingGoalsColumn(error)) throw error;

  const { data: legacyData, error: legacyError } = await supabase
    .from('profiles')
    .update({ goal })
    .eq('id', userId)
    .select('id')
    .maybeSingle();

  if (legacyError) throw legacyError;
  if (!legacyData) throw new Error('No se encontró el perfil que se intentó actualizar.');
  return { secondaryGoalsPersisted: false };
}

export async function updateDefaultWorkoutVisibility(
  userId: string,
  visibility: WorkoutVisibility,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ default_workout_visibility: visibility })
    .eq('id', userId);

  if (error) throw error;
}
