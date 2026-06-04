-- 0028 Require user-supplied title for publish_workout and publish_pr
--
-- Changes:
--   publish_workout: new param p_title (required, max 80 chars).
--                    Title comes from the user instead of being auto-generated.
--   publish_pr:      new param p_title (required, max 80 chars).
--                    Title comes from the user; subtitle (X kg × Y reps) is kept.
--
-- Both RPCs drop the old 3-arg / 5-arg signatures and recreate with the new
-- 4-arg / 6-arg signatures so callers that omit p_title get a compile error,
-- not silent bad data.

-- =====================================================
-- 1. publish_workout(workout_id, p_title, caption, photo_url)
-- =====================================================
drop function if exists public.publish_workout(uuid, text, text);

create or replace function public.publish_workout(
  workout_id uuid,
  p_title    text,
  caption    text,
  photo_url  text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_owner    uuid;
  v_published bool;
  v_dur_sec  int;
  v_dur_min  int;
  v_started  timestamptz;
  v_ended    timestamptz;
  v_n_ex     int;
  v_muscle   text;
  v_title    text;
  v_post_id  uuid;
  v_caption  text := nullif(trim(coalesce(caption, '')), '');
  v_photo    text := nullif(trim(coalesce(photo_url, '')), '');
  v_prs      jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Validate user-supplied title
  v_title := nullif(trim(coalesce(p_title, '')), '');
  if v_title is null then
    raise exception 'title required' using errcode = '22023';
  end if;
  v_title := left(v_title, 80);

  select w.user_id, w.is_published, w.duration_seconds, w.started_at, w.ended_at
    into v_owner, v_published, v_dur_sec, v_started, v_ended
  from public.workouts w
  where w.id = workout_id;

  if v_owner is null then
    raise exception 'workout not found' using errcode = 'P0002';
  end if;
  if v_owner <> v_uid then
    raise exception 'not owner of workout' using errcode = '42501';
  end if;
  if v_published then
    raise exception 'workout already published' using errcode = '23505';
  end if;
  if v_caption is not null and char_length(v_caption) > 500 then
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

  -- Detect PRs: exercises where today's max weight beats all prior workouts
  select coalesce(jsonb_agg(pr_row), '[]'::jsonb) into v_prs
  from (
    with workout_bests as (
      select
        we.exercise_id,
        e.name                                                        as exercise_name,
        max(ws.weight_kg)                                             as max_weight,
        (array_agg(ws.reps order by ws.weight_kg desc nulls last))[1] as reps_at_max
      from public.workout_exercises we
      join public.workout_sets ws on ws.workout_exercise_id = we.id
      join public.exercises e    on e.id = we.exercise_id
      where we.workout_id = publish_workout.workout_id
        and ws.is_completed = true
        and coalesce(ws.is_warmup, false) = false
        and ws.weight_kg > 0
        and ws.reps > 0
      group by we.exercise_id, e.name
    ),
    historical_bests as (
      select
        we.exercise_id,
        max(ws.weight_kg) as max_weight
      from public.workout_exercises we
      join public.workout_sets ws on ws.workout_exercise_id = we.id
      join public.workouts w      on w.id = we.workout_id
      where w.user_id = v_uid
        and we.workout_id <> publish_workout.workout_id
        and ws.is_completed = true
        and coalesce(ws.is_warmup, false) = false
        and ws.weight_kg > 0
      group by we.exercise_id
    )
    select jsonb_build_object(
      'exercise_id',   wb.exercise_id,
      'exercise_name', wb.exercise_name,
      'weight_kg',     wb.max_weight,
      'reps',          wb.reps_at_max
    ) as pr_row
    from workout_bests wb
    left join historical_bests hb on hb.exercise_id = wb.exercise_id
    where wb.max_weight > coalesce(hb.max_weight, 0)
  ) prs;

  insert into public.posts (user_id, type, ref_id, title, subtitle, caption, photo_url, metadata)
  values (
    v_uid,
    'workout',
    workout_id,
    v_title,
    null,
    v_caption,
    v_photo,
    jsonb_build_object(
      'exercise_count', v_n_ex,
      'duration_min',   v_dur_min,
      'muscle_group',   v_muscle,
      'prs',            v_prs
    )
  )
  returning id into v_post_id;

  update public.workouts set is_published = true where id = workout_id;

  return v_post_id;
end;
$$;

grant execute on function public.publish_workout(uuid, text, text, text) to authenticated;

-- =====================================================
-- 2. publish_pr(exercise_id, p_title, weight_kg, reps, caption, photo_url)
-- =====================================================
drop function if exists public.publish_pr(text, numeric, int, text, text);

create or replace function public.publish_pr(
  exercise_id text,
  p_title     text,
  weight_kg   numeric,
  reps        int,
  caption     text,
  photo_url   text default null
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
  v_photo    text := nullif(trim(coalesce(photo_url, '')), '');
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Validate user-supplied title
  v_title := nullif(trim(coalesce(p_title, '')), '');
  if v_title is null then
    raise exception 'title required' using errcode = '22023';
  end if;
  v_title := left(v_title, 80);

  if weight_kg is null or weight_kg <= 0 then
    raise exception 'invalid weight_kg' using errcode = '22023';
  end if;
  if reps is null or reps <= 0 then
    raise exception 'invalid reps' using errcode = '22023';
  end if;
  if v_caption is not null and char_length(v_caption) > 500 then
    raise exception 'caption too long' using errcode = '22023';
  end if;

  select name into v_ex_name from public.exercises where id = exercise_id;
  if v_ex_name is null then
    raise exception 'exercise not found' using errcode = 'P0002';
  end if;

  -- User title; keep auto-generated subtitle with the weight/reps metrics
  v_subtitle := trim(to_char(weight_kg, 'FM9999990.##')) || ' kg × ' || reps || ' reps';

  insert into public.posts (user_id, type, ref_id, title, subtitle, caption, photo_url, metadata)
  values (
    v_uid,
    'pr',
    null,
    v_title,
    v_subtitle,
    v_caption,
    v_photo,
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

grant execute on function public.publish_pr(text, text, numeric, int, text, text) to authenticated;
