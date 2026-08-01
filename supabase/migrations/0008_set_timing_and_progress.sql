-- 0008 Set-level timing + progress aggregates
--
-- · workout_sets: duration_seconds + rest_after_seconds (nullable; null =
--   desconocido, válido para sets viejos previos a este sprint).
-- · workouts: totales pre-calculados (total_reps, total_rest_seconds,
--   total_active_seconds) que el cliente envía en saveWorkout para evitar
--   agregaciones pesadas en cada vista de Progreso.
-- · RPCs progress_summary / progress_timeline para la pantalla Progreso.

-- =====================================================
-- A. workout_sets — timing granular por serie
-- =====================================================
alter table public.workout_sets
  add column if not exists duration_seconds   int,
  add column if not exists rest_after_seconds int;

-- =====================================================
-- B. workouts — totales pre-calculados
-- =====================================================
alter table public.workouts
  add column if not exists total_reps           int not null default 0,
  add column if not exists total_rest_seconds   int not null default 0,
  add column if not exists total_active_seconds int not null default 0;

-- =====================================================
-- C. RPC progress_summary(period) -> jsonb
-- =====================================================
create or replace function public.progress_summary(period text default '30d')
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid            uuid := auth.uid();
  v_end            timestamptz := now();
  v_start          timestamptz;
  v_days           numeric;
  v_total_workouts int;
  v_total_active   int;
  v_total_rest     int;
  v_total_reps     int;
  v_total_weight   numeric;
  v_avg_set_dur    numeric;
  v_avg_rest       numeric;
  v_per_week       numeric;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if period not in ('7d','30d','90d','all') then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  if period = '7d' then
    v_start := v_end - interval '7 days';
  elsif period = '30d' then
    v_start := v_end - interval '30 days';
  elsif period = '90d' then
    v_start := v_end - interval '90 days';
  else
    -- 'all': desde el primer workout del usuario; si no hay, devuelve ceros.
    select min(started_at) into v_start
      from public.workouts where user_id = v_uid;
    if v_start is null then
      v_start := v_end;
    end if;
  end if;

  select
    count(*),
    coalesce(sum(total_active_seconds), 0),
    coalesce(sum(total_rest_seconds),   0),
    coalesce(sum(total_reps),           0)
  into v_total_workouts, v_total_active, v_total_rest, v_total_reps
  from public.workouts
  where user_id = v_uid
    and started_at >= v_start
    and started_at <= v_end;

  select coalesce(sum(s.reps * s.weight_kg), 0)
    into v_total_weight
  from public.workout_sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  join public.workouts w           on w.id  = we.workout_id
  where w.user_id   = v_uid
    and w.started_at >= v_start
    and w.started_at <= v_end
    and s.is_completed
    and not s.is_warmup;

  select
    avg(s.duration_seconds)   filter (where s.duration_seconds   is not null),
    avg(s.rest_after_seconds) filter (where s.rest_after_seconds is not null)
  into v_avg_set_dur, v_avg_rest
  from public.workout_sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  join public.workouts w           on w.id  = we.workout_id
  where w.user_id   = v_uid
    and w.started_at >= v_start
    and w.started_at <= v_end
    and s.is_completed
    and not s.is_warmup;

  v_days     := greatest(1, extract(epoch from (v_end - v_start)) / 86400.0);
  v_per_week := v_total_workouts::numeric * 7.0 / v_days;

  return jsonb_build_object(
    'total_workouts',       v_total_workouts,
    'total_active_seconds', v_total_active,
    'total_rest_seconds',   v_total_rest,
    'total_reps',           v_total_reps,
    'total_weight_kg',      v_total_weight,
    'avg_set_duration',     v_avg_set_dur,
    'avg_rest_after',       v_avg_rest,
    'workouts_per_week',    v_per_week
  );
end;
$$;

grant execute on function public.progress_summary(text) to authenticated;

-- =====================================================
-- D. RPC progress_timeline(period) -> serie diaria
-- =====================================================
create or replace function public.progress_timeline(period text default '30d')
returns table (
  day            date,
  workouts       int,
  active_seconds int,
  reps           int,
  weight_kg      numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid   uuid := auth.uid();
  v_start date;
  v_end   date := current_date;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if period not in ('7d','30d','90d','all') then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  if period = '7d' then
    v_start := v_end - 6;
  elsif period = '30d' then
    v_start := v_end - 29;
  elsif period = '90d' then
    v_start := v_end - 89;
  else
    select coalesce(min(started_at)::date, v_end)
      into v_start
    from public.workouts where user_id = v_uid;
  end if;

  return query
  with days as (
    select d::date as day
    from generate_series(v_start, v_end, interval '1 day') d
  ),
  per_day as (
    select
      w.started_at::date                         as day,
      count(*)::int                              as workouts,
      coalesce(sum(w.total_active_seconds), 0)::int as active_seconds,
      coalesce(sum(w.total_reps),           0)::int as reps
    from public.workouts w
    where w.user_id = v_uid
      and w.started_at::date between v_start and v_end
    group by w.started_at::date
  ),
  weight_per_day as (
    select
      w.started_at::date                                 as day,
      coalesce(sum(s.reps * s.weight_kg), 0)::numeric    as weight_kg
    from public.workout_sets s
    join public.workout_exercises we on we.id = s.workout_exercise_id
    join public.workouts w           on w.id  = we.workout_id
    where w.user_id = v_uid
      and w.started_at::date between v_start and v_end
      and s.is_completed
      and not s.is_warmup
    group by w.started_at::date
  )
  select
    d.day,
    coalesce(p.workouts,        0)::int,
    coalesce(p.active_seconds,  0)::int,
    coalesce(p.reps,            0)::int,
    coalesce(wd.weight_kg,      0)::numeric
  from days d
  left join per_day        p  on p.day  = d.day
  left join weight_per_day wd on wd.day = d.day
  order by d.day asc;
end;
$$;

grant execute on function public.progress_timeline(text) to authenticated;

-- =====================================================
-- VERIFICAR — superficie nueva para Backend
-- =====================================================
-- Columnas nuevas:
--   public.workout_sets.duration_seconds         int       null  (segundos de la serie)
--   public.workout_sets.rest_after_seconds       int       null  (segundos de descanso posterior; null si fue la última)
--   public.workouts.total_reps                   int       not null default 0
--   public.workouts.total_rest_seconds           int       not null default 0
--   public.workouts.total_active_seconds         int       not null default 0
--
-- RPCs nuevas (grant execute → authenticated):
--   public.progress_summary(period text default '30d') returns jsonb
--     period ∈ {'7d','30d','90d','all'}
--     jsonb keys:
--       total_workouts         int
--       total_active_seconds   int
--       total_rest_seconds     int
--       total_reps             int
--       total_weight_kg        numeric    (Σ reps*weight_kg de sets completados, no-warmup)
--       avg_set_duration       numeric    (avg de duration_seconds donde no null)
--       avg_rest_after         numeric    (avg de rest_after_seconds donde no null)
--       workouts_per_week      numeric    (proyección lineal a 7 días)
--
--   public.progress_timeline(period text default '30d') returns table(
--     day            date,
--     workouts       int,
--     active_seconds int,
--     reps           int,
--     weight_kg      numeric
--   )
--     Una fila por día del período, ordenada asc. Días sin workouts → ceros.
--
-- RLS: ambas son security definer + filtran por auth.uid() explícitamente;
-- no requieren policies extra sobre workouts/workout_sets.
