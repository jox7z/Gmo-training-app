-- 0014 Events + global ranking
--
-- Adds a community events module (challenges with their own score ranking +
-- in-person meetups with location/time and RSVP) plus a global leaderboard
-- RPC that ranks every athlete by rank_points (the existing leaderboard in
-- 0004/0011 only scoped to the caller's own rank).
--
-- Safe to run on top of 0001-0013.

-- =====================================================
-- A. TABLES
-- =====================================================
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references auth.users on delete cascade,
  kind        text not null check (kind in ('challenge','meetup')),
  title       text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  cover_url   text,
  location    text,                 -- meetups: dónde se realiza
  metric      text,                 -- challenges: qué se mide (ej. "Reps de sentadilla")
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  created_at  timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index if not exists events_starts_idx  on public.events (starts_at);
create index if not exists events_kind_idx     on public.events (kind, starts_at);
create index if not exists events_creator_idx  on public.events (creator_id);

create table if not exists public.event_participants (
  event_id  uuid not null references public.events on delete cascade,
  user_id   uuid not null references auth.users  on delete cascade,
  score     numeric not null default 0,   -- ranking interno de retos
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_participants_user_idx on public.event_participants (user_id);

-- =====================================================
-- B. RLS — defensa en profundidad sobre la capa RPC
-- =====================================================
alter table public.events             enable row level security;
alter table public.event_participants enable row level security;

-- events: lectura abierta a autenticados; crear propios; editar/borrar propios
create policy "events read auth"
  on public.events for select to authenticated using (true);

create policy "events insert own"
  on public.events for insert to authenticated
  with check (creator_id = auth.uid());

create policy "events update own"
  on public.events for update to authenticated
  using (creator_id = auth.uid());

create policy "events delete own"
  on public.events for delete to authenticated
  using (creator_id = auth.uid());

-- event_participants: lectura abierta; cada quien gestiona su propia fila
create policy "participants read auth"
  on public.event_participants for select to authenticated using (true);

create policy "participants insert own"
  on public.event_participants for insert to authenticated
  with check (user_id = auth.uid());

create policy "participants update own"
  on public.event_participants for update to authenticated
  using (user_id = auth.uid());

create policy "participants delete own"
  on public.event_participants for delete to authenticated
  using (user_id = auth.uid());

-- =====================================================
-- C. RPC list_events(filter, lim)
--    filter ∈ ('all','challenge','meetup','mine','joined')
-- =====================================================
create or replace function public.list_events(filter text default 'all', lim int default 50)
returns table (
  id                uuid,
  kind              text,
  title             text,
  description       text,
  cover_url         text,
  location          text,
  metric            text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  created_at        timestamptz,
  creator_id        uuid,
  creator_username  text,
  creator_name      text,
  participant_count int,
  is_joined         boolean,
  is_creator        boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_f   text := lower(coalesce(filter, 'all'));
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
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
    (e.creator_id = v_uid) as is_creator
  from public.events e
  join public.profiles cp on cp.id = e.creator_id
  left join lateral (
    select count(*)::int as cnt
    from public.event_participants ep
    where ep.event_id = e.id
  ) pc on true
  where
    case v_f
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
    -- próximos/en curso primero, pasados al final
    (coalesce(e.ends_at, e.starts_at) < now()) asc,
    e.starts_at asc
  limit greatest(1, least(coalesce(lim, 50), 100));
end;
$$;

grant execute on function public.list_events(text, int) to authenticated;

-- =====================================================
-- D. RPC create_event(...)
-- =====================================================
create or replace function public.create_event(
  p_kind        text,
  p_title       text,
  p_starts_at   timestamptz,
  p_description text default null,
  p_cover_url   text default null,
  p_location    text default null,
  p_metric      text default null,
  p_ends_at     timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_kind not in ('challenge','meetup') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;

  insert into public.events (
    creator_id, kind, title, description, cover_url, location, metric, starts_at, ends_at
  ) values (
    v_uid, p_kind, p_title, p_description, p_cover_url, p_location, p_metric, p_starts_at, p_ends_at
  )
  returning id into v_id;

  -- el creador queda inscrito automáticamente
  insert into public.event_participants (event_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return v_id;
end;
$$;

grant execute on function public.create_event(text, text, timestamptz, text, text, text, text, timestamptz) to authenticated;

-- =====================================================
-- E. RPC join_event / leave_event
-- =====================================================
create or replace function public.join_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.events where id = p_event_id) then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  insert into public.event_participants (event_id, user_id)
  values (p_event_id, v_uid)
  on conflict do nothing;
end;
$$;

grant execute on function public.join_event(uuid) to authenticated;

create or replace function public.leave_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  delete from public.event_participants
  where event_id = p_event_id and user_id = v_uid;
end;
$$;

grant execute on function public.leave_event(uuid) to authenticated;

-- =====================================================
-- F. RPC event_leaderboard(event_id, lim)
--    Retos → orden por score desc. Quedadas → por fecha de inscripción.
-- =====================================================
create or replace function public.event_leaderboard(p_event_id uuid, lim int default 50)
returns table (
  id           uuid,
  username     text,
  display_name text,
  current_rank text,
  avatar_url   text,
  score        numeric,
  joined_at    timestamptz,
  is_creator   boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.username, p.display_name, p.current_rank, p.avatar_url,
    ep.score, ep.joined_at,
    (e.creator_id = p.id) as is_creator
  from public.event_participants ep
  join public.profiles p on p.id = ep.user_id
  join public.events e   on e.id = ep.event_id
  where ep.event_id = p_event_id
  order by ep.score desc, ep.joined_at asc
  limit greatest(1, least(coalesce(lim, 50), 200));
$$;

grant execute on function public.event_leaderboard(uuid, int) to authenticated;

-- =====================================================
-- G. RPC global_leaderboard(lim)
--    Top atletas por rank_points en TODA la app (cualquier rango).
-- =====================================================
create or replace function public.global_leaderboard(lim int default 50)
returns table (
  id           uuid,
  username     text,
  display_name text,
  current_rank text,
  rank_points  int,
  avatar_url   text,
  is_following boolean,
  is_me        boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare v_uid uuid := auth.uid();
begin
  return query
  select
    p.id, p.username, p.display_name, p.current_rank,
    coalesce(p.rank_points, 0)::int,
    p.avatar_url,
    exists (
      select 1 from public.follows f
      where f.follower_id = v_uid and f.following_id = p.id
    ) as is_following,
    (p.id = v_uid) as is_me
  from public.profiles p
  order by p.rank_points desc nulls last, p.created_at asc
  limit greatest(1, least(coalesce(lim, 50), 100));
end;
$$;

grant execute on function public.global_leaderboard(int) to authenticated;
