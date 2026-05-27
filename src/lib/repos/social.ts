import { supabase } from '@/lib/supabase';
import { RankId } from '@/theme/tokens';

export interface DiscoverAthlete {
  id: string;
  username: string;
  displayName: string;
  currentRank: RankId;
  rankPoints: number;
  weeklyGoalDays: number;
  isFollowing: boolean;
}

interface DbDiscoverRow {
  id: string;
  username: string;
  display_name: string;
  current_rank: string;
  rank_points: number;
  weekly_goal_days: number;
  is_following: boolean;
}

export interface FollowProfile {
  id: string;
  username: string;
  displayName: string;
  currentRank: RankId;
  /** Not returned by list_followers/list_following RPCs (0010). Defaults to 0. */
  rankPoints: number;
  isFollowing: boolean;
}

interface DbFollowRow {
  id: string;
  username: string;
  display_name: string;
  current_rank: string;
  rank_points: number;
  is_following: boolean;
}

function toDiscover(row: DbDiscoverRow): DiscoverAthlete {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    currentRank: row.current_rank as RankId,
    rankPoints: row.rank_points,
    weeklyGoalDays: row.weekly_goal_days,
    isFollowing: row.is_following,
  };
}

function toFollowProfile(row: DbFollowRow): FollowProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    currentRank: row.current_rank as RankId,
    rankPoints: row.rank_points ?? 0,
    isFollowing: row.is_following,
  };
}

export async function listDiscover(limit = 5): Promise<DiscoverAthlete[]> {
  const { data, error } = await supabase.rpc('discover_athletes', { lim: limit });
  if (error) throw error;
  return ((data ?? []) as DbDiscoverRow[]).map(toDiscover);
}

export async function follow(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc('follow_user', { target: targetUserId });
  if (error) throw error;
}

export async function unfollow(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc('unfollow_user', { target: targetUserId });
  if (error) throw error;
}

export async function listFollowing(userId: string): Promise<FollowProfile[]> {
  const { data, error } = await supabase.rpc('list_following', { target_user_id: userId });
  if (error) throw error;
  return ((data ?? []) as DbFollowRow[]).map(toFollowProfile);
}

export async function listFollowers(userId: string): Promise<FollowProfile[]> {
  const { data, error } = await supabase.rpc('list_followers', { target_user_id: userId });
  if (error) throw error;
  return ((data ?? []) as DbFollowRow[]).map(toFollowProfile);
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return false;

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', me)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
