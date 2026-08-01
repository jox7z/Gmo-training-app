-- 0023 Reactions: expandir de 2 (muscle, heart) a 5 tipos
--
-- Añade 'props', 'respect', 'fire' al conjunto permitido. 'muscle' y
-- 'heart' siguen iguales — no se migran datos. Se actualizan:
--   * CHECK constraint en post_reactions
--   * toggle_reaction (validación)
--   * feed_for_user (devuelve props_count, respect_count, fire_count)
--   * list_user_posts (idem)

-- =====================================================
-- A. Actualizar CHECK constraint
-- =====================================================
alter table public.post_reactions
  drop constraint if exists post_reactions_type_check;

alter table public.post_reactions
  add  constraint post_reactions_type_check
       check (type in ('props','respect','fire','muscle','heart'));

-- =====================================================
-- B. toggle_reaction — ampliar validación
-- =====================================================
create or replace function public.toggle_reaction(post_id uuid, reaction text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_removed boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if reaction not in ('props','respect','fire','muscle','heart') then
    raise exception 'invalid reaction' using errcode = '22023';
  end if;
  if not exists (select 1 from public.posts p where p.id = toggle_reaction.post_id) then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  delete from public.post_reactions r
    where r.post_id = toggle_reaction.post_id
      and r.user_id = v_uid
      and r.type    = reaction
  returning true into v_removed;

  if coalesce(v_removed, false) then
    return false;
  end if;

  insert into public.post_reactions (post_id, user_id, type)
  values (toggle_reaction.post_id, v_uid, reaction)
  on conflict do nothing;

  return true;
end;
$$;

grant execute on function public.toggle_reaction(uuid, text) to authenticated;

-- =====================================================
-- C. feed_for_user — añadir props/respect/fire al return
-- =====================================================
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
  props_count   int,
  respect_count int,
  fire_count    int,
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
    coalesce(rc.props_count,   0)::int,
    coalesce(rc.respect_count, 0)::int,
    coalesce(rc.fire_count,    0)::int,
    coalesce(rc.muscle_count,  0)::int,
    coalesce(rc.heart_count,   0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  cross join v
  left join lateral (
    select
      count(*) filter (where r.type = 'props')   as props_count,
      count(*) filter (where r.type = 'respect') as respect_count,
      count(*) filter (where r.type = 'fire')    as fire_count,
      count(*) filter (where r.type = 'muscle')  as muscle_count,
      count(*) filter (where r.type = 'heart')   as heart_count
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
-- D. list_user_posts — misma extensión
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
  props_count   int,
  respect_count int,
  fire_count    int,
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
    coalesce(rc.props_count,   0)::int,
    coalesce(rc.respect_count, 0)::int,
    coalesce(rc.fire_count,    0)::int,
    coalesce(rc.muscle_count,  0)::int,
    coalesce(rc.heart_count,   0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  cross join v
  left join lateral (
    select
      count(*) filter (where r.type = 'props')   as props_count,
      count(*) filter (where r.type = 'respect') as respect_count,
      count(*) filter (where r.type = 'fire')    as fire_count,
      count(*) filter (where r.type = 'muscle')  as muscle_count,
      count(*) filter (where r.type = 'heart')   as heart_count
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
