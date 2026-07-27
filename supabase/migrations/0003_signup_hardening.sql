-- 0003 Signup hardening
-- Refines handle_new_user (replaces the version from 0001), adds username
-- format constraint, and exposes two RPCs the client uses during signup:
--   - check_username_available(uname)
--   - complete_signup(uname, display_name, weight_kg, height_cm, level, goal, weekly_goal_days)
--
-- RLS on profiles is already correct in 0001_init.sql:
--   SELECT  -> "profiles read public"  (using true)        OK
--   INSERT  -> "profiles insert own"   (check id=auth.uid) OK
--   UPDATE  -> "profiles update own"   (using id=auth.uid) OK
--   DELETE  -> no policy => denied by RLS                  OK
-- Nothing to add here.

-- =====================================================
-- A. Username format hardening
-- =====================================================
-- Normalize any pre-existing rows so the constraint can be applied cleanly.
update public.profiles
   set username = lower(username)
 where username <> lower(username);

alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add  constraint profiles_username_format
       check (username ~ '^[a-z0-9_]{3,20}$');

-- profiles.username already has UNIQUE from 0001 (column-level).

-- =====================================================
-- B. Refined handle_new_user trigger
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short_id text;
  v_username text;
  v_display  text;
begin
  v_short_id := substr(replace(new.id::text, '-', ''), 1, 15);

  v_username := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    v_username := 'user_' || v_short_id;
  end if;

  v_display := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  if v_display is null then
    v_display := 'Atleta';
  end if;

  insert into public.profiles (
    id,
    username,
    display_name,
    weekly_goal_days,
    rank_points,
    current_rank
  ) values (
    new.id,
    v_username,
    v_display,
    4,
    0,
    'bronze'
  )
  on conflict (id) do nothing;

  insert into public.streaks (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- Re-attach defensively (no-op if already attached from 0001).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- C. check_username_available(uname)
-- =====================================================
-- Returns true only if the (normalized) username matches the format
-- AND no profile currently holds it. Safe to call before the user is
-- authenticated (granted to anon).
create or replace function public.check_username_available(uname text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_norm text := lower(trim(coalesce(uname, '')));
begin
  if v_norm !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;

  return not exists (
    select 1 from public.profiles where username = v_norm
  );
end;
$$;

grant execute on function public.check_username_available(text) to anon, authenticated;

-- =====================================================
-- D. complete_signup(...)
-- =====================================================
-- Writes the post-signup onboarding payload onto the caller's own profile.
-- security definer + explicit WHERE id = auth.uid() means a user can only
-- ever modify their own row even though the function bypasses RLS.
create or replace function public.complete_signup(
  uname             text,
  display_name      text,
  weight_kg         numeric,
  height_cm         numeric,
  level             text,
  goal              text,
  weekly_goal_days  int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_username text := lower(trim(coalesce(uname, '')));
  v_display  text := nullif(trim(coalesce(display_name, '')), '');
  v_weight   numeric := weight_kg;
  v_height   numeric := height_cm;
  v_level    text := level;
  v_goal     text := goal;
  v_wgd      int  := weekly_goal_days;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid username format' using errcode = '22023';
  end if;

  if v_level is not null and v_level not in ('beginner','intermediate','advanced') then
    raise exception 'invalid experience level' using errcode = '22023';
  end if;

  if v_goal is not null and v_goal not in ('strength','hypertrophy','fat_loss','general') then
    raise exception 'invalid goal' using errcode = '22023';
  end if;

  if v_wgd is not null and (v_wgd < 1 or v_wgd > 7) then
    raise exception 'weekly_goal_days out of range' using errcode = '22023';
  end if;

  -- Reject only if some OTHER profile already owns the username
  -- (a user re-running complete_signup with their current username is fine).
  if exists (
    select 1 from public.profiles
    where username = v_username and id <> v_uid
  ) then
    raise exception 'username taken' using errcode = '23505';
  end if;

  update public.profiles p
     set username         = v_username,
         display_name     = coalesce(v_display, p.display_name),
         weight_kg        = coalesce(v_weight,  p.weight_kg),
         height_cm        = coalesce(v_height,  p.height_cm),
         experience_level = coalesce(v_level,   p.experience_level),
         goal             = coalesce(v_goal,    p.goal),
         weekly_goal_days = coalesce(v_wgd,     p.weekly_goal_days)
   where p.id = v_uid;

  if not found then
    raise exception 'profile row missing for user %', v_uid using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.complete_signup(text, text, numeric, numeric, text, text, int) to authenticated;
