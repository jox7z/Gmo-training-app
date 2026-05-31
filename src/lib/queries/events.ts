import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listEvents,
  createEvent,
  joinEvent,
  leaveEvent,
  listEventParticipants,
  type CommunityEvent,
  type CreateEventParams,
  type EventFilter,
} from '@/lib/repos/events';

export const eventKeys = {
  all: ['events'] as const,
  list: (filter: EventFilter) => ['events', 'list', filter] as const,
  participants: (eventId: string) => ['events', 'participants', eventId] as const,
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
 * (navegación desde el hub) y, si no está, hace fetch del set 'all'.
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
      const all = await listEvents('all');
      return all.find((e) => e.id === eventId);
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

export type { CommunityEvent, EventFilter };
