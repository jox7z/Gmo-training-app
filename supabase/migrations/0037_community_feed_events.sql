
-- ══════════════════════════════════════════════════════════════════════════
-- 0037 · Community feed & events
-- ══════════════════════════════════════════════════════════════════════════

-- ─── 1. posts: add community_id ──────────────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS community_id uuid
    REFERENCES public.communities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_posts_community_feed
  ON public.posts (community_id, created_at DESC)
  WHERE community_id IS NOT NULL;

-- ─── 2. events: add community_id ─────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS community_id uuid
    REFERENCES public.communities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_community
  ON public.events (community_id, starts_at ASC)
  WHERE community_id IS NOT NULL;

-- ─── 3. RLS: posts ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "posts read auth" ON public.posts;
CREATE POLICY "posts read auth" ON public.posts
  FOR SELECT TO authenticated
  USING (
    community_id IS NULL
    OR public.can_access_community(community_id)
  );

DROP POLICY IF EXISTS "posts insert own" ON public.posts;
CREATE POLICY "posts insert own" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      community_id IS NULL
      OR public.is_active_member(community_id, auth.uid())
    )
  );

-- ─── 4. RLS: post_comments ───────────────────────────────────────────────
DROP POLICY IF EXISTS "post_comments read auth" ON public.post_comments;
CREATE POLICY "post_comments read auth" ON public.post_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_comments.post_id
        AND (
          p.community_id IS NULL
          OR public.can_access_community(p.community_id)
        )
    )
  );

-- ─── 5. RLS: post_reactions ──────────────────────────────────────────────
DROP POLICY IF EXISTS "reactions read auth" ON public.post_reactions;
CREATE POLICY "reactions read auth" ON public.post_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_reactions.post_id
        AND (
          p.community_id IS NULL
          OR public.can_access_community(p.community_id)
        )
    )
  );

-- ─── 6. RLS: events ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "events read auth" ON public.events;
CREATE POLICY "events read auth" ON public.events
  FOR SELECT TO authenticated
  USING (
    community_id IS NULL
    OR public.can_access_community(community_id)
  );

DROP POLICY IF EXISTS "event_comments select auth" ON public.event_comments;
CREATE POLICY "event_comments select auth" ON public.event_comments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_comments.event_id
        AND (
          e.community_id IS NULL
          OR public.can_access_community(e.community_id)
        )
    )
  );

