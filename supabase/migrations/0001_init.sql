-- Gmo Training App - Initial schema
-- PostgreSQL 15 / Supabase
-- All tables have RLS enabled. Policies enforce per-user isolation.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================
-- PROFILES
-- =====================================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  unit_preference text check (unit_preference in ('kg','lb')) default 'kg',
  experience_level text check (experience_level in ('beginner','intermediate','advanced')) default 'beginner',
  goal text check (goal in ('strength','hypertrophy','fat_loss','general')) default 'hypertrophy',
  current_rank text default 'bronze',
  rank_points int default 0,
  weekly_goal_days int default 3 check (weekly_goal_days between 1 and 7),
  created_at timestamptz default now()
);

create index profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

create policy "profiles read public"
  on public.profiles for select
  using (true);

create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- =====================================================
-- EXERCISES catalog (global, read-only for users)
-- =====================================================
create table public.exercises (
  id text primary key,                     -- slug, e.g. 'bench-press'
  name text not null,
  muscle_group text not null,
  secondary_muscles text[] default '{}',
  equipment text not null,
  difficulty text default 'intermediate',
  gif_url text,
  instructions text,
  is_compound boolean default false,
  is_custom boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create index exercises_muscle_idx on public.exercises (muscle_group);

alter table public.exercises enable row level security;

create policy "exercises read all"
  on public.exercises for select using (true);

create policy "exercises insert own custom"
  on public.exercises for insert
  with check (auth.uid() = created_by and is_custom = true);

-- =====================================================
-- ROUTINES
-- =====================================================
create table public.routines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  split_type text,
  is_ai_generated boolean default false,
  ai_reasoning text,
  is_public boolean default false,
  created_at timestamptz default now()
);

create index routines_user_idx on public.routines (user_id);

create table public.routine_days (
  id uuid primary key default uuid_generate_v4(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  day_index int not null,
  name text not null,
  notes text
);

create index routine_days_routine_idx on public.routine_days (routine_id);

create table public.routine_day_exercises (
  id uuid primary key default uuid_generate_v4(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id text not null references public.exercises(id),
  position int not null,
  target_sets int not null default 3,
  target_reps_min int not null default 8,
  target_reps_max int not null default 12,
  target_rir int,
  rest_seconds int default 90
);

create index rde_day_idx on public.routine_day_exercises (routine_day_id);

alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_day_exercises enable row level security;

create policy "routines read own or public"
  on public.routines for select
  using (auth.uid() = user_id or is_public = true);

create policy "routines write own"
  on public.routines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "routine_days follow parent"
  on public.routine_days for all
  using (exists (select 1 from public.routines r where r.id = routine_id and (r.user_id = auth.uid() or r.is_public)))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()));

create policy "rde follow parent"
  on public.routine_day_exercises for all
  using (exists (
    select 1 from public.routine_days rd
    join public.routines r on r.id = rd.routine_id
    where rd.id = routine_day_id and (r.user_id = auth.uid() or r.is_public)
  ))
  with check (exists (
    select 1 from public.routine_days rd
    join public.routines r on r.id = rd.routine_id
    where rd.id = routine_day_id and r.user_id = auth.uid()
  ));

-- =====================================================
-- WORKOUTS (executed sessions)
-- =====================================================
create table public.workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  routine_day_id uuid references public.routine_days(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  total_volume_kg numeric(10,2) default 0,
  notes text,
  feeling text check (feeling in ('great','good','tired','bad')),
  is_published boolean default false,
  created_at timestamptz default now()
);

create index workouts_user_started_idx on public.workouts (user_id, started_at desc);
create index workouts_published_idx on public.workouts (is_published, started_at desc) where is_published;

create table public.workout_exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id text not null references public.exercises(id),
  position int not null
);

create table public.workout_sets (
  id uuid primary key default uuid_generate_v4(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_index int not null,
  reps int not null,
  weight_kg numeric(6,2) not null,                 -- always stored in kg
  rpe numeric(3,1),
  is_warmup boolean default false,
  is_completed boolean default true
);

create table public.workout_photos (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz default now()
);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_photos enable row level security;

create policy "workouts own or published"
  on public.workouts for select
  using (auth.uid() = user_id or is_published = true);

create policy "workouts write own"
  on public.workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_exercises follow parent"
  on public.workout_exercises for all
  using (exists (
    select 1 from public.workouts w where w.id = workout_id and (w.user_id = auth.uid() or w.is_published)
  ))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "workout_sets follow parent"
  on public.workout_sets for all
  using (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and (w.user_id = auth.uid() or w.is_published)
  ))
  with check (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  ));

