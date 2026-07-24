import { supabase } from '@/lib/supabase';
import { RankId } from '@/theme/tokens';

export type CommunityRole   = 'owner' | 'moderator' | 'member';
export type CommunityStatus = 'pending' | 'active';
export type CommunityFilter = 'all' | 'mine' | 'joined';

export interface Community {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  isPrivate: boolean;
  creatorId: string;
  createdAt: string;
  memberCount: number;
  isMember: boolean;
  myRole?: CommunityRole;
  myStatus?: CommunityStatus;
}

export interface CommunityMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  currentRank: RankId;
  role: CommunityRole;
  status: CommunityStatus;
  joinedAt: string;
}

// ─── DB row shapes ───────────────────────────────────────────

interface DbCommunityRow {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_private: boolean;
  creator_id: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
  my_role: string | null;
  my_status: string | null;
}

interface DbMemberRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  current_rank: string;
  role: string;
  status: string;
  joined_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

function toCommunity(row: DbCommunityRow): Community {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description ?? undefined,
    coverUrl:    row.cover_url   ?? undefined,
    isPrivate:   row.is_private,
    creatorId:   row.creator_id,
    createdAt:   row.created_at,
    memberCount: Number(row.member_count) || 0,
    isMember:    row.is_member,
    myRole:      (row.my_role   as CommunityRole   | null) ?? undefined,
    myStatus:    (row.my_status as CommunityStatus | null) ?? undefined,
  };
}

function toMember(row: DbMemberRow): CommunityMember {
  return {
    userId:      row.user_id,
    username:    row.username,
    displayName: row.display_name,
    avatarUrl:   row.avatar_url ?? undefined,
    currentRank: row.current_rank as RankId,
    role:        row.role   as CommunityRole,
    status:      row.status as CommunityStatus,
    joinedAt:    row.joined_at,
  };
}

// ─── Repo functions ───────────────────────────────────────────

export async function listCommunities(
  filter: CommunityFilter = 'all',
  search?: string,
  lim = 50,
): Promise<Community[]> {
  const { data, error } = await supabase.rpc('list_communities', {
    p_filter: filter,
    p_search: search ?? null,
    lim,
  });
  if (error) throw error;
  return ((data ?? []) as DbCommunityRow[]).map(toCommunity);
}

export async function getCommunity(id: string): Promise<Community | undefined> {
  const { data, error } = await supabase.rpc('get_community', { p_id: id });
  if (error) throw error;
  const rows = (data ?? []) as DbCommunityRow[];
  return rows[0] ? toCommunity(rows[0]) : undefined;
}

export interface CreateCommunityParams {
  name: string;
  description?: string;
  coverUrl?: string;
  isPrivate: boolean;
}

export async function createCommunity(params: CreateCommunityParams): Promise<string> {
  const { data, error } = await supabase.rpc('create_community', {
    p_name:        params.name,
    p_description: params.description ?? null,
    p_cover_url:   params.coverUrl    ?? null,
    p_is_private:  params.isPrivate,
  });
  if (error) throw error;
  return data as string;
}

export interface UpdateCommunityParams {
  id: string;
  name?: string;
  description?: string;
  coverUrl?: string;
  isPrivate?: boolean;
}

export async function updateCommunity(params: UpdateCommunityParams): Promise<void> {
  const { error } = await supabase.rpc('update_community', {
    p_id:          params.id,
    p_name:        params.name        ?? null,
    p_description: params.description ?? null,
    p_cover_url:   params.coverUrl    ?? null,
    p_is_private:  params.isPrivate   ?? null,
  });
  if (error) throw error;
}

export async function deleteCommunity(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_community', { p_id: id });
  if (error) throw error;
}

/** Returns 'active' (public) or 'pending' (private awaiting approval). */
export async function joinCommunity(id: string): Promise<CommunityStatus> {
  const { data, error } = await supabase.rpc('join_community', { p_id: id });
  if (error) throw error;
  return data as CommunityStatus;
}

export async function leaveCommunity(id: string): Promise<void> {
  const { error } = await supabase.rpc('leave_community', { p_id: id });
  if (error) throw error;
}

export async function listCommunityMembers(
  communityId: string,
  lim = 100,
): Promise<CommunityMember[]> {
  const { data, error } = await supabase.rpc('list_community_members', {
    p_id: communityId,
    lim,
  });
  if (error) throw error;
  return ((data ?? []) as DbMemberRow[]).map(toMember);
}

export async function setMemberRole(
  communityId: string,
  userId: string,
  role: 'moderator' | 'member',
): Promise<void> {
  const { error } = await supabase.rpc('set_member_role', {
    p_id:   communityId,
    p_user: userId,
    p_role: role,
  });
  if (error) throw error;
}

export async function removeMember(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_member', {
    p_id:   communityId,
    p_user: userId,
  });
  if (error) throw error;
}

export async function approveMember(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_member', {
    p_id:   communityId,
    p_user: userId,
  });
  if (error) throw error;
}

export async function rejectMember(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_member', {
    p_id:   communityId,
    p_user: userId,
  });
  if (error) throw error;
}
