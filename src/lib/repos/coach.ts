import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface CoachUsage {
  used: number;
  limit: number;
}

/**
 * Calls the `ai_usage_remaining` RPC and returns the usage counters.
 * Returns null when Supabase is not configured (offline/dev mode).
 */
export async function getCoachUsage(): Promise<CoachUsage | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc('ai_usage_remaining');
  if (error) throw error;

  // RPC returns an array of rows; take the first.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    used: (row as { used: number; limit: number }).used ?? 0,
    limit: (row as { used: number; limit: number }).limit ?? 30,
  };
}
