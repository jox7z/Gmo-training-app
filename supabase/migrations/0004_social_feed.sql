-- 0004 Social feed redesign
--
-- Replaces the placeholder social model from 0001 (feed_posts / follows /
-- post_reactions / post_comments) with a richer multi-type post model
-- plus reactions, follows, paginated feed RPC, athlete discovery and
-- auto-publication triggers for rank-ups and streak milestones.
--
-- Safe to run on a fresh DB or on top of 0001-0003 — the legacy social
-- tables from 0001 are dropped first.

-- =====================================================
-- A. Drop legacy social tables from 0001
-- =====================================================
drop table if exists public.post_comments  cascade;
drop table if exists public.post_reactions cascade;
drop table if exists public.feed_posts     cascade;
drop table if exists public.follows        cascade;

-- =====================================================
-- B. profiles.auto_publish_achievements (opt-out for trigger posts)
-- =====================================================
alter table public.profiles
  add column if not exists auto_publish_achievements boolean not null default true;

-- =====================================================
-- C. TABLES
-- =====================================================
create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  type       text not null check (type in
                ('workout','pr','rank_up','streak','achievement')),
  ref_id     uuid,
  title      text not null,
  subtitle   text,
  caption    text check (caption is null or char_length(caption) <= 280),
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index posts_created_idx      on public.posts (created_at desc);

create table public.post_reactions (
  post_id    uuid not null references public.posts on delete cascade,
  user_id    uuid not null references auth.users  on delete cascade,
  type       text not null check (type in ('fire','muscle','clap')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, type)
);

