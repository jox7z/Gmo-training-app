-- Privacidad social real para publicaciones de workout.
--
-- `workouts.visibility` es la única fuente de verdad. Los posts de otros tipos
-- conservan su comportamiento actual. Las fotos siguen en un bucket público:
-- por eso followers/private rechazan photo_url hasta migrar media a paths
-- privados + signed URLs.

alter table public.profiles
  add column default_workout_visibility text not null default 'public';

alter table public.profiles
  add constraint profiles_default_workout_visibility_check
  check (default_workout_visibility in ('public', 'followers', 'private'));

alter table public.workouts
  add column visibility text not null default 'public';

alter table public.workouts
  add constraint workouts_visibility_check
  check (visibility in ('public', 'followers', 'private'));

-- Workouts publicados antes de 0020 pueden tener post pero flag local stale.
update public.workouts w
set is_published = true
from public.posts p
where p.type = 'workout'
  and p.ref_id = w.id
  and coalesce(w.is_published, false) = false;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

-- SECURITY DEFINER evita recursión RLS al consultar follows desde policies.
-- auth.uid() siempre viene del request; caller no puede simular otro viewer.
create or replace function private.can_view_workout(p_workout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.workouts w
      where w.id = p_workout_id
        and (
          w.user_id = (select auth.uid())
          or (
            coalesce(w.is_published, false)
            and (
              w.visibility = 'public'
              or (
                w.visibility = 'followers'
                and exists (
                  select 1
                  from public.follows f
                  where f.follower_id = (select auth.uid())
                    and f.following_id = w.user_id
                )
              )
            )
          )
        )
    );
$$;

create or replace function private.can_view_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.posts p
      where p.id = p_post_id
        and (
          p.community_id is null
          or public.can_access_community(p.community_id)
        )
        and (
          p.type <> 'workout'
          or (
            p.ref_id is not null
            and private.can_view_workout(p.ref_id)
          )
        )
    );
$$;

revoke all on function private.can_view_workout(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_view_post(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.can_view_workout(uuid) to authenticated;
grant execute on function private.can_view_post(uuid) to authenticated;

-- Un workout con URL pública no puede degradarse a visibilidad restringida.
create or replace function private.protect_restricted_workout_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility <> 'public'
     and new.visibility is distinct from old.visibility
     and exists (
       select 1
       from public.posts p
       where p.type = 'workout'
         and p.ref_id = new.id
         and nullif(trim(coalesce(p.photo_url, '')), '') is not null
     ) then
    raise exception 'restricted workout visibility does not support public photos'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_restricted_workout_photo()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_protect_restricted_workout_photo on public.workouts;
create trigger trg_protect_restricted_workout_photo
before update of visibility on public.workouts
for each row
execute function private.protect_restricted_workout_photo();

-- Defensa adicional para RPC legacy/direct writes: ninguna fila de post puede
-- adjuntar URL pública a un workout ya restringido.
create or replace function private.protect_restricted_workout_post_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'workout'
     and nullif(trim(coalesce(new.photo_url, '')), '') is not null
     and exists (
       select 1
       from public.workouts w
       where w.id = new.ref_id
         and w.visibility <> 'public'
     ) then
    raise exception 'restricted workout visibility does not support public photos'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_restricted_workout_post_photo()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_protect_restricted_workout_post_photo
  on public.posts;
create trigger trg_protect_restricted_workout_post_photo
before insert or update on public.posts
for each row
execute function private.protect_restricted_workout_post_photo();

-- ---------------------------------------------------------------------------
-- RLS: workout tree
-- ---------------------------------------------------------------------------

drop policy if exists "workouts own or published" on public.workouts;
drop policy if exists "workouts write own" on public.workouts;

create policy "workouts select visible"
  on public.workouts for select to authenticated
  using (private.can_view_workout(id));

create policy "workouts insert own"
  on public.workouts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "workouts update own"
  on public.workouts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "workouts delete own"
  on public.workouts for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "workout_exercises follow parent"
  on public.workout_exercises;

create policy "workout_exercises select visible"
  on public.workout_exercises for select to authenticated
  using (private.can_view_workout(workout_id));

create policy "workout_exercises insert own"
  on public.workout_exercises for insert to authenticated
  with check (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = (select auth.uid())
    )
  );

create policy "workout_exercises update own"
  on public.workout_exercises for update to authenticated
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = (select auth.uid())
    )
  );

create policy "workout_exercises delete own"
  on public.workout_exercises for delete to authenticated
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = (select auth.uid())
    )
  );

drop policy if exists "workout_sets follow parent" on public.workout_sets;

