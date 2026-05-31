import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/store/app';

interface DbProfile {
  id: string;
  email?: string | null;
  username: string;
  display_name: string;
  weight_kg: number | null;
  height_cm: number | null;
  unit_preference: 'kg' | 'lb';
  experience_level: string;
  goal: string;
  current_rank: string;
  rank_points: number;
  weekly_goal_days: number;
}

function toApp(row: DbProfile): UserProfile {
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
    weightKg: row.weight_kg ?? 75,
    heightCm: row.height_cm ?? 175,
    unit: row.unit_preference,
    level: row.experience_level as UserProfile['level'],
    goal: row.goal as UserProfile['goal'],
    currentRank: row.current_rank as UserProfile['currentRank'],
    rankPoints: row.rank_points,
    weeklyGoalDays: row.weekly_goal_days,
    privacy: { profilePublic: true, showActivity: true, showStats: true },
    notifications: { workoutReminders: true, socialUpdates: true, achievements: true, weeklyReport: true },
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
    weight_kg: p.weightKg,
    height_cm: p.heightCm,
    unit_preference: p.unit,
    experience_level: p.level,
    goal: p.goal,
    current_rank: p.currentRank,
    rank_points: p.rankPoints,
    weekly_goal_days: p.weeklyGoalDays,
  };
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return toApp(data as DbProfile);
}

export async function upsertProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(toDb(profile), { onConflict: 'id' });

  if (error) throw error;
}
