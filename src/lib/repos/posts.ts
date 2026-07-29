import { supabase } from '@/lib/supabase';
import { RankId } from '@/theme/tokens';
import { resolveUserRank } from '@/lib/rankMilestone';
import type { WorkoutVisibility } from '@/lib/workoutVisibility';

export type PostType =
  | 'workout'
  | 'pr'
  | 'rank_up'
  | 'streak'
  | 'achievement'
  | 'manual';

export interface PostUser {
  displayName: string;
  username: string;
  avatarUrl?: string;
  currentRank: RankId;
}

export interface PostReactions {
  props: number;
  respect: number;
  fire: number;
  muscle: number;
  heart: number;
}

export interface MyReactions {
  props: boolean;
  respect: boolean;
  fire: boolean;
  muscle: boolean;
  heart: boolean;
}

export interface Post {
  id: string;
  userId: string;
  user: PostUser;
  type: PostType;
  refId?: string;
  title?: string;
  subtitle?: string;
  caption?: string;
  photoUrl?: string;
  shareCount: number;
  commentCount: number;
  metadata: Record<string, any>;
  createdAt: string;
  reactions: PostReactions;
  myReactions: MyReactions;
  communityId?: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: {
    displayName: string;
    username: string;
    currentRank: RankId;
  };
  body: string;
  createdAt: string;
}

export type ReactionKind = 'props' | 'respect' | 'fire' | 'muscle' | 'heart';

export const REACTION_KINDS: ReactionKind[] = ['props', 'respect', 'fire', 'muscle', 'heart'];

interface DbFeedRow {
  id: string;
  user_id: string;
  type: PostType;
  ref_id: string | null;
  title: string | null;
  subtitle: string | null;
  caption: string | null;
  photo_url: string | null;
  share_count: number;
  comment_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  current_rank: string;
  props_count: number;
  respect_count: number;
  fire_count: number;
  muscle_count: number;
  heart_count: number;
  my_reactions: ReactionKind[];
  community_id?: string | null;
}

interface DbCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  username: string;
  display_name: string;
  current_rank: string;
}

function toPost(row: DbFeedRow): Post {
  return {
    id: row.id,
    userId: row.user_id,
    user: {
      displayName: row.display_name,
      username: row.username,
      avatarUrl: row.avatar_url ?? undefined,
      currentRank: resolveUserRank(row.current_rank),
    },
    type: row.type,
    refId: row.ref_id ?? undefined,
    title: row.title ?? undefined,
    subtitle: row.subtitle ?? undefined,
    caption: row.caption ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    shareCount: row.share_count,
    commentCount: row.comment_count,
    metadata: (row.metadata ?? {}) as Record<string, any>,
    createdAt: row.created_at,
    reactions: {
      props: row.props_count ?? 0,
      respect: row.respect_count ?? 0,
      fire: row.fire_count ?? 0,
      muscle: row.muscle_count ?? 0,
      heart: row.heart_count ?? 0,
    },
    myReactions: {
      props: row.my_reactions.includes('props'),
      respect: row.my_reactions.includes('respect'),
      fire: row.my_reactions.includes('fire'),
      muscle: row.my_reactions.includes('muscle'),
      heart: row.my_reactions.includes('heart'),
    },
    communityId: row.community_id ?? undefined,
  };
}

function toComment(row: DbCommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    user: {
      displayName: row.display_name,
      username: row.username,
      currentRank: resolveUserRank(row.current_rank),
    },
    body: row.body,
    createdAt: row.created_at,
  };
}

export interface FeedPage {
  posts: Post[];
  nextCursor?: string;
}

export async function listFeed(cursor?: string, limit = 20): Promise<FeedPage> {
  const { data, error } = await supabase.rpc('feed_for_user', {
    cursor_ts: cursor ?? null,
    lim: limit,
  });

  if (error) throw error;

  const rows = (data ?? []) as DbFeedRow[];
  const posts = rows.map(toPost);
  const nextCursor =
    posts.length === limit ? posts[posts.length - 1]?.createdAt : undefined;

  return { posts, nextCursor };
}

