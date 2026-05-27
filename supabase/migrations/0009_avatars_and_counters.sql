-- 0009 Avatars bucket + profile_counters + progress_summary overflow fix
--
-- · Bucket público 'avatars' (URLs directas, sin TTL) separado de post-photos.
-- · RPC profile_counters: 3 contadores en un solo round-trip.
-- · CREATE OR REPLACE de progress_summary (definida en 0008) con
--   v_total_* declarados como bigint para evitar overflow a largo plazo.
--   0008 sigue siendo inmutable; solo se sobreescribe el cuerpo desde aquí.

-- =====================================================
-- A. Bucket 'avatars' (público) + policies
-- =====================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars insert own prefix" on storage.objects;
create policy "avatars insert own prefix"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars update own prefix" on storage.objects;
create policy "avatars update own prefix"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars delete own prefix" on storage.objects;
create policy "avatars delete own prefix"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lectura pública por diseño (bucket público; las URLs no caducan).
drop policy if exists "avatars read public" on storage.objects;
create policy "avatars read public"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

-- =====================================================
-- B. RPC profile_counters(target_user_id) -> jsonb
-- =====================================================
create or replace function public.profile_counters(target_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'followers', (select count(*) from public.follows where following_id = target_user_id),
    'following', (select count(*) from public.follows where follower_id  = target_user_id),
    'posts',     (select count(*) from public.posts   where user_id      = target_user_id)
  );
$$;

grant execute on function public.profile_counters(uuid) to authenticated;

-- =====================================================
-- C. progress_summary — overflow preventivo (int → bigint)
-- =====================================================
-- Re-creación completa con v_total_active / v_total_rest / v_total_reps
-- declarados como bigint. Los demás contadores se castean al construir
-- el jsonb final para mantener el contrato hacia el cliente.
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
  v_total_active   bigint;
  v_total_rest     bigint;
  v_total_reps     bigint;
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
    select min(started_at) into v_start
      from public.workouts where user_id = v_uid;
    if v_start is null then
      v_start := v_end;
    end if;
  end if;

  select
    count(*),
    coalesce(sum(total_active_seconds), 0)::bigint,
    coalesce(sum(total_rest_seconds),   0)::bigint,
    coalesce(sum(total_reps),           0)::bigint
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
    'total_active_seconds', v_total_active::numeric,
    'total_rest_seconds',   v_total_rest::numeric,
    'total_reps',           v_total_reps::numeric,
    'total_weight_kg',      v_total_weight,
    'avg_set_duration',     v_avg_set_dur,
    'avg_rest_after',       v_avg_rest,
    'workouts_per_week',    v_per_week
  );
end;
$$;

grant execute on function public.progress_summary(text) to authenticated;

-- =====================================================
-- VERIFICAR — superficie nueva para Backend
-- =====================================================
-- Bucket Storage:
--   avatars  (public=true)
--     · Policies: insert/update/delete por prefijo {auth.uid()}/...
--     · SELECT: público (URLs directas sin TTL)
--
-- RPC nueva (grant execute → authenticated):
--   public.profile_counters(target_user_id uuid) returns jsonb
--     keys: followers (int), following (int), posts (int)
--     No filtra por auth.uid(); los conteos son públicos.
--
-- RPC modificada:
--   public.progress_summary(period text) — mismo contrato externo.
--     Internamente v_total_active / v_total_rest / v_total_reps pasan a
--     bigint; el jsonb los expone como numeric (rango efectivamente
--     ilimitado para el cliente).
--
-- Checkpoint manual tras aplicar la migración:
--   1. Storage → bucket 'avatars' visible y marcado público.
--   2. SQL Editor:
--        select public.profile_counters('<uuid-de-prueba>');
--      debe devolver un jsonb con las 3 keys (followers/following/posts),
--      todas en 0 si el uuid no tiene actividad.
