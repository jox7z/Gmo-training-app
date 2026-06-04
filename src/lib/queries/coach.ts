import { useQuery } from '@tanstack/react-query';
import { getCoachUsage, type CoachUsage } from '@/lib/repos/coach';
import { isSupabaseConfigured } from '@/lib/supabase';

export const coachKeys = {
  usage: ['coachUsage'] as const,
};

/**
 * Returns the rolling-hour AI usage counters for the current user.
 * Disabled when Supabase is not configured.
 */
export function useCoachUsage() {
  return useQuery<CoachUsage | null>({
    queryKey: coachKeys.usage,
    queryFn: getCoachUsage,
    enabled: isSupabaseConfigured,
    staleTime: 30_000,
  });
}
