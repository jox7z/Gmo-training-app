-- Reinstala de forma determinista el RPC final para proyectos que aplicaron
-- una versión de 0041 donde un snapshot stale podía revertir la publicación.

create or replace function public.sync_workout_snapshot(
  p_workout_id uuid,
  p_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid                  uuid := auth.uid();
  v_existing_owner       uuid;
  v_started_at           timestamptz;
  v_ended_at             timestamptz;
  v_duration_seconds     int;
  v_total_reps           int;
  v_total_rest_seconds   int;
  v_total_active_seconds int;
  v_feeling              text;
  v_is_published         boolean;
  v_number               numeric;
  v_exercise             record;
  v_set                  record;
  v_exercise_id          text;
  v_workout_exercise_id  uuid;
  v_reps                  int;
  v_weight_kg             numeric(6,2);
  v_rpe                   numeric(3,1);
  v_is_warmup             boolean;
  v_is_completed          boolean;
  v_set_duration          int;
  v_rest_after            int;
  v_set_count             int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_workout_id is null then
    raise exception 'workout id is required' using errcode = '22023';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'snapshot must be an object' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_snapshot) as keys(key)
    where key <> all (array[
      'started_at',
      'ended_at',
      'duration_seconds',
      'total_reps',
      'total_rest_seconds',
      'total_active_seconds',
      'feeling',
      'is_published',
      'exercises'
    ])
  ) then
    raise exception 'snapshot contains unsupported fields' using errcode = '22023';
  end if;

  if jsonb_typeof(p_snapshot -> 'started_at') <> 'string' then
    raise exception 'started_at must be an ISO timestamp' using errcode = '22023';
  end if;
  v_started_at := (p_snapshot ->> 'started_at')::timestamptz;
  if not isfinite(v_started_at) then
    raise exception 'started_at must be finite' using errcode = '22023';
  end if;

  if p_snapshot ? 'ended_at' and jsonb_typeof(p_snapshot -> 'ended_at') <> 'null' then
    if jsonb_typeof(p_snapshot -> 'ended_at') <> 'string' then
      raise exception 'ended_at must be an ISO timestamp or null' using errcode = '22023';
    end if;
    v_ended_at := (p_snapshot ->> 'ended_at')::timestamptz;
    if not isfinite(v_ended_at) or v_ended_at < v_started_at then
      raise exception 'ended_at must be finite and not precede started_at' using errcode = '22023';
    end if;
  else
    v_ended_at := null;
  end if;

  if p_snapshot ? 'duration_seconds'
     and jsonb_typeof(p_snapshot -> 'duration_seconds') <> 'null' then
    if jsonb_typeof(p_snapshot -> 'duration_seconds') <> 'number' then
      raise exception 'duration_seconds must be a non-negative integer or null' using errcode = '22023';
    end if;
    v_number := (p_snapshot ->> 'duration_seconds')::numeric;
    if v_number <> trunc(v_number) or v_number < 0 or v_number > 2147483647 then
      raise exception 'duration_seconds must be a non-negative integer or null' using errcode = '22023';
    end if;
    v_duration_seconds := v_number::int;
  else
    v_duration_seconds := null;
  end if;

  if jsonb_typeof(p_snapshot -> 'total_reps') <> 'number' then
    raise exception 'total_reps must be a non-negative integer' using errcode = '22023';
  end if;
  v_number := (p_snapshot ->> 'total_reps')::numeric;
  if v_number <> trunc(v_number) or v_number < 0 or v_number > 2147483647 then
    raise exception 'total_reps must be a non-negative integer' using errcode = '22023';
  end if;
  v_total_reps := v_number::int;

  if jsonb_typeof(p_snapshot -> 'total_rest_seconds') <> 'number' then
    raise exception 'total_rest_seconds must be a non-negative integer' using errcode = '22023';
  end if;
  v_number := (p_snapshot ->> 'total_rest_seconds')::numeric;
  if v_number <> trunc(v_number) or v_number < 0 or v_number > 2147483647 then
    raise exception 'total_rest_seconds must be a non-negative integer' using errcode = '22023';
  end if;
  v_total_rest_seconds := v_number::int;

  if jsonb_typeof(p_snapshot -> 'total_active_seconds') <> 'number' then
    raise exception 'total_active_seconds must be a non-negative integer' using errcode = '22023';
  end if;
  v_number := (p_snapshot ->> 'total_active_seconds')::numeric;
  if v_number <> trunc(v_number) or v_number < 0 or v_number > 2147483647 then
    raise exception 'total_active_seconds must be a non-negative integer' using errcode = '22023';
  end if;
  v_total_active_seconds := v_number::int;

  if p_snapshot ? 'feeling' and jsonb_typeof(p_snapshot -> 'feeling') <> 'null' then
    if jsonb_typeof(p_snapshot -> 'feeling') <> 'string' then
      raise exception 'feeling must be a supported value or null' using errcode = '22023';
    end if;
    v_feeling := p_snapshot ->> 'feeling';
    if v_feeling <> all (array['great', 'good', 'tired', 'bad']) then
      raise exception 'feeling must be a supported value or null' using errcode = '22023';
    end if;
  else
    v_feeling := null;
  end if;

  if jsonb_typeof(p_snapshot -> 'is_published') <> 'boolean' then
    raise exception 'is_published must be a boolean' using errcode = '22023';
  end if;
  v_is_published := (p_snapshot ->> 'is_published')::boolean;

  if jsonb_typeof(p_snapshot -> 'exercises') <> 'array' then
    raise exception 'exercises must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_snapshot -> 'exercises') > 200 then
    raise exception 'snapshot has too many exercises' using errcode = '22023';
  end if;

  -- Un mismo workout toma siempre el mismo lock, incluso entre sesiones.
  perform pg_advisory_xact_lock(hashtextextended(p_workout_id::text, 0));

  select user_id
    into v_existing_owner
  from public.workouts
  where id = p_workout_id;

  if v_existing_owner is not null and v_existing_owner <> v_uid then
    raise exception 'workout belongs to another user' using errcode = '42501';
  end if;

  insert into public.workouts (
    id,
    user_id,
    routine_day_id,
    started_at,
    ended_at,
    duration_seconds,
    total_reps,
    total_rest_seconds,
    total_active_seconds,
    feeling,
    is_published
  )
  values (
    p_workout_id,
    v_uid,
    null,
    v_started_at,
    v_ended_at,
    v_duration_seconds,
    v_total_reps,
    v_total_rest_seconds,
    v_total_active_seconds,
    v_feeling,
    v_is_published
  )
  on conflict (id) do update
  set
    routine_day_id = excluded.routine_day_id,
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    duration_seconds = excluded.duration_seconds,
    total_reps = excluded.total_reps,
    total_rest_seconds = excluded.total_rest_seconds,
    total_active_seconds = excluded.total_active_seconds,
    feeling = excluded.feeling,
    -- Publicación es monotónica: un snapshot local stale nunca despublica.
    is_published = coalesce(public.workouts.is_published, false)
                   or excluded.is_published;

  -- workout_sets cae por ON DELETE CASCADE.
  delete from public.workout_exercises
  where workout_id = p_workout_id;

  for v_exercise in
    select value, (ordinality - 1)::int as position
    from jsonb_array_elements(p_snapshot -> 'exercises') with ordinality
  loop
    if jsonb_typeof(v_exercise.value) <> 'object' then
      raise exception 'each exercise must be an object' using errcode = '22023';
    end if;
    if exists (
      select 1
      from jsonb_object_keys(v_exercise.value) as keys(key)
      where key <> all (array['exercise_id', 'sets'])
    ) then
      raise exception 'exercise contains unsupported fields' using errcode = '22023';
    end if;
    if jsonb_typeof(v_exercise.value -> 'exercise_id') <> 'string' then
      raise exception 'exercise_id must be a string' using errcode = '22023';
    end if;
    v_exercise_id := v_exercise.value ->> 'exercise_id';
    if length(v_exercise_id) = 0 or length(v_exercise_id) > 200 then
      raise exception 'exercise_id has invalid length' using errcode = '22023';
    end if;
    if jsonb_typeof(v_exercise.value -> 'sets') <> 'array' then
      raise exception 'exercise sets must be an array' using errcode = '22023';
    end if;
    if jsonb_array_length(v_exercise.value -> 'sets') > 100 then
      raise exception 'exercise has too many sets' using errcode = '22023';
    end if;

    insert into public.workout_exercises (workout_id, exercise_id, position)
    values (p_workout_id, v_exercise_id, v_exercise.position)
    returning id into v_workout_exercise_id;

    for v_set in
      select value, (ordinality - 1)::int as set_index
      from jsonb_array_elements(v_exercise.value -> 'sets') with ordinality
    loop
      v_set_count := v_set_count + 1;
      if v_set_count > 5000 then
        raise exception 'snapshot has too many sets' using errcode = '22023';
      end if;

      if jsonb_typeof(v_set.value) <> 'object' then
        raise exception 'each set must be an object' using errcode = '22023';
      end if;
      if exists (
        select 1
        from jsonb_object_keys(v_set.value) as keys(key)
        where key <> all (array[
          'reps',
          'weight_kg',
          'rpe',
          'is_warmup',
          'is_completed',
          'duration_seconds',
          'rest_after_seconds'
        ])
      ) then
        raise exception 'set contains unsupported fields' using errcode = '22023';
      end if;

      if jsonb_typeof(v_set.value -> 'is_completed') <> 'boolean'
         or jsonb_typeof(v_set.value -> 'is_warmup') <> 'boolean' then
        raise exception 'set completion flags must be booleans' using errcode = '22023';
      end if;
      v_is_completed := (v_set.value ->> 'is_completed')::boolean;
      v_is_warmup := (v_set.value ->> 'is_warmup')::boolean;

      if jsonb_typeof(v_set.value -> 'reps') <> 'number' then
        raise exception 'set reps must be an integer between 0 and 999' using errcode = '22023';
      end if;
      v_number := (v_set.value ->> 'reps')::numeric;
      if v_number <> trunc(v_number)
         or v_number < (case when v_is_completed then 1 else 0 end)
         or v_number > 999 then
        raise exception 'set reps are outside the supported range' using errcode = '22023';
      end if;
      v_reps := v_number::int;

      if jsonb_typeof(v_set.value -> 'weight_kg') <> 'number' then
        raise exception 'weight_kg must be a number between 0 and 1000' using errcode = '22023';
      end if;
      v_number := (v_set.value ->> 'weight_kg')::numeric;
      if v_number < 0 or v_number > 1000 then
        raise exception 'weight_kg is outside the supported range' using errcode = '22023';
      end if;
      v_weight_kg := v_number::numeric(6,2);

      if v_set.value ? 'rpe' and jsonb_typeof(v_set.value -> 'rpe') <> 'null' then
        if jsonb_typeof(v_set.value -> 'rpe') <> 'number' then
          raise exception 'rpe must be a number between 0 and 10 or null' using errcode = '22023';
        end if;
        v_number := (v_set.value ->> 'rpe')::numeric;
        if v_number < 0 or v_number > 10 then
          raise exception 'rpe is outside the supported range' using errcode = '22023';
        end if;
        v_rpe := v_number::numeric(3,1);
      else
        v_rpe := null;
      end if;

      if v_set.value ? 'duration_seconds'
         and jsonb_typeof(v_set.value -> 'duration_seconds') <> 'null' then
        if jsonb_typeof(v_set.value -> 'duration_seconds') <> 'number' then
          raise exception 'set duration_seconds must be a non-negative integer or null' using errcode = '22023';
        end if;
        v_number := (v_set.value ->> 'duration_seconds')::numeric;
        if v_number <> trunc(v_number) or v_number < 0 or v_number > 2147483647 then
          raise exception 'set duration_seconds must be a non-negative integer or null' using errcode = '22023';
        end if;
        v_set_duration := v_number::int;
      else
        v_set_duration := null;
      end if;

      if v_set.value ? 'rest_after_seconds'
         and jsonb_typeof(v_set.value -> 'rest_after_seconds') <> 'null' then
        if jsonb_typeof(v_set.value -> 'rest_after_seconds') <> 'number' then
          raise exception 'rest_after_seconds must be a non-negative integer or null' using errcode = '22023';
        end if;
        v_number := (v_set.value ->> 'rest_after_seconds')::numeric;
        if v_number <> trunc(v_number) or v_number < 0 or v_number > 2147483647 then
          raise exception 'rest_after_seconds must be a non-negative integer or null' using errcode = '22023';
        end if;
        v_rest_after := v_number::int;
      else
        v_rest_after := null;
      end if;

      insert into public.workout_sets (
        workout_exercise_id,
        set_index,
        reps,
        weight_kg,
        rpe,
        is_warmup,
        is_completed,
        duration_seconds,
        rest_after_seconds
      )
      values (
        v_workout_exercise_id,
        v_set.set_index,
        v_reps,
        v_weight_kg,
        v_rpe,
        v_is_warmup,
        v_is_completed,
        v_set_duration,
        v_rest_after
      );
    end loop;
  end loop;
end;
$$;

-- Supabase puede otorgar EXECUTE explícito por default privileges al crear routines.
revoke all on function public.sync_workout_snapshot(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.sync_workout_snapshot(uuid, jsonb) to authenticated;
