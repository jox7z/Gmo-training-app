import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { type RankId } from '@/theme/tokens';
import {
  follow as followRepo,
  unfollow as unfollowRepo,
  listFollowing,
  listFollowers,
  isFollowing as isFollowingRepo,
  type FollowProfile,
} from '@/lib/repos/social';
import { listUserPosts, type FeedPage } from '@/lib/repos/posts';
import { profileCountersKey, type ProfileCounters } from '@/lib/queries/profile';

export const socialKeys = {
  followers: (userId: string) => ['followers', userId] as const,
  following: (userId: string) => ['following', userId] as const,
  isFollowing: (userId: string) => ['isFollowing', userId] as const,
  userPosts: (userId: string) => ['userPosts', userId] as const,
};

export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? socialKeys.following(userId) : ['following', 'noop'],
    queryFn: () => listFollowing(userId!),
    enabled: !!userId,
  });
}

export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? socialKeys.followers(userId) : ['followers', 'noop'],
    queryFn: () => listFollowers(userId!),
    enabled: !!userId,
  });
}

export function useIsFollowing(targetUserId: string | undefined) {
  return useQuery({
    queryKey: targetUserId ? socialKeys.isFollowing(targetUserId) : ['isFollowing', 'noop'],
    queryFn: () => isFollowingRepo(targetUserId!),
    enabled: !!targetUserId,
  });
}

type UserPostsCache = InfiniteData<FeedPage, string | undefined>;