create table public.follows (
  follower_id  uuid not null references auth.users on delete cascade,
  following_id uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

-- =====================================================
-- D. RLS — defense in depth on top of the RPC layer
-- =====================================================
alter table public.posts          enable row level security;
alter table public.post_reactions enable row level security;
alter table public.follows        enable row level security;

-- posts: read open to authenticated; insert/delete own; UPDATE not allowed
create policy "posts read auth"
  on public.posts for select to authenticated using (true);

create policy "posts insert own"
  on public.posts for insert to authenticated
  with check (user_id = auth.uid());

create policy "posts delete own"
  on public.posts for delete to authenticated
  using (user_id = auth.uid());
-- (no UPDATE policy → updates denied even to the owner)

-- post_reactions
create policy "reactions read auth"
  on public.post_reactions for select to authenticated using (true);

create policy "reactions insert own"
  on public.post_reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy "reactions delete own"
  on public.post_reactions for delete to authenticated
  using (user_id = auth.uid());

-- follows
create policy "follows read auth"
  on public.follows for select to authenticated using (true);

create policy "follows insert own"
  on public.follows for insert to authenticated
  with check (follower_id = auth.uid());

create policy "follows delete own"
  on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- =====================================================
-- E. RPCs
-- =====================================================

-- E.1 publish_workout(workout_id, caption) -> post.id
create or replace function public.publish_workout(workout_id uuid, caption text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_owner    uuid;
  v_dur_sec  int;
  v_dur_min  int;
  v_started  timestamptz;
  v_ended    timestamptz;
  v_n_ex     int;
  v_muscle   text;
  v_title    text;
  v_post_id  uuid;
  v_caption  text := nullif(trim(coalesce(caption, '')), '');
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select w.user_id, w.duration_seconds, w.started_at, w.ended_at
    into v_owner, v_dur_sec, v_started, v_ended
  from public.workouts w
  where w.id = workout_id;

  if v_owner is null then
    raise exception 'workout not found' using errcode = 'P0002';
  end if;
  if v_owner <> v_uid then
    raise exception 'not owner of workout' using errcode = '42501';
  end if;
  if v_caption is not null and char_length(v_caption) > 280 then
    raise exception 'caption too long' using errcode = '22023';
  end if;

  v_dur_min := case
    when v_dur_sec is not null then v_dur_sec / 60
    when v_ended   is not null then (extract(epoch from (v_ended - v_started)) / 60)::int
    else null
  end;

  select count(*) into v_n_ex
  from public.workout_exercises we
  where we.workout_id = publish_workout.workout_id;

  select e.muscle_group into v_muscle
  from public.workout_exercises we
  join public.exercises e on e.id = we.exercise_id
  where we.workout_id = publish_workout.workout_id
  group by e.muscle_group
  order by count(*) desc
  limit 1;

  v_title := 'Entrenó ' || coalesce(v_muscle, 'sesión')
          || ' · ' || v_n_ex || ' ejercicios'
          || case when v_dur_min is not null
                  then ' · ' || v_dur_min || ' min'
                  else '' end;

  insert into public.posts (user_id, type, ref_id, title, subtitle, caption, metadata)
  values (
    v_uid,
    'workout',
    workout_id,
    v_title,
    null,
    v_caption,
    jsonb_build_object(
      'exercise_count', v_n_ex,
      'duration_min',   v_dur_min,
      'muscle_group',   v_muscle
    )
  )
  returning id into v_post_id;

  return v_post_id;
end;
$$;

grant execute on function public.publish_workout(uuid, text) to authenticated;

-- E.2 publish_pr(exercise_id, weight_kg, reps, caption) -> post.id
create or replace function public.publish_pr(
  exercise_id text,
  weight_kg   numeric,
  reps        int,
  caption     text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_ex_name  text;
  v_title    text;
  v_subtitle text;
  v_post_id  uuid;
  v_caption  text := nullif(trim(coalesce(caption, '')), '');
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if weight_kg is null or weight_kg <= 0 then
    raise exception 'invalid weight_kg' using errcode = '22023';
  end if;
  if reps is null or reps <= 0 then
    raise exception 'invalid reps' using errcode = '22023';
  end if;
  if v_caption is not null and char_length(v_caption) > 280 then
    raise exception 'caption too long' using errcode = '22023';
  end if;

  select name into v_ex_name from public.exercises where id = exercise_id;
  if v_ex_name is null then
    raise exception 'exercise not found' using errcode = 'P0002';
  end if;

  v_title    := 'Nuevo PR en ' || v_ex_name;
  v_subtitle := trim(to_char(weight_kg, 'FM9999990.##')) || ' kg × ' || reps || ' reps';

  insert into public.posts (user_id, type, ref_id, title, subtitle, caption, metadata)
  values (
    v_uid,
    'pr',
    null,
    v_title,
    v_subtitle,
    v_caption,
    jsonb_build_object(
      'exercise_id', exercise_id,
      'weight_kg',   weight_kg,
      'reps',        reps
    )
  )
  returning id into v_post_id;

  return v_post_id;
end;
$$;

grant execute on function public.publish_pr(text, numeric, int, text) to authenticated;

-- E.3 toggle_reaction(post_id, reaction) -> boolean (true = added, false = removed)
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
  if reaction not in ('fire','muscle','clap') then
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

-- E.4 feed_for_user(cursor_ts, lim) -> paginated feed with author + reaction counts
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
  metadata      jsonb,
  created_at    timestamptz,
  username      text,
  display_name  text,
  avatar_url    text,
  current_rank  text,
  fire_count    int,
  muscle_count  int,
  clap_count    int,
  my_reactions  text[]
)
language sql
security definer
set search_path = public
stable
as $$
  with v as (
    select auth.uid() as uid, greatest(1, least(coalesce(lim, 20), 100)) as lim
  )
  select
    p.id, p.user_id, p.type, p.ref_id, p.title, p.subtitle, p.caption,
    p.metadata, p.created_at,
    pr.username, pr.display_name, pr.avatar_url, pr.current_rank,
    coalesce(rc.fire_count,   0)::int,
    coalesce(rc.muscle_count, 0)::int,
    coalesce(rc.clap_count,   0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  cross join v
  left join lateral (
    select
      count(*) filter (where r.type = 'fire')   as fire_count,
      count(*) filter (where r.type = 'muscle') as muscle_count,
      count(*) filter (where r.type = 'clap')   as clap_count
    from public.post_reactions r
    where r.post_id = p.id
  ) rc on true
  left join lateral (
    select array_agg(r.type) as types
    from public.post_reactions r
    where r.post_id = p.id and r.user_id = v.uid
  ) mr on true
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

-- E.5 discover_athletes(lim) -> top N peers in caller's rank, excluding self + already-followed
create or replace function public.discover_athletes(lim int default 5)
returns setof public.profiles
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select id, current_rank from public.profiles where id = auth.uid()
  )
  select p.*
  from public.profiles p, me
  where p.id <> me.id
    and p.current_rank is not distinct from me.current_rank
    and not exists (
      select 1 from public.follows f
      where f.follower_id = me.id and f.following_id = p.id
    )
  order by p.rank_points desc nulls last, p.created_at asc
  limit greatest(1, least(coalesce(lim, 5), 50));
$$;

grant execute on function public.discover_athletes(int) to authenticated;

-- E.6 follow_user(target)
create or replace function public.follow_user(target uuid)
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
  if target is null or target = v_uid then
    raise exception 'invalid target' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'target not found' using errcode = 'P0002';
  end if;

  insert into public.follows (follower_id, following_id)
  values (v_uid, target)
  on conflict do nothing;
end;
$$;

grant execute on function public.follow_user(uuid) to authenticated;

-- E.7 unfollow_user(target)
create or replace function public.unfollow_user(target uuid)
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

  delete from public.follows
   where follower_id = v_uid and following_id = target;
end;
$$;

grant execute on function public.unfollow_user(uuid) to authenticated;

-- =====================================================
-- F. TRIGGERS — auto-publish rank ups + streak milestones
-- =====================================================

-- F.1 rank_history insert → rank_up post
create or replace function public.publish_rank_up_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_optin boolean;
begin
  -- skip first-seed inserts (no previous rank) and no-op changes
  if new.from_rank is null or new.from_rank = new.to_rank then
    return new;
  end if;

  select auto_publish_achievements into v_optin
    from public.profiles where id = new.user_id;
  if not coalesce(v_optin, false) then
    return new;
  end if;

  insert into public.posts (user_id, type, ref_id, title, subtitle, metadata)
  values (
    new.user_id,
    'rank_up',
    new.id,
    'Subió a rango ' || initcap(new.to_rank),
    'De ' || initcap(new.from_rank) || ' a ' || initcap(new.to_rank),
    jsonb_build_object(
      'from_rank', new.from_rank,
      'to_rank',   new.to_rank,
      'reason',    new.reason
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_publish_rank_up on public.rank_history;
create trigger trg_publish_rank_up
  after insert on public.rank_history
  for each row execute procedure public.publish_rank_up_auto();

-- F.2 streaks update → streak post on multiples of 4
create or replace function public.publish_streak_milestone_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_optin boolean;
begin
  if new.current_weeks is null or new.current_weeks <= 0 then
    return new;
  end if;
  if new.current_weeks = coalesce(old.current_weeks, 0) then
    return new;                       -- value didn't change
  end if;
  if new.current_weeks % 4 <> 0 then
    return new;                       -- not a milestone
  end if;

  select auto_publish_achievements into v_optin
    from public.profiles where id = new.user_id;
  if not coalesce(v_optin, false) then
    return new;
  end if;

  insert into public.posts (user_id, type, ref_id, title, subtitle, metadata)
  values (
    new.user_id,
    'streak',
    null,
    'Racha de ' || new.current_weeks || ' semanas',
    'Cumpliendo objetivo semanal sin parar',
    jsonb_build_object('weeks', new.current_weeks)
  );
  return new;
end;
$$;

drop trigger if exists trg_publish_streak_milestone on public.streaks;
create trigger trg_publish_streak_milestone
  after update of current_weeks on public.streaks
  for each row execute procedure public.publish_streak_milestone_auto();
