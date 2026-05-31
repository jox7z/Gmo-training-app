import { supabase } from '@/lib/supabase';
import { RankId } from '@/theme/tokens';

export type EventKind = 'challenge' | 'meetup';
export type EventFilter = 'all' | 'challenge' | 'meetup' | 'mine' | 'joined';

export interface CommunityEvent {
  id: string;
  kind: EventKind;
  title: string;
  description?: string;
  coverUrl?: string;
  location?: string;
  metric?: string;
  startsAt: string;
  endsAt?: string;
  createdAt: string;
  creatorId: string;
  creatorUsername: string;
  creatorName: string;
  participantCount: number;
  isJoined: boolean;
  isCreator: boolean;
}

interface DbEventRow {
  id: string;
  kind: EventKind;
  title: string;
  description: string | null;
  cover_url: string | null;
  location: string | null;
  metric: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  creator_id: string;
  creator_username: string;
  creator_name: string;
  participant_count: number;
  is_joined: boolean;
  is_creator: boolean;
}

function toEvent(row: DbEventRow): CommunityEvent {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    location: row.location ?? undefined,
    metric: row.metric ?? undefined,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    createdAt: row.created_at,
    creatorId: row.creator_id,
    creatorUsername: row.creator_username,
    creatorName: row.creator_name,
    participantCount: row.participant_count,
    isJoined: row.is_joined,
    isCreator: row.is_creator,
  };
}

export interface EventParticipant {
  id: string;
  username: string;
  displayName: string;
  currentRank: RankId;
  avatarUrl?: string;
  score: number;
  joinedAt: string;
  isCreator: boolean;
}

interface DbParticipantRow {
  id: string;
  username: string;
  display_name: string;
  current_rank: string;
  avatar_url: string | null;
  score: number;
  joined_at: string;
  is_creator: boolean;
}

function toParticipant(row: DbParticipantRow): EventParticipant {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    currentRank: row.current_rank as RankId,
    avatarUrl: row.avatar_url ?? undefined,
    score: Number(row.score) || 0,
    joinedAt: row.joined_at,
    isCreator: row.is_creator,
  };
}

export async function listEvents(filter: EventFilter = 'all', lim = 50): Promise<CommunityEvent[]> {
  const { data, error } = await supabase.rpc('list_events', { filter, lim });
  if (error) throw error;
  return ((data ?? []) as DbEventRow[]).map(toEvent);
}

export interface CreateEventParams {
  kind: EventKind;
  title: string;
  startsAt: string;
  description?: string;
  coverUrl?: string;
  location?: string;
  metric?: string;
  endsAt?: string;
}

export async function createEvent(params: CreateEventParams): Promise<string> {
  const { data, error } = await supabase.rpc('create_event', {
    p_kind: params.kind,
    p_title: params.title,
    p_starts_at: params.startsAt,
    p_description: params.description ?? null,
    p_cover_url: params.coverUrl ?? null,
    p_location: params.location ?? null,
    p_metric: params.metric ?? null,
    p_ends_at: params.endsAt ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function joinEvent(eventId: string): Promise<void> {
  const { error } = await supabase.rpc('join_event', { p_event_id: eventId });
  if (error) throw error;
}

export async function leaveEvent(eventId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_event', { p_event_id: eventId });
  if (error) throw error;
}

export async function listEventParticipants(eventId: string, lim = 50): Promise<EventParticipant[]> {
  const { data, error } = await supabase.rpc('event_leaderboard', { p_event_id: eventId, lim });
  if (error) throw error;
  return ((data ?? []) as DbParticipantRow[]).map(toParticipant);
}
