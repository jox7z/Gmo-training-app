import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RankId } from '@/theme/tokens';

export interface SearchUserResult {
  id: string;
  username: string;
  displayName: string;
  currentRank: RankId;
  rankPoints: number;
  followersCount: number;
  isFollowing: boolean;
  instagramUsername?: string | null;
}

interface DbSearchUserRow {
  id: string;
  username: string;
  display_name: string;
  current_rank: string;
  rank_points: number;
  followers_count: number;
  is_following: boolean;
  instagram_username?: string | null;
}

function toResult(row: DbSearchUserRow): SearchUserResult {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    currentRank: row.current_rank as RankId,
    rankPoints: row.rank_points,
    followersCount: row.followers_count,
    isFollowing: row.is_following,
    instagramUsername: row.instagram_username ?? null,
  };
}

export function useSearchUsers(query: string) {
  const normalized = query.toLowerCase().trim();
  return useQuery({
    queryKey: ['search', 'users', normalized] as const,
    queryFn: async (): Promise<SearchUserResult[]> => {
      const { data, error } = await supabase.rpc('search_users', {
        query: normalized,
        lim: 20,
      });
      if (error) throw error;
      return ((data ?? []) as DbSearchUserRow[]).map(toResult);
    },
    enabled: normalized.length >= 2,
    staleTime: 30_000,
  });
}
