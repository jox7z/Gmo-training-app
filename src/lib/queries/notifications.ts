import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  listNotifications,
  unreadNotificationsCount,
  markNotificationsRead,
  type NotificationsPage,
  type Notification,
} from '@/lib/repos/notifications';

// =====================================================
// Query keys
// =====================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => ['notifications', 'list'] as const,
  unreadCount: () => ['notifications', 'unreadCount'] as const,
};

// =====================================================
// Hooks
// =====================================================

type NotificationsCache = InfiniteData<NotificationsPage, string | undefined>;

export function useNotifications() {
  return useInfiniteQuery<
    NotificationsPage,
    Error,
    NotificationsCache,
    readonly ['notifications', 'list'],
    string | undefined
  >({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam }) => listNotifications(pageParam),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: unreadNotificationsCount,
    // Refetch frecuente para que el badge se mantenga actualizado
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

interface MarkReadVars {
  ids?: string[];
}

interface MarkReadContext {
  previousList?: NotificationsCache;
  previousCount?: number;
}

export function useMarkRead() {
  const qc = useQueryClient();

  return useMutation<number, Error, MarkReadVars, MarkReadContext>({
    mutationFn: ({ ids }) => markNotificationsRead(ids),

    onMutate: async ({ ids }) => {
      // Cancelar queries en vuelo
      await qc.cancelQueries({ queryKey: notificationKeys.list() });
      await qc.cancelQueries({ queryKey: notificationKeys.unreadCount() });

      const previousList = qc.getQueryData<NotificationsCache>(notificationKeys.list());
      const previousCount = qc.getQueryData<number>(notificationKeys.unreadCount());

      const now = new Date().toISOString();

      // Actualización optimista: marcar como leídas en el cache
      qc.setQueryData<NotificationsCache>(notificationKeys.list(), (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((n: Notification) => {
              // Si ids es undefined → marcar todas; si ids tiene valores → marcar solo esas
              const shouldMark = ids == null || ids.includes(n.id);
              if (!shouldMark || n.isRead) return n;
              return { ...n, readAt: now, isRead: true };
            }),
          })),
        };
      });

      // Actualizar counter optimistamente a 0 (mark all) o reducir
      if (ids == null) {
        qc.setQueryData<number>(notificationKeys.unreadCount(), 0);
      } else {
        qc.setQueryData<number>(notificationKeys.unreadCount(), (old = 0) =>
          Math.max(0, old - ids.length),
        );
      }

      return { previousList, previousCount };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousList) {
        qc.setQueryData(notificationKeys.list(), ctx.previousList);
      }
      if (ctx?.previousCount !== undefined) {
        qc.setQueryData(notificationKeys.unreadCount(), ctx.previousCount);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list(), refetchType: 'none' });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export type { Notification, NotificationsPage };
