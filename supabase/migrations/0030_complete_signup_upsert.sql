-- 0030 Reescribe complete_signup como upsert idempotente.
-- Sustituye el UPDATE + "profile row missing" de 0003 por un INSERT ... ON CONFLICT DO UPDATE.
-- Así funciona aunque el trigger handle_new_user no haya insertado la fila aún
-- (p.ej. cuentas huérfanas recreadas o tests).
-- Todos los parámetros, validaciones y campos de 0003 se conservan.

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

  -- Rechazar solo si OTRO perfil tiene el username (re-run con el mismo username está ok).
  if exists (
    select 1 from public.profiles
    where username = v_username and id <> v_uid
  ) then
    raise exception 'username taken' using errcode = '23505';
  end if;

  -- Upsert: inserta la fila si no existe (cuentas sin trigger o recreadas),
  -- o actualiza si ya existe. Columnas NOT NULL sin parámetro usan defaults
  -- del trigger (rank_points=0, current_rank='bronze', unit_preference='kg', sex='male').
  insert into public.profiles (
    id,
    username,
    display_name,
    weight_kg,
    height_cm,
    experience_level,
    goal,
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
    coalesce(v_wgd, 4),
    0,
    'bronze',
    'kg',
    'male'
  )
  on conflict (id) do update set
    username         = excluded.username,
    display_name     = coalesce(excluded.display_name, profiles.display_name),
    weight_kg        = coalesce(excluded.weight_kg,    profiles.weight_kg),
    height_cm        = coalesce(excluded.height_cm,    profiles.height_cm),
    experience_level = coalesce(excluded.experience_level, profiles.experience_level),
    goal             = coalesce(excluded.goal,         profiles.goal),
    weekly_goal_days = coalesce(excluded.weekly_goal_days, profiles.weekly_goal_days);

  -- Garantizar fila de streaks (puede faltar si el trigger no la creó).
  insert into public.streaks (user_id) values (v_uid) on conflict do nothing;
end;
$$;

grant execute on function public.complete_signup(text, text, numeric, numeric, text, text, int) to authenticated;