create policy "workout_sets select visible"
  on public.workout_sets for select to authenticated
  using (
    exists (
      select 1
      from public.workout_exercises we
      where we.id = workout_sets.workout_exercise_id
        and private.can_view_workout(we.workout_id)
    )
  );

create policy "workout_sets insert own"
  on public.workout_sets for insert to authenticated
  with check (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
        and w.user_id = (select auth.uid())
    )
  );

create policy "workout_sets update own"
  on public.workout_sets for update to authenticated
  using (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
        and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
        and w.user_id = (select auth.uid())
    )
  );

create policy "workout_sets delete own"
  on public.workout_sets for delete to authenticated
  using (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
        and w.user_id = (select auth.uid())
    )
  );

drop policy if exists "workout_photos follow parent" on public.workout_photos;

create policy "workout_photos select visible"
  on public.workout_photos for select to authenticated
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_photos.workout_id
        and private.can_view_workout(w.id)
    )
  );

create policy "workout_photos insert own"
  on public.workout_photos for insert to authenticated
  with check (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_photos.workout_id
        and w.user_id = (select auth.uid())
    )
  );

create policy "workout_photos update own"
  on public.workout_photos for update to authenticated
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_photos.workout_id
        and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_photos.workout_id
        and w.user_id = (select auth.uid())
    )
  );

create policy "workout_photos delete own"
  on public.workout_photos for delete to authenticated
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_photos.workout_id
        and w.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: posts, comments, reactions
-- ---------------------------------------------------------------------------

drop policy if exists "posts read auth" on public.posts;
create policy "posts read auth"
  on public.posts for select to authenticated
  using (private.can_view_post(id));

