import { supabase } from '@/lib/supabase';
import { RankId } from '@/theme/tokens';
import { resolveUserRank } from '@/lib/rankMilestone';

// =====================================================
// Types
// =====================================================

export type NotificationType = 'reaction' | 'comment' | 'follow' | 'event' | 'community';

export interface NotificationActor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  currentRank: RankId;
}

export interface Notification {
  id: string;
  type: NotificationType;
  postId?: string;
  eventId?: string;
  metadata: Record<string, any>;
  readAt?: string;
  createdAt: string;
  actor?: NotificationActor;
  postTitle?: string;
  postType?: string;
  eventTitle?: string;
  isRead: boolean;
}

export interface NotificationsPage {
  notifications: Notification[];
  nextCursor?: string;
}

// =====================================================
// DB row shape (snake_case from RPC)
// =====================================================

interface DbNotificationRow {
  id: string;
  type: NotificationType;
  post_id: string | null;
  event_id: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  actor_rank: string | null;
  post_title: string | null;
  post_type: string | null;
  event_title: string | null;
}

function toNotification(row: DbNotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    postId: row.post_id ?? undefined,
    eventId: row.event_id ?? undefined,
    metadata: (row.metadata ?? {}) as Record<string, any>,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
    actor: row.actor_id
      ? {
          id: row.actor_id,
          username: row.actor_username ?? '',
          displayName: row.actor_name ?? '',
          avatarUrl: row.actor_avatar ?? undefined,
          currentRank: resolveUserRank(row.actor_rank),
        }
      : undefined,
    postTitle: row.post_title ?? undefined,
    postType: row.post_type ?? undefined,
    eventTitle: row.event_title ?? undefined,
    isRead: row.read_at != null,
  };
}

// =====================================================
// Repo functions
// =====================================================

export async function listNotifications(
  cursor?: string,
  limit = 30,
): Promise<NotificationsPage> {
  const { data, error } = await supabase.rpc('list_notifications', {
    cursor_ts: cursor ?? null,
    lim: limit,
  });

  if (error) throw error;

  const rows = (data ?? []) as DbNotificationRow[];
  const notifications = rows.map(toNotification);
  const nextCursor =
    notifications.length === limit
      ? notifications[notifications.length - 1]?.createdAt
      : undefined;

  return { notifications, nextCursor };
}

export async function unreadNotificationsCount(): Promise<number> {
  const { data, error } = await supabase.rpc('unread_notifications_count');
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function markNotificationsRead(ids?: string[]): Promise<number> {
  const { data, error } = await supabase.rpc('mark_notifications_read', {
    ids: ids ?? null,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}
