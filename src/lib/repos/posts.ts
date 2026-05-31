import { supabase } from '@/lib/supabase';
import { RankId } from '@/theme/tokens';

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
  muscle: number;
  heart: number;
}

export interface MyReactions {
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

export type ReactionKind = 'muscle' | 'heart';

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
  muscle_count: number;
  heart_count: number;
  my_reactions: ReactionKind[];
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
      currentRank: row.current_rank as RankId,
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
      muscle: row.muscle_count,
      heart: row.heart_count,
    },
    myReactions: {
      muscle: row.my_reactions.includes('muscle'),
      heart: row.my_reactions.includes('heart'),
    },
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
      currentRank: row.current_rank as RankId,
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
  caption?: string,
  photoUrl?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('publish_workout', {
    workout_id: workoutId,
    caption: caption ?? null,
    photo_url: photoUrl ?? null,
  });

  if (error) throw error;
  return data as string;
}

export interface PublishPRParams {
  exerciseId: string;
  weightKg: number;
  reps: number;
  caption?: string;
  photoUrl?: string;
}

export async function publishPR(args: PublishPRParams): Promise<string> {
  const { data, error } = await supabase.rpc('publish_pr', {
    exercise_id: args.exerciseId,
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
): Promise<string> {
  const { data, error } = await supabase.rpc('publish_manual_post', {
    caption,
    photo_url: photoUrl ?? null,
  });

  if (error) throw error;
  return data as string;
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
