alter table public.profiles
  add column if not exists goals text[];

update public.profiles
set goals = array[coalesce(goal, 'hypertrophy')]
where goals is null;

alter table public.profiles
  alter column goals set default array['hypertrophy']::text[];

alter table public.profiles
  alter column goals set not null;

alter table public.profiles
  drop constraint if exists profiles_goals_valid;

alter table public.profiles
  add constraint profiles_goals_valid check (
    array_length(goals, 1) between 1 and 4
    and goals <@ array['strength','hypertrophy','fat_loss','general']::text[]
  );

create or replace function public.sync_profile_goals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.goal is distinct from old.goal
     and new.goals is not distinct from old.goals then
    new.goals := array[new.goal];
  end if;

  if new.goals is null or array_length(new.goals, 1) is null then
    new.goals := array[coalesce(new.goal, 'hypertrophy')];
  end if;

  new.goal := new.goals[1];
  return new;
end;
$$;

revoke execute on function public.sync_profile_goals() from anon, authenticated;

drop trigger if exists trg_sync_profile_goals on public.profiles;
create trigger trg_sync_profile_goals
  before insert or update on public.profiles
  for each row execute function public.sync_profile_goals();

drop function if exists public.complete_signup(
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  int
);

create or replace function public.complete_signup(
  uname             text,
  display_name      text,
  weight_kg         numeric,
  height_cm         numeric,
  level             text,
  goal              text,
  weekly_goal_days  int,
  goals             text[] default null
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
  v_goals    text[] := goals;
  v_goal     text := goal;
  v_wgd      int := weekly_goal_days;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid username format' using errcode = '22023';
  end if;

  if v_level is not null
     and v_level not in ('beginner','intermediate','advanced') then
    raise exception 'invalid experience level' using errcode = '22023';
  end if;

  if v_goals is null or array_length(v_goals, 1) is null then
    v_goals := case when v_goal is null then null else array[v_goal] end;
  end if;

  if v_goals is not null then
    if array_length(v_goals, 1) > 4
       or not (
         v_goals <@
         array['strength','hypertrophy','fat_loss','general']::text[]
       ) then
      raise exception 'invalid goal' using errcode = '22023';
    end if;
    v_goal := v_goals[1];
  end if;

  if v_wgd is not null and (v_wgd < 1 or v_wgd > 7) then
    raise exception 'weekly_goal_days out of range' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.profiles
    where username = v_username
      and id <> v_uid
  ) then
    raise exception 'username taken' using errcode = '23505';
  end if;

  insert into public.profiles (
    id,
    username,
    display_name,
    weight_kg,
    height_cm,
    experience_level,
    goal,
    goals,
    weekly_goal_days,
    rank_points,
    current_rank,
    unit_preference,
    sex
  ) values (
    v_uid,
    v_username,
    coalesce(v_display, 'Atleta'),
    v_weight,
    v_height,
    v_level,
    v_goal,
    coalesce(v_goals, array['hypertrophy']::text[]),
    coalesce(v_wgd, 4),
    0,
    'bronze',
    'kg',
    'male'
  )
  on conflict (id) do update set
    username = excluded.username,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    weight_kg = coalesce(excluded.weight_kg, profiles.weight_kg),
    height_cm = coalesce(excluded.height_cm, profiles.height_cm),
    experience_level =
      coalesce(excluded.experience_level, profiles.experience_level),
    goal = coalesce(v_goal, profiles.goal),
    goals = coalesce(v_goals, profiles.goals),
    weekly_goal_days =
      coalesce(excluded.weekly_goal_days, profiles.weekly_goal_days);

  insert into public.streaks (user_id)
  values (v_uid)
  on conflict do nothing;
end;
$$;

revoke execute on function public.complete_signup(
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  int,
  text[]
) from anon;

grant execute on function public.complete_signup(
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  int,
  text[]
) to authenticated;
