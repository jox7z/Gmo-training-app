import { useEffect, useRef } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
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
 *
 * Suscribe SOLO con sesión autenticada para que postgres_changes en tablas
 * con RLS pase la autorización. Reacciona a cambios de auth (SIGNED_IN /
 * SIGNED_OUT) para recrear o destruir el canal sin canales huérfanos.
 */
export function useFeedRealtime() {
  const qc = useQueryClient();
  // Referencia mutable al canal activo; null = sin canal abierto.
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // ── Helpers ────────────────────────────────────────────────────────────

    function buildAndSubscribe(myId: string | undefined) {
      // Destruye el canal previo antes de crear uno nuevo.
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`feed-changes-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts' },
          (payload) => {
            // Ignorar posts de comunidad — no pertenecen al feed global
            const record = payload.new as Record<string, unknown> | null;
            if (record?.community_id != null) return;
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
        .subscribe((status, err) => {
          if (__DEV__) {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[useFeedRealtime] channel status:', status, err);
            }
          }
        });

      channelRef.current = channel;
    }

    function removeCurrentChannel() {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }

    // ── Suscripción inicial: solo si hay sesión autenticada ────────────────
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      // Autoriza postgres_changes sobre tablas con RLS con el JWT del usuario.
      supabase.realtime.setAuth(session.access_token);
      buildAndSubscribe(session.user.id);
    });

    // ── Reaccionar a cambios de auth ───────────────────────────────────────
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          supabase.realtime.setAuth(session.access_token);
          buildAndSubscribe(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          removeCurrentChannel();
        }
      },
    );

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      removeCurrentChannel();
      authSubscription.unsubscribe();
    };
  }, [qc]);
}
