-- Extiende el RPC transaccional de 0041-0043 con los campos desplegados por
-- 0049/0050. Conserva advisory lock, ownership, reconstrucción atómica de hijos
-- y publicación monotónica dentro de la implementación v1.

alter function public.sync_workout_snapshot(uuid, jsonb)
  rename to sync_workout_snapshot_v1;

revoke all on function public.sync_workout_snapshot_v1(uuid, jsonb)
  from public, anon, authenticated, service_role;

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
  v_exercise record;
  v_group record;
  v_clean_exercises jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'snapshot must be an object' using errcode = '22023';
  end if;
  if jsonb_typeof(p_snapshot -> 'exercises') <> 'array' then
    raise exception 'exercises must be an array' using errcode = '22023';
  end if;

  for v_exercise in
    select value, ordinality::int as ordinal
    from jsonb_array_elements(p_snapshot -> 'exercises') with ordinality
  loop
    if jsonb_typeof(v_exercise.value) <> 'object' then
      raise exception 'each exercise must be an object' using errcode = '22023';
    end if;

    if exists (
      select 1
      from jsonb_object_keys(v_exercise.value) as keys(key)
      where key <> all (
        array[
          'exercise_id',
          'superset_group_id',
          'group_rest_enabled',
          'sets'
        ]
      )
    ) then
      raise exception 'exercise contains unsupported fields' using errcode = '22023';
    end if;

    if v_exercise.value ? 'superset_group_id'
       and jsonb_typeof(v_exercise.value -> 'superset_group_id') <> 'null' then
      if jsonb_typeof(v_exercise.value -> 'superset_group_id') <> 'string'
         or not pg_input_is_valid(
           v_exercise.value ->> 'superset_group_id',
           'uuid'
         ) then
        raise exception 'superset_group_id must be a UUID string or null'
          using errcode = '22023';
      end if;
    end if;

    if v_exercise.value ? 'group_rest_enabled'
       and jsonb_typeof(v_exercise.value -> 'group_rest_enabled') <> 'boolean' then
      raise exception 'group_rest_enabled must be a boolean'
        using errcode = '22023';
    end if;

    if (
      not (v_exercise.value ? 'superset_group_id')
      or jsonb_typeof(v_exercise.value -> 'superset_group_id') = 'null'
    ) and coalesce(
      (v_exercise.value ->> 'group_rest_enabled')::boolean,
      false
    ) then
      raise exception 'group_rest_enabled requires superset_group_id'
        using errcode = '22023';
    end if;
  end loop;

  -- Grupo válido: 2-4 miembros contiguos y un solo modo de descanso.
  for v_group in
    select
      value ->> 'superset_group_id' as group_id,
      count(*)::int as member_count,
      min(ordinality)::int as first_ordinal,
      max(ordinality)::int as last_ordinal,
      count(
        distinct coalesce(
          (value ->> 'group_rest_enabled')::boolean,
          false
        )
      )::int as rest_modes
    from jsonb_array_elements(p_snapshot -> 'exercises') with ordinality
    where value ? 'superset_group_id'
      and jsonb_typeof(value -> 'superset_group_id') <> 'null'
    group by value ->> 'superset_group_id'
  loop
    if v_group.member_count < 2 or v_group.member_count > 4 then
      raise exception 'superset groups must contain between 2 and 4 exercises'
        using errcode = '22023';
    end if;
    if v_group.last_ordinal - v_group.first_ordinal + 1 <> v_group.member_count then
      raise exception 'superset group members must be contiguous'
        using errcode = '22023';
    end if;
    if v_group.rest_modes <> 1 then
      raise exception 'superset group members must share group_rest_enabled'
        using errcode = '22023';
    end if;
  end loop;

  -- La v1 conserva toda validación previa y ejecuta el rebuild bajo un mismo
  -- advisory transaction lock. Solo se eliminan los dos campos que no conocía.
  select coalesce(
    jsonb_agg(
      value - 'superset_group_id' - 'group_rest_enabled'
      order by ordinality
    ),
    '[]'::jsonb
  )
  into v_clean_exercises
  from jsonb_array_elements(p_snapshot -> 'exercises') with ordinality;

  perform public.sync_workout_snapshot_v1(
    p_workout_id,
    jsonb_set(p_snapshot, '{exercises}', v_clean_exercises, false)
  );

  -- La posición es determinista en v1: ordinality - 1.
  update public.workout_exercises we
  set
    superset_group_id = case
      when jsonb_typeof(src.value -> 'superset_group_id') = 'string'
        then (src.value ->> 'superset_group_id')::uuid
      else null
    end,
    group_rest_enabled = coalesce(
      (src.value ->> 'group_rest_enabled')::boolean,
      false
    )
  from (
    select value, (ordinality - 1)::int as position
    from jsonb_array_elements(p_snapshot -> 'exercises') with ordinality
  ) src
  where we.workout_id = p_workout_id
    and we.position = src.position;
end;
$$;

revoke all on function public.sync_workout_snapshot(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.sync_workout_snapshot(uuid, jsonb)
  to authenticated;