drop policy if exists "posts insert own" on public.posts;
create policy "posts insert own"
  on public.posts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      community_id is null
      or public.is_active_member(community_id, (select auth.uid()))
    )
    and (
      type <> 'workout'
      or (
        community_id is null
        and ref_id is not null
        and exists (
          select 1
          from public.workouts w
          where w.id = posts.ref_id
            and w.user_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "post_comments read auth" on public.post_comments;
create policy "post_comments read auth"
  on public.post_comments for select to authenticated
  using (private.can_view_post(post_id));

drop policy if exists "post_comments insert own" on public.post_comments;
create policy "post_comments insert own"
  on public.post_comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.can_view_post(post_id)
  );

drop policy if exists "reactions read auth" on public.post_reactions;
create policy "reactions read auth"
  on public.post_reactions for select to authenticated
  using (private.can_view_post(post_id));

drop policy if exists "reactions insert own" on public.post_reactions;
create policy "reactions insert own"
  on public.post_reactions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.can_view_post(post_id)
  );

-- ---------------------------------------------------------------------------
-- Nuevo publish RPC. Legacy permanece sin overload y siempre publica `public`.
-- Cliente nuevo usa esta función; p_visibility null hereda default del perfil.
-- ---------------------------------------------------------------------------

create or replace function public.publish_workout_with_visibility(
  workout_id uuid,
  p_title text,
  caption text,
  photo_url text,
  p_visibility text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_visibility text;
  v_post_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select coalesce(
    nullif(trim(p_visibility), ''),
    p.default_workout_visibility,
    'public'
  )
  into v_visibility
  from public.profiles p
  where p.id = v_uid;

  v_visibility := coalesce(v_visibility, 'public');
  if v_visibility not in ('public', 'followers', 'private') then
    raise exception 'invalid workout visibility' using errcode = '22023';
  end if;

  if v_visibility <> 'public'
     and nullif(trim(coalesce(photo_url, '')), '') is not null then
    raise exception 'restricted workout visibility does not support public photos'
      using errcode = '22023';
  end if;

  -- UPDATE toma row lock antes del RPC legacy. Todo queda en misma transacción.
  update public.workouts w
  set visibility = v_visibility
  where w.id = workout_id
    and w.user_id = v_uid;

  if not found then
    raise exception 'workout not found' using errcode = 'P0002';
  end if;

  v_post_id := public.publish_workout(
    workout_id,
    p_title,
    caption,
    photo_url
  );

  return v_post_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Feed/list RPCs: SECURITY DEFINER debe aplicar privacidad explícitamente.
-- ---------------------------------------------------------------------------

create or replace function public.feed_for_user(
  cursor_ts timestamptz default null,
  lim integer default 20
)
returns table(
  id uuid, user_id uuid, type text, ref_id uuid, title text, subtitle text,
  caption text, photo_url text, share_count integer, comment_count integer,
  metadata jsonb, created_at timestamptz,
  username text, display_name text, avatar_url text, current_rank text,
  props_count integer, respect_count integer, fire_count integer,
  muscle_count integer, heart_count integer, my_reactions text[]
)
language sql
stable
security definer
set search_path = pg_catalog, public
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
    coalesce(rc.props_count, 0)::int,
    coalesce(rc.respect_count, 0)::int,
    coalesce(rc.fire_count, 0)::int,
    coalesce(rc.muscle_count, 0)::int,
    coalesce(rc.heart_count, 0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  cross join v
  left join lateral (
    select
      count(*) filter (where r.type = 'props') as props_count,
      count(*) filter (where r.type = 'respect') as respect_count,
      count(*) filter (where r.type = 'fire') as fire_count,
      count(*) filter (where r.type = 'muscle') as muscle_count,
      count(*) filter (where r.type = 'heart') as heart_count
    from public.post_reactions r
    where r.post_id = p.id
  ) rc on true
  left join lateral (
    select array_agg(r.type) as types
    from public.post_reactions r
    where r.post_id = p.id
      and r.user_id = v.uid
  ) mr on true
  left join lateral (
    select count(*)::int as comment_count
    from public.post_comments cm
    where cm.post_id = p.id
  ) cc on true
  where (
    p.user_id = v.uid
    or p.user_id in (
      select f.following_id
      from public.follows f
      where f.follower_id = v.uid
    )
  )
    and p.community_id is null
    and private.can_view_post(p.id)
    and (feed_for_user.cursor_ts is null or p.created_at < feed_for_user.cursor_ts)
  order by p.created_at desc
  limit (select v.lim from v);
$$;

create or replace function public.list_user_posts(
  target_user_id uuid,
  cursor_ts timestamptz default null,
  lim integer default 20
)
returns table(
  id uuid, user_id uuid, type text, ref_id uuid, title text, subtitle text,
  caption text, photo_url text, share_count integer, comment_count integer,
  metadata jsonb, created_at timestamptz,
  username text, display_name text, avatar_url text, current_rank text,
  props_count integer, respect_count integer, fire_count integer,
  muscle_count integer, heart_count integer, my_reactions text[]
)
language sql
stable
security definer
set search_path = pg_catalog, public
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
    coalesce(rc.props_count, 0)::int,
    coalesce(rc.respect_count, 0)::int,
    coalesce(rc.fire_count, 0)::int,
    coalesce(rc.muscle_count, 0)::int,
    coalesce(rc.heart_count, 0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  cross join v
  left join lateral (
    select
      count(*) filter (where r.type = 'props') as props_count,
      count(*) filter (where r.type = 'respect') as respect_count,
      count(*) filter (where r.type = 'fire') as fire_count,
      count(*) filter (where r.type = 'muscle') as muscle_count,
      count(*) filter (where r.type = 'heart') as heart_count
    from public.post_reactions r
    where r.post_id = p.id
  ) rc on true
  left join lateral (
    select array_agg(r.type) as types
    from public.post_reactions r
    where r.post_id = p.id
      and r.user_id = v.uid
  ) mr on true
  left join lateral (
    select count(*)::int as comment_count
    from public.post_comments cm
    where cm.post_id = p.id
  ) cc on true
  where p.user_id = list_user_posts.target_user_id
    and p.community_id is null
    and private.can_view_post(p.id)
    and (
      list_user_posts.cursor_ts is null
      or p.created_at < list_user_posts.cursor_ts
    )
  order by p.created_at desc
  limit (select v.lim from v);
$$;

create or replace function public.list_community_feed(
  p_community_id uuid,
  p_cursor timestamptz default null,
  lim integer default 20
)
returns table(
  id uuid, user_id uuid, type text, ref_id uuid, title text, subtitle text,
  caption text, photo_url text, share_count integer, comment_count integer,
  metadata jsonb, created_at timestamptz,
  username text, display_name text, avatar_url text, current_rank text,
  props_count integer, respect_count integer, fire_count integer,
  muscle_count integer, heart_count integer, my_reactions text[]
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim integer := greatest(1, least(coalesce(lim, 20), 100));
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
    coalesce(rc.props_count, 0)::int,
    coalesce(rc.respect_count, 0)::int,
    coalesce(rc.fire_count, 0)::int,
    coalesce(rc.muscle_count, 0)::int,
    coalesce(rc.heart_count, 0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  left join lateral (
    select
      count(*) filter (where r.type = 'props') as props_count,
      count(*) filter (where r.type = 'respect') as respect_count,
      count(*) filter (where r.type = 'fire') as fire_count,
      count(*) filter (where r.type = 'muscle') as muscle_count,
      count(*) filter (where r.type = 'heart') as heart_count
    from public.post_reactions r
    where r.post_id = p.id
  ) rc on true
  left join lateral (
    select array_agg(r.type) as types
    from public.post_reactions r
    where r.post_id = p.id
      and r.user_id = v_uid
  ) mr on true
  left join lateral (
    select count(*)::int as comment_count
    from public.post_comments cm
    where cm.post_id = p.id
  ) cc on true
  where p.community_id = p_community_id
    and private.can_view_post(p.id)
    and (
      list_community_feed.p_cursor is null
      or p.created_at < list_community_feed.p_cursor
    )
  order by p.created_at desc
  limit v_lim;
end;
$$;

create or replace function public.list_comments(
  post_id uuid,
  lim integer default 50
)
returns table(
  id uuid,
  post_id uuid,
  user_id uuid,
  body text,
  created_at timestamptz,
  username text,
  display_name text,
  avatar_url text,
  current_rank text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    c.id,
    c.post_id,
    c.user_id,
    c.body,
    c.created_at,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    pr.current_rank
  from public.post_comments c
  join public.profiles pr on pr.id = c.user_id
  where c.post_id = list_comments.post_id
    and private.can_view_post(list_comments.post_id)
  order by c.created_at asc
  limit greatest(1, least(coalesce(lim, 50), 200));
$$;

create or replace function public.add_comment(post_id uuid, body text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := trim(coalesce(body, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 500 then
    raise exception 'invalid comment length' using errcode = '22023';
  end if;
  if not private.can_view_post(add_comment.post_id) then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  insert into public.post_comments (post_id, user_id, body)
  values (add_comment.post_id, v_uid, v_body)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.toggle_reaction(
  post_id uuid,
  reaction text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_removed boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if reaction not in ('props', 'respect', 'fire', 'muscle', 'heart') then
    raise exception 'invalid reaction' using errcode = '22023';
  end if;
  if not private.can_view_post(toggle_reaction.post_id) then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  delete from public.post_reactions r
  where r.post_id = toggle_reaction.post_id
    and r.user_id = v_uid
    and r.type = reaction
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

create or replace function public.increment_share(post_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_new integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not private.can_view_post(increment_share.post_id) then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  update public.posts
  set share_count = share_count + 1
  where id = increment_share.post_id
  returning share_count into v_new;

  if v_new is null then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  return v_new;
end;
$$;

create or replace function public.profile_counters(target_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'followers',
    (
      select count(*)
      from public.follows f
      where f.following_id = target_user_id
    ),
    'following',
    (
      select count(*)
      from public.follows f
      where f.follower_id = target_user_id
    ),
    'posts',
    (
      select count(*)
      from public.posts p
      where p.user_id = target_user_id
        and private.can_view_post(p.id)
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- ACL: todos los endpoints sociales usados por cliente requieren sesión.
-- Trigger functions no se exponen aquí.
-- ---------------------------------------------------------------------------

revoke all on function public.publish_workout_with_visibility(
  uuid, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.publish_workout_with_visibility(
  uuid, text, text, text, text
) to authenticated;

revoke all on function public.publish_workout(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_workout(uuid, text, text, text)
  to authenticated;

revoke all on function public.feed_for_user(timestamptz, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.feed_for_user(timestamptz, integer)
  to authenticated;

revoke all on function public.list_user_posts(uuid, timestamptz, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_user_posts(uuid, timestamptz, integer)
  to authenticated;

revoke all on function public.list_community_feed(uuid, timestamptz, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_community_feed(uuid, timestamptz, integer)
  to authenticated;

revoke all on function public.list_comments(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_comments(uuid, integer)
  to authenticated;

revoke all on function public.add_comment(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.add_comment(uuid, text)
  to authenticated;

revoke all on function public.delete_comment(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.delete_comment(uuid)
  to authenticated;

revoke all on function public.toggle_reaction(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.toggle_reaction(uuid, text)
  to authenticated;

revoke all on function public.increment_share(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.increment_share(uuid)
  to authenticated;

revoke all on function public.profile_counters(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.profile_counters(uuid)
  to authenticated;

revoke all on function public.publish_pr(
  text, text, numeric, integer, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.publish_pr(
  text, text, numeric, integer, text, text
) to authenticated;

revoke all on function public.publish_manual_post(text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_manual_post(text, text, uuid)
  to authenticated;

revoke all on function public.publish_streak(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_streak(text, text)
  to authenticated;

revoke all on function public.follow_user(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.follow_user(uuid) to authenticated;

revoke all on function public.unfollow_user(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.unfollow_user(uuid) to authenticated;

revoke all on function public.list_followers(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.list_followers(uuid) to authenticated;

revoke all on function public.list_following(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.list_following(uuid) to authenticated;
