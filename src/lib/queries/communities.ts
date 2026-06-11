import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  listCommunities,
  getCommunity,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunityMembers,
  setMemberRole,
  removeMember,
  approveMember,
  rejectMember,
  type Community,
  type CommunityFilter,
  type CreateCommunityParams,
  type UpdateCommunityParams,
  type CommunityMember,
} from '@/lib/repos/communities';
import { listCommunityFeed, publishManualPost, type FeedPage } from '@/lib/repos/posts';
import { listCommunityEvents, type CommunityEvent } from '@/lib/repos/events';

// ─── Query key factory ────────────────────────────────────────

export const communityKeys = {
  all:     ['communities'] as const,
  list:    (filter: CommunityFilter, search?: string) =>
             ['communities', 'list', filter, search ?? ''] as const,
  detail:  (id: string) => ['communities', 'detail', id] as const,
  members: (id: string) => ['communities', 'members', id] as const,
  feed:    (id: string) => ['communities', 'feed', id] as const,
  events:  (id: string) => ['communities', 'events', id] as const,
};

// ─── Queries ──────────────────────────────────────────────────

export function useCommunities(filter: CommunityFilter = 'all', search?: string) {
  return useQuery({
    queryKey: communityKeys.list(filter, search),
    queryFn:  () => listCommunities(filter, search),
    staleTime: 30_000,
  });
}

/**
 * Detail. Cache-first: busca en cualquier lista cacheada antes de ir a red.
 * Mismo patrón que useEvent.
 */
export function useCommunity(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: id
      ? communityKeys.detail(id)
      : (['communities', 'detail', 'noop'] as const),
    queryFn: async (): Promise<Community | undefined> => {
      // Buscar en listas ya cargadas
      const cached = qc.getQueriesData<Community[]>({ queryKey: ['communities', 'list'] });
      for (const [, list] of cached) {
        const hit = list?.find((c) => c.id === id);
        if (hit) return hit;
      }
      return getCommunity(id!);
    },
    enabled: !!id,
  });
}

export function useCommunityMembers(id: string | undefined) {
  return useQuery({
    queryKey: id ? communityKeys.members(id) : ['communities', 'members', 'noop'],
    queryFn:  () => listCommunityMembers(id!),
    enabled:  !!id,
  });
}

// ─── Create / Update / Delete ─────────────────────────────────

export function useCreateCommunity() {
  const qc = useQueryClient();
  return useMutation<string, Error, CreateCommunityParams>({
    mutationFn: (params) => createCommunity(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useUpdateCommunity() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateCommunityParams>({
    mutationFn: (params) => updateCommunity(params),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: communityKeys.all });
      qc.setQueryData<Community | undefined>(
        communityKeys.detail(vars.id),
        (old) =>
          old
            ? {
                ...old,
                name:        vars.name        ?? old.name,
                description: vars.description ?? old.description,
                coverUrl:    vars.coverUrl    ?? old.coverUrl,
                isPrivate:   vars.isPrivate   ?? old.isPrivate,
              }
            : old,
      );
    },
  });
}

export function useDeleteCommunity() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCommunity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

// ─── Join / Leave (optimistic for public, no optimism for private) ────────────

interface ToggleJoinVars {
  communityId: string;
  /** true = joining, false = leaving */
  joining: boolean;
  isPrivate: boolean;
}

function patchCommunityJoin(
  list: Community[] | undefined,
  id: string,
  joining: boolean,
): Community[] | undefined {
  if (!list) return list;
  return list.map((c) =>
    c.id === id
      ? {
          ...c,
          isMember:    joining,
          myStatus:    joining ? 'active' : undefined,
          memberCount: Math.max(0, c.memberCount + (joining ? 1 : -1)),
        }
      : c,
  );
}

