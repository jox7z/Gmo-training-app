import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const profileCountersKey = ['profileCounters'] as const;

export interface ProfileCounters {
  followers: number;
  following: number;
  posts: number;
}

export function useProfileCounters(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? [...profileCountersKey, userId] : [...profileCountersKey, 'noop'],
    queryFn: async (): Promise<ProfileCounters> => {
      const { data, error } = await supabase.rpc('profile_counters', {
        target_user_id: userId,
      });
      if (error) throw error;
      return data as ProfileCounters;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