export function useUserPosts(userId: string | undefined) {
  return useInfiniteQuery<
    FeedPage,
    Error,
    UserPostsCache,
    readonly ['userPosts', string],
    string | undefined
  >({
    queryKey: userId ? socialKeys.userPosts(userId) : (['userPosts', 'noop'] as const),
    queryFn: ({ pageParam }) => listUserPosts(userId!, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
  });
}

interface FollowMutationContext {
  myId: string | null;
  targetPrev?: ProfileCounters;
  mePrev?: ProfileCounters;
  isFollowingPrev?: boolean;
}

async function getMyId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function applyCounterDelta(
  prev: ProfileCounters | undefined,
  field: keyof ProfileCounters,
  delta: number,
): ProfileCounters | undefined {
  if (!prev) return prev;
  return { ...prev, [field]: Math.max(0, prev[field] + delta) };
}

function patchIsFollowing(
  list: FollowProfile[] | undefined,
  targetId: string,
  value: boolean,
): FollowProfile[] | undefined {
  if (!list) return list;
  return list.map((p) => (p.id === targetId ? { ...p, isFollowing: value } : p));
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation<void, Error, string, FollowMutationContext>({
    mutationFn: (targetUserId) => followRepo(targetUserId),
    onMutate: async (targetUserId) => {
      const myId = await getMyId();
      const targetKey = [...profileCountersKey, targetUserId] as const;
      const meKey = myId ? ([...profileCountersKey, myId] as const) : null;
      const isFollowingKey = socialKeys.isFollowing(targetUserId);

      await qc.cancelQueries({ queryKey: targetKey });
      if (meKey) await qc.cancelQueries({ queryKey: meKey });
      await qc.cancelQueries({ queryKey: isFollowingKey });

      const targetPrev = qc.getQueryData<ProfileCounters>(targetKey);
      const mePrev = meKey ? qc.getQueryData<ProfileCounters>(meKey) : undefined;
      const isFollowingPrev = qc.getQueryData<boolean>(isFollowingKey);

      // Bump followers counter on target profile
      const targetNext = applyCounterDelta(targetPrev, 'followers', +1);
      if (targetNext) qc.setQueryData<ProfileCounters>(targetKey, targetNext);

      // Bump following counter on my profile
      if (meKey) {
        const meNext = applyCounterDelta(mePrev, 'following', +1);
        if (meNext) qc.setQueryData<ProfileCounters>(meKey, meNext);
      }

      // Mark isFollowing true immediately
      qc.setQueryData<boolean>(isFollowingKey, true);

      // Patch isFollowing flag in any cached followers/following lists
      qc.setQueriesData<FollowProfile[]>(
        { queryKey: ['followers'] },
        (old) => patchIsFollowing(old, targetUserId, true),
      );
      qc.setQueriesData<FollowProfile[]>(
        { queryKey: ['following'] },
        (old) => patchIsFollowing(old, targetUserId, true),
      );

      return { myId, targetPrev, mePrev, isFollowingPrev };
    },
    onError: (_err, targetUserId, ctx) => {
      if (!ctx) return;
      const targetKey = [...profileCountersKey, targetUserId] as const;
      if (ctx.targetPrev) qc.setQueryData(targetKey, ctx.targetPrev);
      if (ctx.myId && ctx.mePrev) {
        qc.setQueryData([...profileCountersKey, ctx.myId] as const, ctx.mePrev);
      }
      qc.setQueryData(socialKeys.isFollowing(targetUserId), ctx.isFollowingPrev);
      qc.invalidateQueries({ queryKey: profileCountersKey });
    },
    onSettled: (_data, _err, targetUserId) => {
      qc.invalidateQueries({ queryKey: socialKeys.isFollowing(targetUserId) });
      qc.invalidateQueries({ queryKey: profileCountersKey });
      qc.invalidateQueries({ queryKey: ['followers'] });
      qc.invalidateQueries({ queryKey: ['following'] });
      qc.invalidateQueries({ queryKey: ['discover'] });
      qc.invalidateQueries({ queryKey: ['feed', 'list'] });
      qc.invalidateQueries({ queryKey: ['search', 'users'] });
    },
  });
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string;
  currentRank: RankId;
  rankPoints: number;
  avatarUrl?: string;
}

export function useLeaderboard(rankId: RankId | undefined) {
  return useQuery({
    queryKey: ['leaderboard', rankId] as const,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, current_rank, rank_points, avatar_url')
        .eq('current_rank', rankId!)
        .order('rank_points', { ascending: false })
        .limit(20);
      if (error) throw error;
      return ((data ?? []) as any[]).map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        currentRank: row.current_rank as RankId,
        rankPoints: row.rank_points,
        avatarUrl: row.avatar_url ?? undefined,
      }));
    },
    enabled: !!rankId,
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  return useMutation<void, Error, string, FollowMutationContext>({
    mutationFn: (targetUserId) => unfollowRepo(targetUserId),
    onMutate: async (targetUserId) => {
      const myId = await getMyId();
      const targetKey = [...profileCountersKey, targetUserId] as const;
      const meKey = myId ? ([...profileCountersKey, myId] as const) : null;
      const isFollowingKey = socialKeys.isFollowing(targetUserId);

      await qc.cancelQueries({ queryKey: targetKey });
      if (meKey) await qc.cancelQueries({ queryKey: meKey });
      await qc.cancelQueries({ queryKey: isFollowingKey });

      const targetPrev = qc.getQueryData<ProfileCounters>(targetKey);
      const mePrev = meKey ? qc.getQueryData<ProfileCounters>(meKey) : undefined;
      const isFollowingPrev = qc.getQueryData<boolean>(isFollowingKey);

      // Decrement followers counter on target profile
      const targetNext = applyCounterDelta(targetPrev, 'followers', -1);
      if (targetNext) qc.setQueryData<ProfileCounters>(targetKey, targetNext);

      // Decrement following counter on my profile
      if (meKey) {
        const meNext = applyCounterDelta(mePrev, 'following', -1);
        if (meNext) qc.setQueryData<ProfileCounters>(meKey, meNext);
      }

      // Mark isFollowing false immediately
      qc.setQueryData<boolean>(isFollowingKey, false);

      // Patch isFollowing flag in any cached followers/following lists
      qc.setQueriesData<FollowProfile[]>(
        { queryKey: ['followers'] },
        (old) => patchIsFollowing(old, targetUserId, false),
      );
      qc.setQueriesData<FollowProfile[]>(
        { queryKey: ['following'] },
        (old) => patchIsFollowing(old, targetUserId, false),
      );

      return { myId, targetPrev, mePrev, isFollowingPrev };
    },
    onError: (_err, targetUserId, ctx) => {
      if (!ctx) return;
      const targetKey = [...profileCountersKey, targetUserId] as const;
      if (ctx.targetPrev) qc.setQueryData(targetKey, ctx.targetPrev);
      if (ctx.myId && ctx.mePrev) {
        qc.setQueryData([...profileCountersKey, ctx.myId] as const, ctx.mePrev);
      }
      qc.setQueryData(socialKeys.isFollowing(targetUserId), ctx.isFollowingPrev);
      qc.invalidateQueries({ queryKey: profileCountersKey });
    },
    onSettled: (_data, _err, targetUserId) => {
      qc.invalidateQueries({ queryKey: socialKeys.isFollowing(targetUserId) });
      qc.invalidateQueries({ queryKey: profileCountersKey });
      qc.invalidateQueries({ queryKey: ['followers'] });
      qc.invalidateQueries({ queryKey: ['following'] });
      qc.invalidateQueries({ queryKey: ['discover'] });
      qc.invalidateQueries({ queryKey: ['feed', 'list'] });
      qc.invalidateQueries({ queryKey: ['search', 'users'] });
    },
  });
}