export function useToggleJoinCommunity() {
  const qc = useQueryClient();
  return useMutation<
    string | void,
    Error,
    ToggleJoinVars,
    { snapshots: [readonly unknown[], Community[]][] }
  >({
    mutationFn: ({ communityId, joining }) =>
      joining ? joinCommunity(communityId) : leaveCommunity(communityId),

    onMutate: async ({ communityId, joining, isPrivate }) => {
      // Optimistic only for public joins/leaves
      if (isPrivate && joining) return { snapshots: [] };

      await qc.cancelQueries({ queryKey: communityKeys.all });
      const snapshots = qc.getQueriesData<Community[]>({ queryKey: ['communities', 'list'] });
      for (const [key, data] of snapshots) {
        qc.setQueryData<Community[]>(key, patchCommunityJoin(data, communityId, joining));
      }
      return { snapshots: snapshots as [readonly unknown[], Community[]][] };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSettled: (_data, _err, { communityId }) => {
      qc.invalidateQueries({ queryKey: ['communities', 'list'] });
      qc.invalidateQueries({ queryKey: communityKeys.detail(communityId) });
    },
  });
}

// ─── Member management ────────────────────────────────────────

interface MemberActionVars {
  communityId: string;
  userId: string;
}

interface SetRoleVars extends MemberActionVars {
  role: 'moderator' | 'member';
}

export function useApproveMember() {
  const qc = useQueryClient();
  return useMutation<void, Error, MemberActionVars>({
    mutationFn: ({ communityId, userId }) => approveMember(communityId, userId),
    onSuccess: (_data, { communityId }) => {
      qc.invalidateQueries({ queryKey: communityKeys.members(communityId) });
      qc.invalidateQueries({ queryKey: communityKeys.detail(communityId) });
    },
  });
}

export function useRejectMember() {
  const qc = useQueryClient();
  return useMutation<void, Error, MemberActionVars>({
    mutationFn: ({ communityId, userId }) => rejectMember(communityId, userId),
    onSuccess: (_data, { communityId }) => {
      qc.invalidateQueries({ queryKey: communityKeys.members(communityId) });
    },
  });
}

export function useSetMemberRole() {
  const qc = useQueryClient();
  return useMutation<void, Error, SetRoleVars>({
    mutationFn: ({ communityId, userId, role }) => setMemberRole(communityId, userId, role),
    onSuccess: (_data, { communityId }) => {
      qc.invalidateQueries({ queryKey: communityKeys.members(communityId) });
      qc.invalidateQueries({ queryKey: communityKeys.detail(communityId) });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation<void, Error, MemberActionVars>({
    mutationFn: ({ communityId, userId }) => removeMember(communityId, userId),
    onSuccess: (_data, { communityId }) => {
      qc.invalidateQueries({ queryKey: communityKeys.members(communityId) });
      qc.invalidateQueries({ queryKey: communityKeys.detail(communityId) });
    },
  });
}

// ─── Community feed ───────────────────────────────────────────

type CommunityFeedCache = InfiniteData<FeedPage, string | undefined>;

export function useCommunityFeed(communityId: string | undefined) {
  return useInfiniteQuery<
    FeedPage,
    Error,
    CommunityFeedCache,
    readonly ['communities', 'feed', string],
    string | undefined
  >({
    queryKey: communityKeys.feed(communityId ?? ''),
    queryFn: ({ pageParam }) => listCommunityFeed(communityId!, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.posts.length > 0 ? lastPage.nextCursor : undefined,
    enabled: !!communityId,
    staleTime: 15_000,
  });
}

// ─── Community events ─────────────────────────────────────────

export function useCommunityEvents(communityId: string | undefined) {
  return useQuery<CommunityEvent[]>({
    queryKey: communityId ? communityKeys.events(communityId) : ['communities', 'events', 'noop'],
    queryFn: () => listCommunityEvents(communityId!),
    enabled: !!communityId,
    staleTime: 30_000,
  });
}

// ─── Community post composer ──────────────────────────────────

interface PublishCommunityPostVars {
  caption: string;
  communityId: string;
  photoUrl?: string;
}

export function usePublishCommunityPost() {
  const qc = useQueryClient();
  return useMutation<string, Error, PublishCommunityPostVars>({
    mutationFn: ({ caption, photoUrl, communityId }) =>
      publishManualPost(caption, photoUrl, communityId),
    onSuccess: (_data, { communityId }) => {
      qc.invalidateQueries({ queryKey: communityKeys.feed(communityId) });
    },
  });
}

export type { Community, CommunityFilter, CommunityMember, UpdateCommunityParams, CommunityEvent };
