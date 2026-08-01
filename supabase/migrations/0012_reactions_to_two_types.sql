-- 0012 Reactions: 3 tipos → 2 tipos (muscle + heart)
--
-- fire y clap se consolidan en heart. muscle queda igual.
-- Se migran datos existentes, se depuran duplicados, se restringe
-- el CHECK, y se actualizan feed_for_user y list_user_posts para
-- devolver solo muscle_count / heart_count (sin fire / clap).

-- =====================================================
-- A. Migrar datos antes de tocar el constraint
-- =====================================================

-- 1. Convertir fire y clap en heart
update public.post_reactions
   set type = 'heart'
 where type in ('fire', 'clap');

-- 2. Eliminar duplicados que la migración pudo haber creado
--    (usuario que ya tenía heart + ahora también fire→heart
--    en el mismo post → PK duplicada por ctid)
delete from public.post_reactions a
 using public.post_reactions b
 where a.post_id = b.post_id
   and a.user_id = b.user_id
   and a.type    = b.type
   and a.ctid    < b.ctid;

-- =====================================================
-- B. Actualizar el CHECK constraint
-- =====================================================
alter table public.post_reactions
  drop constraint if exists post_reactions_type_check;

alter table public.post_reactions
  add  constraint post_reactions_type_check
       check (type in ('muscle', 'heart'));

-- =====================================================
-- C. feed_for_user — quitar fire/clap, añadir heart_count
-- =====================================================
-- El tipo de retorno cambia → DROP obligatorio antes de recrear.
drop function if exists public.feed_for_user(timestamptz, int);

create or replace function public.feed_for_user(
  cursor_ts timestamptz default null,
  lim       int         default 20
) returns table (
  id            uuid,
  user_id       uuid,
  type          text,
  ref_id        uuid,
  title         text,
  subtitle      text,
  caption       text,
  photo_url     text,
  share_count   int,
  comment_count int,
  metadata      jsonb,
  created_at    timestamptz,
  username      text,
  display_name  text,
  avatar_url    text,
  current_rank  text,
  muscle_count  int,
  heart_count   int,
  my_reactions  text[]
)
language sql
security definer
set search_path = public
stable
as $$
  with v as (
    select auth.uid() as uid,
           greatest(1, least(coalesce(lim, 20), 100)) as lim
  )
  select
    p.id, p.user_id, p.type, p.ref_id, p.title, p.subtitle, p.caption,
    p.photo_url,
    p.share_count,
    coalesce(cc.comment_count, 0)::int,
    p.metadata, p.created_at,
    pr.username, pr.display_name, pr.avatar_url, pr.current_rank,
    coalesce(rc.muscle_count, 0)::int,
    coalesce(rc.heart_count,  0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  cross join v
  left join lateral (
    select
      count(*) filter (where r.type = 'muscle') as muscle_count,
      count(*) filter (where r.type = 'heart')  as heart_count
    from public.post_reactions r
    where r.post_id = p.id
  ) rc on true
  left join lateral (
    select array_agg(r.type) as types
    from public.post_reactions r
    where r.post_id = p.id and r.user_id = v.uid
  ) mr on true
  left join lateral (
    select count(*)::int as comment_count
    from public.post_comments cm
    where cm.post_id = p.id
  ) cc on true
  where (
       p.user_id = v.uid
    or p.user_id in (
         select following_id from public.follows where follower_id = v.uid
       )
  )
    and (feed_for_user.cursor_ts is null or p.created_at < feed_for_user.cursor_ts)
  order by p.created_at desc
  limit (select v.lim from v);
$$;

grant execute on function public.feed_for_user(timestamptz, int) to authenticated;

-- =====================================================
-- D. list_user_posts — misma actualización de reacciones
-- =====================================================
drop function if exists public.list_user_posts(uuid, timestamptz, int);

create or replace function public.list_user_posts(
  target_user_id uuid,
  cursor_ts      timestamptz default null,
  lim            int         default 20
) returns table (
  id            uuid,
  user_id       uuid,
  type          text,
  ref_id        uuid,
  title         text,
  subtitle      text,
  caption       text,
  photo_url     text,
  share_count   int,
  comment_count int,
  metadata      jsonb,
  created_at    timestamptz,
  username      text,
  display_name  text,
  avatar_url    text,
  current_rank  text,
  muscle_count  int,
  heart_count   int,
  my_reactions  text[]
)
language sql
security definer
set search_path = public
stable
as $$
  with v as (
    select auth.uid() as uid,
           greatest(1, least(coalesce(lim, 20), 100)) as lim
  )
  select
    p.id, p.user_id, p.type, p.ref_id, p.title, p.subtitle, p.caption,
    p.photo_url,
    p.share_count,
    coalesce(cc.comment_count, 0)::int,
    p.metadata, p.created_at,
    pr.username, pr.display_name, pr.avatar_url, pr.current_rank,
    coalesce(rc.muscle_count, 0)::int,
    coalesce(rc.heart_count,  0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  cross join v
  left join lateral (
    select
      count(*) filter (where r.type = 'muscle') as muscle_count,
      count(*) filter (where r.type = 'heart')  as heart_count
    from public.post_reactions r
    where r.post_id = p.id
  ) rc on true
  left join lateral (
    select array_agg(r.type) as types
    from public.post_reactions r
    where r.post_id = p.id and r.user_id = v.uid
  ) mr on true
  left join lateral (
    select count(*)::int as comment_count
    from public.post_comments cm
    where cm.post_id = p.id
  ) cc on true
  where p.user_id = list_user_posts.target_user_id
    and (list_user_posts.cursor_ts is null or p.created_at < list_user_posts.cursor_ts)
  order by p.created_at desc
  limit (select v.lim from v);
$$;

grant execute on function public.list_user_posts(uuid, timestamptz, int) to authenticated;

-- =====================================================
-- NOTA PARA BACKEND
-- =====================================================
-- Tipos a actualizar en src/lib/repos/posts.ts:
--
--   export type ReactionType = 'muscle' | 'heart';
--
--   interface Post {
--     reactions:   { muscle: number; heart: number };
--     myReactions: { muscle: boolean; heart: boolean };
--   }
--
-- Mapeo desde snake_case del RPC:
--   reactions:   { muscle: row.muscle_count, heart: row.heart_count }
--   myReactions: {
--     muscle: row.my_reactions.includes('muscle'),
--     heart:  row.my_reactions.includes('heart'),
--   }
--
-- Eliminar TODOS los usos de fire/clap en src/lib/.
-- toggle_reaction(postId, type) no cambia de firma — el CHECK valida
-- que type sea 'muscle' o 'heart'; la validación ocurre en BD.
--
-- UI (Frontend): reemplazar los 3 botones de reacción por 2:
--   💪 muscle → color primary
--   ❤️ heart  → color danger/red
