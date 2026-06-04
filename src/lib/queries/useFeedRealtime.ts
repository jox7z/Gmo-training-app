import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { feedKeys } from '@/lib/queries/feed';
import type { FeedPage, ReactionKind } from '@/lib/repos/posts';

type FeedCache = InfiniteData<FeedPage, string | undefined>;

/**
 * Count-only patch for a reaction change coming from ANOTHER user via realtime.
 * No toca `myReactions` (eso pertenece al usuario actual y lo maneja el update
 * optimista de useToggleReaction). Solo ajusta el agregado del post.
 */
function patchReactionCount(
  data: FeedCache | undefined,
  postId: string,
  reaction: ReactionKind,
  delta: number,
): FeedCache | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              reactions: {
                ...p.reactions,
                [reaction]: Math.max(0, (p.reactions[reaction] ?? 0) + delta),
              },
            },
      ),
    })),
  };
}

/**
 * Subscribes to Supabase Realtime changes on `public.posts` and
 * `public.post_reactions`. Patches the React Query feed cache in-place
 * to avoid resetting the FlashList scroll position.
 *
 * - New posts: marca la lista como stale SIN refetch inmediato (evita reanimar
 *   el ciclo de carga / resetear el scroll). Aparecen en el próximo
 *   pull-to-refresh o al volver el foco a la app (staleTime expirado).
 * - Reaction changes de OTROS usuarios: parche de conteo en sitio.
 * - Reaction changes propios: se ignoran (el update optimista ya los aplicó;
 *   aplicar el eco duplicaría/invertiría el conteo).
 */
export function useFeedRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Id del usuario actual para descartar los ecos de sus propias reacciones.
    let myId: string | undefined;
    supabase.auth.getUser().then(({ data }) => {
      myId = data.user?.id;
    });

    // Nombre único por montaje para evitar canales duplicados (keep-alive de
    // tabs, hot reload, StrictMode).
    const channel = supabase
      .channel(`feed-changes-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => {
          qc.invalidateQueries({ queryKey: feedKeys.list(), refetchType: 'none' });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions' },
        (payload) => {
          const record =
            (payload.new as Record<string, unknown> | null) ??
            (payload.old as Record<string, unknown> | null);

          const postId = record?.post_id as string | undefined;
          // La columna real es `type` (ver migración 0004_social_feed.sql).
          const reaction = record?.type as ReactionKind | undefined;
          const userId = record?.user_id as string | undefined;

          // Eco de la propia reacción: ya aplicado de forma optimista.
          if (userId && myId && userId === myId) return;

          if (postId && reaction && payload.eventType !== 'UPDATE') {
            const delta = payload.eventType === 'DELETE' ? -1 : 1;
            const current = qc.getQueryData<FeedCache>(feedKeys.list());
            if (current) {
              qc.setQueryData<FeedCache>(feedKeys.list(), (old) =>
                patchReactionCount(old, postId, reaction, delta),
              );
              return;
            }
          }

          // Fallback: marca stale sin refetch inmediato; el próximo focus o
          // pull-to-refresh reconcilia.
          qc.invalidateQueries({ queryKey: feedKeys.list(), refetchType: 'none' });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
