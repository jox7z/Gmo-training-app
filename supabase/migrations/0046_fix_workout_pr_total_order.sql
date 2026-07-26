-- Corrige detección de PR cuando varios workouts comparten started_at.
-- El baseline usa orden total estable por (started_at, created_at, id).
-- Reinstala el contrato completo de 0045 sin ampliar privilegios.

create or replace function public.publish_workout(
  workout_id uuid,
  p_title    text,
  caption    text,
  photo_url  text default null
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid              uuid := auth.uid();
  v_owner            uuid;
  v_published        boolean;
  v_stored_duration  int;
  v_duration_seconds int;
  v_duration_min     int;
  v_started          timestamptz;
  v_created_at       timestamptz;
  v_ended            timestamptz;
  v_exercise_count   int := 0;
  v_working_sets     int := 0;
  v_total_reps       bigint := 0;
  v_volume_kg        numeric := 0;
  v_primary_muscle   text;
  v_muscle_groups    jsonb := '[]'::jsonb;
  v_exercises        jsonb := '[]'::jsonb;
  v_title            text;
  v_post_id          uuid;
  v_caption          text := nullif(trim(coalesce(caption, '')), '');
  v_photo            text := nullif(trim(coalesce(photo_url, '')), '');
  v_prs              jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_title := nullif(trim(coalesce(p_title, '')), '');
  if v_title is null then
    raise exception 'title required' using errcode = '22023';
  end if;
  v_title := left(v_title, 80);

  -- Serializa publicación con syncs/reintentos concurrentes del mismo workout.
  select
    w.user_id,
    w.is_published,
    w.duration_seconds,
    w.started_at,
    w.created_at,
    w.ended_at
    into
      v_owner,
      v_published,
      v_stored_duration,
      v_started,
      v_created_at,
      v_ended
  from public.workouts w
  where w.id = workout_id
  for update;

  if v_owner is null then
    raise exception 'workout not found' using errcode = 'P0002';
  end if;
  if v_owner <> v_uid then
    raise exception 'not owner of workout' using errcode = '42501';
  end if;
  if coalesce(v_published, false) then
    raise exception 'workout already published' using errcode = '23505';
  end if;
  if v_caption is not null and char_length(v_caption) > 500 then
    raise exception 'caption too long' using errcode = '22023';
  end if;

  v_duration_seconds := case
    when v_stored_duration is not null and v_stored_duration >= 0
      then v_stored_duration
    when v_ended is not null and v_ended >= v_started
      then floor(extract(epoch from (v_ended - v_started)))::int
    else null
  end;
  v_duration_min := case
    when v_duration_seconds is not null then v_duration_seconds / 60
    else null
  end;

  -- Una sola pasada produce resumen y detalle por ejercicio. Series warmup,
  -- pendientes o fuera de 1..999 reps / 0..1000 kg quedan fuera.
  with exercise_metrics as (
    select
      we.exercise_id,
      we.position,
      e.name,
      e.muscle_group,
      count(*)::int as working_set_count,
      sum(ws.reps)::bigint as total_reps,
      sum(ws.weight_kg * ws.reps)::numeric as volume_kg
    from public.workout_exercises we
    join public.workout_sets ws on ws.workout_exercise_id = we.id
    join public.exercises e on e.id = we.exercise_id
    where we.workout_id = publish_workout.workout_id
      and ws.is_completed = true
      and coalesce(ws.is_warmup, false) = false
      and ws.reps between 1 and 999
      and ws.weight_kg between 0 and 1000
    group by we.id, we.exercise_id, we.position, e.name, e.muscle_group
  ),
  muscle_metrics as (
    select
      em.muscle_group,
      sum(em.working_set_count)::bigint as working_set_count,
      min(em.position) as first_position
    from exercise_metrics em
    where nullif(trim(em.muscle_group), '') is not null
    group by em.muscle_group
  )
  select
    count(*)::int,
    coalesce(sum(em.working_set_count), 0)::int,
    coalesce(sum(em.total_reps), 0)::bigint,
    coalesce(sum(em.volume_kg), 0)::numeric,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'exercise_id', em.exercise_id,
          'name', em.name,
          'muscle_group', em.muscle_group,
          'working_set_count', em.working_set_count,
          'total_reps', em.total_reps,
          'volume_kg', em.volume_kg
        ) order by em.position, em.exercise_id
      ),
      '[]'::jsonb
    ),
    (
      select mm.muscle_group
      from muscle_metrics mm
      order by mm.working_set_count desc, mm.first_position, mm.muscle_group
      limit 1
    ),
    coalesce(
      (
        select jsonb_agg(
          mm.muscle_group
          order by mm.working_set_count desc, mm.first_position, mm.muscle_group
        )
        from muscle_metrics mm
      ),
      '[]'::jsonb
    )
    into
      v_exercise_count,
      v_working_sets,
      v_total_reps,
      v_volume_kg,
      v_exercises,
      v_primary_muscle,
      v_muscle_groups
  from exercise_metrics em;

  -- PRs usan baseline estrictamente anterior por orden total estable.
  select coalesce(jsonb_agg(pr_row order by exercise_id), '[]'::jsonb) into v_prs
  from (
    with workout_bests as (
      select
        we.exercise_id,
        e.name as exercise_name,
        max(ws.weight_kg) as max_weight,
        (
          array_agg(
            ws.reps
            order by
              ws.weight_kg desc nulls last,
              ws.reps desc,
              we.position,
              ws.set_index,
              we.id,
              ws.id
          )
        )[1] as reps_at_max
      from public.workout_exercises we
      join public.workout_sets ws on ws.workout_exercise_id = we.id
      join public.exercises e on e.id = we.exercise_id
      where we.workout_id = publish_workout.workout_id
        and ws.is_completed = true
        and coalesce(ws.is_warmup, false) = false
        and ws.reps between 1 and 999
        and ws.weight_kg > 0
        and ws.weight_kg <= 1000
      group by we.exercise_id, e.name
    ),
    historical_bests as (
      select
        we.exercise_id,
        max(ws.weight_kg) as max_weight
      from public.workout_exercises we
      join public.workout_sets ws on ws.workout_exercise_id = we.id
      join public.workouts w on w.id = we.workout_id
      where w.user_id = v_uid
        and (w.started_at, coalesce(w.created_at, w.started_at), w.id)
          < (v_started, coalesce(v_created_at, v_started), workout_id)
        and ws.is_completed = true
        and coalesce(ws.is_warmup, false) = false
        and ws.reps between 1 and 999
        and ws.weight_kg > 0
        and ws.weight_kg <= 1000
      group by we.exercise_id
    )
    select
      wb.exercise_id,
      jsonb_build_object(
        'exercise_id', wb.exercise_id,
        'exercise_name', wb.exercise_name,
        'weight_kg', wb.max_weight,
        'reps', wb.reps_at_max
      ) as pr_row
    from workout_bests wb
    left join historical_bests hb on hb.exercise_id = wb.exercise_id
    where wb.max_weight > coalesce(hb.max_weight, 0)
  ) prs;

  insert into public.posts (
    user_id,
    type,
    ref_id,
    title,
    subtitle,
    caption,
    photo_url,
    metadata
  )
  values (
    v_uid,
    'workout',
    workout_id,
    v_title,
    null,
    v_caption,
    v_photo,
    jsonb_build_object(
      -- Legacy
      'exercise_count', v_exercise_count,
      'duration_min', v_duration_min,
      'muscle_group', v_primary_muscle,
      'prs', v_prs,
      -- Contrato enriquecido
      'duration_seconds', v_duration_seconds,
      'working_set_count', v_working_sets,
      'total_reps', v_total_reps,
      'volume_kg', v_volume_kg,
      'muscle_groups', v_muscle_groups,
      'exercises', v_exercises
    )
  )
  returning id into v_post_id;

  -- Monotónico: publicación solo puede pasar de false a true.
  update public.workouts
  set is_published = true
  where id = workout_id;

  return v_post_id;
end;
$$;

-- CREATE OR REPLACE no debe heredar acceso público implícito.
revoke all on function public.publish_workout(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_workout(uuid, text, text, text)
  to authenticated;
