import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listEvents,
  getEvent,
  createEvent,
  joinEvent,
  leaveEvent,
  listEventParticipants,
  updateEvent,
  deleteEvent,
  listEventComments,
  addEventComment,
  deleteEventComment,
  type CommunityEvent,
  type CreateEventParams,
  type UpdateEventParams,
  type EventFilter,
  type EventComment,
} from '@/lib/repos/events';

export const eventKeys = {
  all: ['events'] as const,
  list: (filter: EventFilter) => ['events', 'list', filter] as const,
  detail: (eventId: string) => ['events', 'detail', eventId] as const,
  participants: (eventId: string) => ['events', 'participants', eventId] as const,
  comments: (eventId: string) => ['events', 'comments', eventId] as const,
};

export function useEvents(filter: EventFilter = 'all') {
  return useQuery({
    queryKey: eventKeys.list(filter),
    queryFn: () => listEvents(filter),
    staleTime: 30_000,
  });
}

/**
 * Detalle de un evento. Primero busca en cualquier lista ya cacheada
 * (navegación desde el hub) y, si no está, hace fetch puntual con get_event.
 */
export function useEvent(eventId: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: eventId ? (['events', 'detail', eventId] as const) : (['events', 'detail', 'noop'] as const),
    queryFn: async (): Promise<CommunityEvent | undefined> => {
      const cached = qc.getQueriesData<CommunityEvent[]>({ queryKey: ['events', 'list'] });
      for (const [, list] of cached) {
        const hit = list?.find((e) => e.id === eventId);
        if (hit) return hit;
      }
      return getEvent(eventId!);
    },
    enabled: !!eventId,
  });
}

export function useEventParticipants(eventId: string | undefined) {
  return useQuery({
    queryKey: eventId ? eventKeys.participants(eventId) : ['events', 'participants', 'noop'],
    queryFn: () => listEventParticipants(eventId!),
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation<string, Error, CreateEventParams>({
    mutationFn: (params) => createEvent(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

interface ToggleJoinVars {
  eventId: string;
  joined: boolean;
}

function patchJoined(
  list: CommunityEvent[] | undefined,
  eventId: string,
  joined: boolean,
): CommunityEvent[] | undefined {
  if (!list) return list;
  return list.map((e) =>
    e.id === eventId
      ? {
          ...e,
          isJoined: joined,
          participantCount: Math.max(0, e.participantCount + (joined ? 1 : -1)),
        }
      : e,
  );
}

export function useToggleJoinEvent() {
  const qc = useQueryClient();
  return useMutation<void, Error, ToggleJoinVars, { snapshots: [readonly unknown[], CommunityEvent[]][] }>({
    mutationFn: ({ eventId, joined }) => (joined ? joinEvent(eventId) : leaveEvent(eventId)),
    onMutate: async ({ eventId, joined }) => {
      await qc.cancelQueries({ queryKey: eventKeys.all });
      const snapshots = qc.getQueriesData<CommunityEvent[]>({ queryKey: ['events', 'list'] });
      for (const [key, data] of snapshots) {
        qc.setQueryData<CommunityEvent[]>(key, patchJoined(data, eventId, joined));
      }
      return { snapshots: snapshots as [readonly unknown[], CommunityEvent[]][] };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_data, _err, { eventId }) => {
      qc.invalidateQueries({ queryKey: ['events', 'list'] });
      qc.invalidateQueries({ queryKey: eventKeys.participants(eventId) });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateEventParams>({
    mutationFn: (params) => updateEvent(params),
    onSuccess: (_data, vars) => {
      // Invalida listas y actualiza detalle en cache
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.setQueryData<CommunityEvent | undefined>(
        eventKeys.detail(vars.eventId),
        (old) =>
          old
            ? {
                ...old,
                title: vars.title,
                description: vars.description,
                coverUrl: vars.coverUrl,
                location: vars.location,
                metric: vars.metric,
                startsAt: vars.startsAt ?? old.startsAt,
                endsAt: vars.endsAt,
              }
            : old,
      );
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (eventId) => deleteEvent(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

// ---------------------------------------------------------------
// Event comments hooks
// ---------------------------------------------------------------

export function useEventComments(eventId: string | undefined) {
  return useQuery({
    queryKey: eventId ? eventKeys.comments(eventId) : ['events', 'comments', 'noop'],
    queryFn: () => listEventComments(eventId!),
    enabled: !!eventId,
  });
}

interface AddEventCommentVars {
  eventId: string;
  body: string;
}

export function useAddEventComment() {
  const qc = useQueryClient();
  return useMutation<EventComment, Error, AddEventCommentVars, { snapshot: EventComment[] | undefined }>({
    mutationFn: ({ eventId, body }) => addEventComment(eventId, body),
    onMutate: async ({ eventId, body }) => {
      const key = eventKeys.comments(eventId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<EventComment[]>(key);
      // Optimistic: append con datos temporales
      const optimistic: EventComment = {
        id: `optimistic-${Date.now()}`,
        eventId,
        userId: 'current',
        body,
        createdAt: new Date().toISOString(),
        user: { username: '', displayName: '…', currentRank: 'bronze' as const },
      };
      qc.setQueryData<EventComment[]>(key, (old) => [...(old ?? []), optimistic]);
      return { snapshot };
    },
    onError: (_err, { eventId }, ctx) => {
      if (ctx?.snapshot !== undefined) {
        qc.setQueryData(eventKeys.comments(eventId), ctx.snapshot);
      }
    },
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: eventKeys.comments(eventId) });
    },
  });
}

interface DeleteEventCommentVars {
  commentId: string;
  eventId: string;
}

export function useDeleteEventComment() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteEventCommentVars>({
    mutationFn: ({ commentId }) => deleteEventComment(commentId),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: eventKeys.comments(eventId) });
    },
  });
}

export type { CommunityEvent, EventFilter, UpdateEventParams, EventComment };