export async function listUserPosts(
  userId: string,
  cursor?: string,
  limit = 20,
): Promise<FeedPage> {
  const { data, error } = await supabase.rpc('list_user_posts', {
    target_user_id: userId,
    cursor_ts: cursor ?? null,
    lim: limit,
  });

  if (error) throw error;

  const rows = (data ?? []) as DbFeedRow[];
  const posts = rows.map(toPost);
  const nextCursor =
    posts.length === limit ? posts[posts.length - 1]?.createdAt : undefined;

  return { posts, nextCursor };
}

export async function publishWorkout(
  workoutId: string,
  title: string,
  caption?: string,
  photoUrl?: string,
  visibility?: WorkoutVisibility,
): Promise<string> {
  const args = {
    workout_id: workoutId,
    p_title: title,
    caption: caption ?? null,
    photo_url: photoUrl ?? null,
    p_visibility: visibility ?? null,
  };
  const { data, error } = await supabase.rpc(
    'publish_workout_with_visibility',
    args,
  );

  if (!error) return data as string;

  const missingPrivacyRpc = error.code === 'PGRST202' || error.code === '42883';
  if (!missingPrivacyRpc) throw error;
  if (visibility !== 'public') {
    throw new Error(
      'La privacidad social todavía no está activa en el servidor. Usa Público o inténtalo más tarde.',
    );
  }

  const { data: legacyData, error: legacyError } = await supabase.rpc(
    'publish_workout',
    {
      workout_id: workoutId,
      p_title: title,
      caption: caption ?? null,
      photo_url: photoUrl ?? null,
    },
  );
  if (legacyError) throw legacyError;
  return legacyData as string;
}

export interface PublishPRParams {
  exerciseId: string;
  title: string;
  weightKg: number;
  reps: number;
  caption?: string;
  photoUrl?: string;
}

export async function publishPR(args: PublishPRParams): Promise<string> {
  const { data, error } = await supabase.rpc('publish_pr', {
    exercise_id: args.exerciseId,
    p_title: args.title,
    weight_kg: args.weightKg,
    reps: args.reps,
    caption: args.caption ?? null,
    photo_url: args.photoUrl ?? null,
  });

  if (error) throw error;
  return data as string;
}

export async function publishManualPost(
  caption: string,
  photoUrl?: string,
  communityId?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('publish_manual_post', {
    caption,
    photo_url: photoUrl ?? null,
    p_community_id: communityId ?? null,
  });

  if (error) throw error;
  return data as string;
}

export async function listCommunityFeed(
  communityId: string,
  cursor?: string,
  limit = 20,
): Promise<FeedPage> {
  const { data, error } = await supabase.rpc('list_community_feed', {
    p_community_id: communityId,
    p_cursor: cursor ?? null,
    lim: limit,
  });

  if (error) throw error;

  const rows = (data ?? []) as DbFeedRow[];
  const posts = rows.map(toPost);
  const nextCursor =
    posts.length === limit ? posts[posts.length - 1]?.createdAt : undefined;

  return { posts, nextCursor };
}

export async function listComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase.rpc('list_comments', {
    post_id: postId,
    lim: 50,
  });

  if (error) throw error;
  return ((data ?? []) as DbCommentRow[]).map(toComment);
}

export async function addComment(postId: string, body: string): Promise<string> {
  const { data, error } = await supabase.rpc('add_comment', {
    post_id: postId,
    body,
  });

  if (error) throw error;
  return data as string;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_comment', {
    comment_id: commentId,
  });

  if (error) throw error;
}

export async function incrementShare(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc('increment_share', {
    post_id: postId,
  });

  if (error) throw error;
  return data as number;
}

export async function toggleReaction(
  postId: string,
  reaction: ReactionKind,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_reaction', {
    post_id: postId,
    reaction,
  });

  if (error) throw error;
  return !!data;
}

export async function publishStreak(caption?: string, photoUrl?: string): Promise<string> {
  const { data, error } = await supabase.rpc('publish_streak', {
    caption: caption ?? null,
    photo_url: photoUrl ?? null,
  });

  if (error) throw error;
  return data as string;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function setPostPhoto(postId: string, photoUrl: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ photo_url: photoUrl })
    .eq('id', postId);
  if (error) throw error;
}
