import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import {
  listFeed,
  publishWorkout,
  publishPR,
  publishManualPost,
  publishStreak,
  listComments,
  addComment,
  deleteComment,
  incrementShare,
  toggleReaction,
  deletePost,
  type FeedPage,
  type Post,
  type Comment,
  type ReactionKind,
  type PublishPRParams,
} from '@/lib/repos/posts';
import { listDiscover } from '@/lib/repos/social';
import { profileCountersKey } from '@/lib/queries/profile';
import type { WorkoutVisibility } from '@/lib/workoutVisibility';

// Re-export social hooks from their new home so existing JSX imports
// (`@/lib/queries/feed`) keep working without changes.
export {
  useFollow,
  useUnfollow,
  useFollowing,
  useFollowers,
  useIsFollowing,
  useUserPosts,
} from '@/lib/queries/social';

export const feedKeys = {
  all: ['feed'] as const,
  list: () => ['feed', 'list'] as const,
  discover: () => ['discover'] as const,
  following: (userId: string) => ['following', userId] as const,
  followers: (userId: string) => ['followers', userId] as const,
  isFollowing: (userId: string) => ['isFollowing', userId] as const,
  comments: (postId: string) => ['comments', postId] as const,
};

type FeedCache = InfiniteData<FeedPage, string | undefined>;
type CacheSnapshot = [QueryKey, FeedCache | undefined];

function patchPostCaches(
  qc: QueryClient,
  updater: (data: FeedCache | undefined) => FeedCache | undefined,
): void {
  qc.setQueryData<FeedCache>(feedKeys.list(), updater);
  qc.setQueriesData<FeedCache>({ queryKey: ['userPosts'] }, updater);
}

function userPostsSnapshots(qc: QueryClient): CacheSnapshot[] {
  return qc.getQueriesData<FeedCache>({ queryKey: ['userPosts'] });
}

function restoreUserPosts(qc: QueryClient, snapshots: CacheSnapshot[]): void {
  for (const [key, data] of snapshots) {
    qc.setQueryData(key, data);
  }
}

export function useFeed() {
  return useInfiniteQuery<
    FeedPage,
    Error,
    FeedCache,
    readonly ['feed', 'list'],
    string | undefined
  >({
    queryKey: feedKeys.list(),
    queryFn: ({ pageParam }) => listFeed(pageParam),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.posts.length > 0 ? lastPage.nextCursor : undefined,
    // Override global staleTime so refetchOnWindowFocus (AppState active)
    // triggers a real refetch after 15 s of staleness.
    staleTime: 15_000,
  });
}

export function useDiscover(limit = 5) {
  return useQuery({
    queryKey: feedKeys.discover(),
    queryFn: () => listDiscover(limit),
  });
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: postId ? feedKeys.comments(postId) : ['comments', 'noop'],
    queryFn: () => listComments(postId!),
    enabled: !!postId,
  });
}

interface ToggleReactionVars {
  postId: string;
  reaction: ReactionKind;
}

interface ToggleReactionContext {
  previous?: FeedCache;
  previousUserPosts: CacheSnapshot[];
}

export function applyReactionToggle(
  data: FeedCache | undefined,
  postId: string,
  reaction: ReactionKind,
): FeedCache | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((p) => {
        if (p.id !== postId) return p;
        const had = p.myReactions[reaction];
        const delta = had ? -1 : 1;
        return {
          ...p,
          myReactions: { ...p.myReactions, [reaction]: !had },
          reactions: {
            ...p.reactions,
            [reaction]: Math.max(0, p.reactions[reaction] + delta),
          },
        };
      }),
    })),
  };
}

export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation<boolean, Error, ToggleReactionVars, ToggleReactionContext>({
    mutationFn: ({ postId, reaction }) => toggleReaction(postId, reaction),
    onMutate: async ({ postId, reaction }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: feedKeys.list() }),
        qc.cancelQueries({ queryKey: ['userPosts'] }),
      ]);
      const previous = qc.getQueryData<FeedCache>(feedKeys.list());
      const previousUserPosts = userPostsSnapshots(qc);
      patchPostCaches(
        qc,
        (old) => applyReactionToggle(old, postId, reaction),
      );
      return { previous, previousUserPosts };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(feedKeys.list(), ctx.previous);
      }
      if (ctx) restoreUserPosts(qc, ctx.previousUserPosts);
    },
    // No refetch inmediato: el update optimista ya refleja el toggle y el
    // RPC devuelve el mismo resultado. Invalidar con refetch activo
    // re-traía toda la lista infinita y reseteaba el scroll del FlashList.
    // Marcamos stale sin refetch; el próximo pull-to-refresh reconcilia.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: feedKeys.list(), refetchType: 'none' });
      qc.invalidateQueries({ queryKey: ['userPosts'], refetchType: 'none' });
      qc.invalidateQueries({ queryKey: ['userPosts'], refetchType: 'none' });
    },
  });
}

interface PublishWorkoutVars {
  workoutId: string;
  title: string;
  caption?: string;
  photoUrl?: string;
  visibility: WorkoutVisibility;
}

export function usePublishWorkout() {
  const qc = useQueryClient();
  return useMutation<string, Error, PublishWorkoutVars>({
    mutationFn: ({ workoutId, title, caption, photoUrl, visibility }) =>
      publishWorkout(workoutId, title, caption, photoUrl, visibility),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.list() });
      qc.invalidateQueries({ queryKey: profileCountersKey });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });
}