create policy "workout_photos follow parent"
  on public.workout_photos for all
  using (exists (
    select 1 from public.workouts w where w.id = workout_id and (w.user_id = auth.uid() or w.is_published)
  ))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- =====================================================
-- WEEKLY STATS / STREAKS / RANKS
-- =====================================================
create table public.weekly_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  iso_year int not null,
  iso_week int not null,
  workout_days int default 0,
  total_volume_kg numeric(10,2) default 0,
  goal_met boolean default false,
  primary key (user_id, iso_year, iso_week)
);

create table public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_weeks int default 0,
  longest_weeks int default 0,
  last_qualifying_week date
);

create table public.rank_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_rank text,
  to_rank text not null,
  reason text,
  changed_at timestamptz default now()
);

alter table public.weekly_stats enable row level security;
alter table public.streaks enable row level security;
alter table public.rank_history enable row level security;

create policy "stats read all" on public.weekly_stats for select using (true);
create policy "stats write own" on public.weekly_stats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "streaks read all" on public.streaks for select using (true);
create policy "streaks write own" on public.streaks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rank_history read own" on public.rank_history for select using (auth.uid() = user_id);

-- =====================================================
-- SOCIAL: follows, posts, reactions, comments
-- =====================================================
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index follows_followed_idx on public.follows (followed_id);

create table public.feed_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete cascade,
  caption text,
  created_at timestamptz default now()
);

create index feed_posts_created_idx on public.feed_posts (created_at desc);

create table public.post_reactions (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('fire','muscle','clap')),
  created_at timestamptz default now(),
  unique (post_id, user_id, type)
);

create table public.post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

alter table public.follows enable row level security;
alter table public.feed_posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;

create policy "follows read all" on public.follows for select using (true);
create policy "follows write own" on public.follows for all
  using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create policy "posts read all" on public.feed_posts for select using (true);
create policy "posts write own" on public.feed_posts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reactions read all" on public.post_reactions for select using (true);
create policy "reactions write own" on public.post_reactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "comments read all" on public.post_comments for select using (true);
create policy "comments write own" on public.post_comments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================
-- AI: conversations, messages, cache, usage
-- =====================================================
create table public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz default now()
);

create table public.ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  tokens int,
  model text,
  created_at timestamptz default now()
);

create table public.ai_response_cache (
  prompt_hash text primary key,
  response text not null,
  model text,
  hit_count int default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index ai_cache_expires_idx on public.ai_response_cache (expires_at);

create table public.ai_usage_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null,
  tokens_in int,
  tokens_out int,
  cost_usd numeric(8,5),
  status text not null,                            -- ok | rate_limited | error
  error_message text,
  created_at timestamptz default now()
);

create index ai_usage_user_date_idx on public.ai_usage_log (user_id, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_log enable row level security;
-- ai_response_cache stays open to service-role only (no RLS policy = no public access)

create policy "ai_conv own" on public.ai_conversations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ai_msg follow conv" on public.ai_messages for all
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

create policy "ai_usage own read" on public.ai_usage_log for select using (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================
-- Auto-create profile when a new auth user appears
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Atleta')
  )
  on conflict (id) do nothing;
  insert into public.streaks (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Recompute total_volume_kg whenever a set is added/updated/deleted
create or replace function public.recompute_workout_volume()
returns trigger language plpgsql as $$
declare wid uuid;
begin
  select w.id into wid
  from public.workout_exercises we
  join public.workouts w on w.id = we.workout_id
  where we.id = coalesce(new.workout_exercise_id, old.workout_exercise_id);

  update public.workouts set total_volume_kg = (
    select coalesce(sum(s.reps * s.weight_kg), 0)
    from public.workout_sets s
    join public.workout_exercises we on we.id = s.workout_exercise_id
    where we.workout_id = wid and s.is_completed and not s.is_warmup
  ) where id = wid;

  return null;
end;
$$;

drop trigger if exists trg_recompute_volume on public.workout_sets;
create trigger trg_recompute_volume
  after insert or update or delete on public.workout_sets
  for each row execute procedure public.recompute_workout_volume();