-- ─── 7. feed_for_user: + community_id IS NULL ────────────────────────────
CREATE OR REPLACE FUNCTION public.feed_for_user(
  cursor_ts timestamp with time zone DEFAULT NULL::timestamp with time zone,
  lim integer DEFAULT 20
)
RETURNS TABLE(
  id uuid, user_id uuid, type text, ref_id uuid, title text, subtitle text,
  caption text, photo_url text, share_count integer, comment_count integer,
  metadata jsonb, created_at timestamp with time zone,
  username text, display_name text, avatar_url text, current_rank text,
  props_count integer, respect_count integer, fire_count integer,
  muscle_count integer, heart_count integer, my_reactions text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    and p.community_id IS NULL
    and (feed_for_user.cursor_ts is null or p.created_at < feed_for_user.cursor_ts)
  order by p.created_at desc
  limit (select v.lim from v);
$$;

REVOKE EXECUTE ON FUNCTION public.feed_for_user(timestamp with time zone, integer) FROM anon;

-- ─── 8. list_user_posts: + community_id IS NULL ──────────────────────────
CREATE OR REPLACE FUNCTION public.list_user_posts(
  target_user_id uuid,
  cursor_ts timestamp with time zone DEFAULT NULL::timestamp with time zone,
  lim integer DEFAULT 20
)
RETURNS TABLE(
  id uuid, user_id uuid, type text, ref_id uuid, title text, subtitle text,
  caption text, photo_url text, share_count integer, comment_count integer,
  metadata jsonb, created_at timestamp with time zone,
  username text, display_name text, avatar_url text, current_rank text,
  props_count integer, respect_count integer, fire_count integer,
  muscle_count integer, heart_count integer, my_reactions text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    and p.community_id IS NULL
    and (list_user_posts.cursor_ts is null or p.created_at < list_user_posts.cursor_ts)
  order by p.created_at desc
  limit (select v.lim from v);
$$;

REVOKE EXECUTE ON FUNCTION public.list_user_posts(uuid, timestamp with time zone, integer) FROM anon;

-- ─── 9. publish_manual_post: drop old signature, create new with community_id ──
DROP FUNCTION IF EXISTS public.publish_manual_post(text, text);

CREATE FUNCTION public.publish_manual_post(
  caption        text,
  photo_url      text,
  p_community_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid     uuid := auth.uid();
  v_caption text := nullif(trim(coalesce(caption, '')), '');
  v_photo   text := nullif(trim(coalesce(photo_url, '')), '');
  v_post_id uuid;
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '28000';
  end if;
  if v_caption is null and v_photo is null then
    raise exception 'el post requiere texto o foto' using errcode = '22023';
  end if;
  if v_caption is not null and char_length(v_caption) > 500 then
    raise exception 'el texto es demasiado largo (max 500 caracteres)' using errcode = '22023';
  end if;
  if p_community_id is not null and not public.is_active_member(p_community_id, v_uid) then
    raise exception 'debes ser miembro activo para publicar en esta comunidad' using errcode = '42501';
  end if;

  insert into public.posts (user_id, type, title, caption, photo_url, metadata, community_id)
  values (v_uid, 'manual', null, v_caption, v_photo, '{}'::jsonb, p_community_id)
  returning id into v_post_id;

  return v_post_id;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_manual_post(text, text, uuid) FROM anon;

-- ─── 10. list_community_feed RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_community_feed(
  p_community_id uuid,
  p_cursor       timestamp with time zone DEFAULT NULL,
  lim            integer DEFAULT 20
)
RETURNS TABLE(
  id uuid, user_id uuid, type text, ref_id uuid, title text, subtitle text,
  caption text, photo_url text, share_count integer, comment_count integer,
  metadata jsonb, created_at timestamp with time zone,
  username text, display_name text, avatar_url text, current_rank text,
  props_count integer, respect_count integer, fire_count integer,
  muscle_count integer, heart_count integer, my_reactions text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid uuid := auth.uid();
  v_lim int  := greatest(1, least(coalesce(lim, 20), 100));
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '28000';
  end if;
  if not public.can_access_community(p_community_id) then
    raise exception 'no tienes acceso a esta comunidad' using errcode = '42501';
  end if;

  return query
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
    where r.post_id = p.id and r.user_id = v_uid
  ) mr on true
  left join lateral (
    select count(*)::int as comment_count
    from public.post_comments cm
    where cm.post_id = p.id
  ) cc on true
  where p.community_id = p_community_id
    and (list_community_feed.p_cursor is null or p.created_at < list_community_feed.p_cursor)
  order by p.created_at desc
  limit v_lim;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.list_community_feed(uuid, timestamp with time zone, integer) FROM anon;

-- ─── 11. create_event: drop + create with community_id ───────────────────
DROP FUNCTION IF EXISTS public.create_event(text, text, timestamp with time zone, text, text, text, text, timestamp with time zone);

CREATE FUNCTION public.create_event(
  p_kind         text,
  p_title        text,
  p_starts_at    timestamp with time zone,
  p_description  text DEFAULT NULL,
  p_cover_url    text DEFAULT NULL,
  p_location     text DEFAULT NULL,
  p_metric       text DEFAULT NULL,
  p_ends_at      timestamp with time zone DEFAULT NULL,
  p_community_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '28000';
  end if;
  if p_kind not in ('challenge','meetup') then
    raise exception 'tipo de evento inválido' using errcode = '22023';
  end if;
  if p_community_id is not null and not public.is_active_member(p_community_id, v_uid) then
    raise exception 'debes ser miembro activo para crear eventos en esta comunidad' using errcode = '42501';
  end if;

  insert into public.events (
    creator_id, kind, title, description, cover_url, location, metric,
    starts_at, ends_at, community_id
  ) values (
    v_uid, p_kind, p_title, p_description, p_cover_url, p_location, p_metric,
    p_starts_at, p_ends_at, p_community_id
  )
  returning id into v_id;

  insert into public.event_participants (event_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return v_id;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.create_event(text, text, timestamp with time zone, text, text, text, text, timestamp with time zone, uuid) FROM anon;

-- ─── 12. list_events: drop + recreate (adds community_id, community_name) ──
DROP FUNCTION IF EXISTS public.list_events(text, integer);

CREATE FUNCTION public.list_events(
  filter text    DEFAULT 'all',
  lim    integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, kind text, title text, description text, cover_url text,
  location text, metric text, starts_at timestamp with time zone,
  ends_at timestamp with time zone, created_at timestamp with time zone,
  creator_id uuid, creator_username text, creator_name text,
  participant_count integer, is_joined boolean, is_creator boolean,
  community_id uuid, community_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid uuid := auth.uid();
  v_f   text := lower(coalesce(filter, 'all'));
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '28000';
  end if;

  return query
  select
    e.id, e.kind, e.title, e.description, e.cover_url, e.location, e.metric,
    e.starts_at, e.ends_at, e.created_at,
    e.creator_id, cp.username, cp.display_name,
    coalesce(pc.cnt, 0)::int as participant_count,
    exists (
      select 1 from public.event_participants ep
      where ep.event_id = e.id and ep.user_id = v_uid
    ) as is_joined,
    (e.creator_id = v_uid) as is_creator,
    e.community_id,
    comm.name as community_name
  from public.events e
  join public.profiles cp on cp.id = e.creator_id
  left join public.communities comm on comm.id = e.community_id
  left join lateral (
    select count(*)::int as cnt
    from public.event_participants ep
    where ep.event_id = e.id
  ) pc on true
  where
    (e.community_id IS NULL OR public.can_access_community(e.community_id))
    and case v_f
      when 'challenge' then e.kind = 'challenge'
      when 'meetup'    then e.kind = 'meetup'
      when 'mine'      then e.creator_id = v_uid
      when 'joined'    then exists (
        select 1 from public.event_participants ep
        where ep.event_id = e.id and ep.user_id = v_uid
      )
      else true
    end
  order by
    (coalesce(e.ends_at, e.starts_at) < now()) asc,
    e.starts_at asc
  limit greatest(1, least(coalesce(lim, 50), 100));
end;
$$;

REVOKE EXECUTE ON FUNCTION public.list_events(text, integer) FROM anon;

-- ─── 13. list_community_events RPC ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_community_events(
  p_community_id uuid,
  lim            integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, kind text, title text, description text, cover_url text,
  location text, metric text, starts_at timestamp with time zone,
  ends_at timestamp with time zone, created_at timestamp with time zone,
  creator_id uuid, creator_username text, creator_name text,
  participant_count integer, is_joined boolean, is_creator boolean,
  community_id uuid, community_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid uuid := auth.uid();
  v_lim int  := greatest(1, least(coalesce(lim, 50), 200));
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '28000';
  end if;
  if not public.can_access_community(p_community_id) then
    raise exception 'no tienes acceso a esta comunidad' using errcode = '42501';
  end if;

  return query
  select
    e.id, e.kind, e.title, e.description, e.cover_url, e.location, e.metric,
    e.starts_at, e.ends_at, e.created_at,
    e.creator_id, cp.username, cp.display_name,
    coalesce(pc.cnt, 0)::int as participant_count,
    exists (
      select 1 from public.event_participants ep
      where ep.event_id = e.id and ep.user_id = v_uid
    ) as is_joined,
    (e.creator_id = v_uid) as is_creator,
    e.community_id,
    comm.name as community_name
  from public.events e
  join public.profiles cp on cp.id = e.creator_id
  left join public.communities comm on comm.id = e.community_id
  left join lateral (
    select count(*)::int as cnt
    from public.event_participants ep
    where ep.event_id = e.id
  ) pc on true
  where e.community_id = p_community_id
  order by
    (coalesce(e.ends_at, e.starts_at) < now()) asc,
    e.starts_at asc
  limit v_lim;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.list_community_events(uuid, integer) FROM anon;