export function usePublishPR() {
  const qc = useQueryClient();
  return useMutation<string, Error, PublishPRParams>({
    mutationFn: (args) => publishPR(args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.list() });
      qc.invalidateQueries({ queryKey: profileCountersKey });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });
}

interface PublishManualPostVars {
  caption: string;
  photoUrl?: string;
}

export function usePublishManualPost() {
  const qc = useQueryClient();
  return useMutation<string, Error, PublishManualPostVars>({
    mutationFn: ({ caption, photoUrl }) => publishManualPost(caption, photoUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.list() });
      qc.invalidateQueries({ queryKey: profileCountersKey });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });
}

interface PublishStreakVars {
  caption?: string;
  photoUrl?: string;
}

export function usePublishStreak() {
  const qc = useQueryClient();
  return useMutation<string, Error, PublishStreakVars>({
    mutationFn: ({ caption, photoUrl }) => publishStreak(caption, photoUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.list() });
      qc.invalidateQueries({ queryKey: profileCountersKey });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (postId) => deletePost(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.list() });
      qc.invalidateQueries({ queryKey: profileCountersKey });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });
}

interface AddCommentVars {
  postId: string;
  body: string;
}

interface AddCommentContext {
  previous?: Comment[];
  tempId: string;
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation<string, Error, AddCommentVars, AddCommentContext>({
    mutationFn: ({ postId, body }) => addComment(postId, body),
    onMutate: async ({ postId, body }) => {
      await qc.cancelQueries({ queryKey: feedKeys.comments(postId) });
      const previous = qc.getQueryData<Comment[]>(feedKeys.comments(postId));
      const tempId = `temp-${Date.now()}`;
      const optimistic: Comment = {
        id: tempId,
        postId,
        userId: 'pending',
        user: { displayName: '', username: '', currentRank: 'bronze' },
        body,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<Comment[]>(feedKeys.comments(postId), (old) =>
        old ? [...old, optimistic] : [optimistic],
      );
      bumpCommentCount(qc, postId, +1);
      return { previous, tempId };
    },
    onError: (_err, { postId }, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(feedKeys.comments(postId), ctx.previous);
      }
      bumpCommentCount(qc, postId, -1);
    },
    onSettled: (_data, _err, { postId }) => {
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: feedKeys.list(), refetchType: 'none' });
      qc.invalidateQueries({ queryKey: ['userPosts'], refetchType: 'none' });
    },
  });
}

interface DeleteCommentVars {
  commentId: string;
  postId: string;
}

interface DeleteCommentContext {
  previous?: Comment[];
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteCommentVars, DeleteCommentContext>({
    mutationFn: ({ commentId }) => deleteComment(commentId),
    onMutate: async ({ commentId, postId }) => {
      await qc.cancelQueries({ queryKey: feedKeys.comments(postId) });
      const previous = qc.getQueryData<Comment[]>(feedKeys.comments(postId));
      qc.setQueryData<Comment[]>(feedKeys.comments(postId), (old) =>
        old ? old.filter((c) => c.id !== commentId) : old,
      );
      bumpCommentCount(qc, postId, -1);
      return { previous };
    },
    onError: (_err, { postId }, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(feedKeys.comments(postId), ctx.previous);
      }
      bumpCommentCount(qc, postId, +1);
    },
    onSettled: (_data, _err, { postId }) => {
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: feedKeys.list(), refetchType: 'none' });
      qc.invalidateQueries({ queryKey: ['userPosts'], refetchType: 'none' });
    },
  });
}

interface IncrementShareContext {
  previous?: FeedCache;
  previousUserPosts: CacheSnapshot[];
}

function bumpShareCount(
  data: FeedCache | undefined,
  postId: string,
  delta: number,
): FeedCache | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((p) =>
        p.id === postId ? { ...p, shareCount: Math.max(0, p.shareCount + delta) } : p,
      ),
    })),
  };
}

function bumpCommentCount(
  qc: QueryClient,
  postId: string,
  delta: number,
): void {
  patchPostCaches(qc, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        posts: page.posts.map((p) =>
          p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount + delta) } : p,
        ),
      })),
    };
  });
}

export function useIncrementShare() {
  const qc = useQueryClient();
  return useMutation<number, Error, string, IncrementShareContext>({
    mutationFn: (postId) => incrementShare(postId),
    onMutate: async (postId) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: feedKeys.list() }),
        qc.cancelQueries({ queryKey: ['userPosts'] }),
      ]);
      const previous = qc.getQueryData<FeedCache>(feedKeys.list());
      const previousUserPosts = userPostsSnapshots(qc);
      patchPostCaches(qc, (old) => bumpShareCount(old, postId, +1));
      return { previous, previousUserPosts };
    },
    onError: (_err, _postId, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(feedKeys.list(), ctx.previous);
      }
      if (ctx) restoreUserPosts(qc, ctx.previousUserPosts);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: feedKeys.list(), refetchType: 'none' });
      qc.invalidateQueries({ queryKey: ['userPosts'], refetchType: 'none' });
    },
  });
}

export type { Post, Comment, FeedPage, ReactionKind };
