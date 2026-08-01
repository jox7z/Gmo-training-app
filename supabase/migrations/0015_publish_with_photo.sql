-- 0015 Pass photo_url at creation time in publish_workout / publish_pr
--
-- Root cause: WorkoutComposer and PrComposer uploaded a photo then called
-- setPostPhoto() which does posts.UPDATE.  There is no UPDATE RLS policy on
-- public.posts (by design — see 0004 comment "no UPDATE policy → updates
-- denied even to the owner"), so the update was silently rejected and the
-- photo was lost.
--
-- Fix: add a trailing `photo_url text default null` param to both RPCs so the
-- photo is written at INSERT time (same pattern as publish_manual_post).
-- The `default null` keeps backward compatibility with callers that omit it.
--
-- Because adding a parameter to an existing function in Postgres creates a new
-- overload rather than replacing the old one, we drop the old signatures first
-- to avoid ambiguity errors, then recreate with the new signature, and
-- re-grant execute.

-- =====================================================
-- publish_workout(workout_id, caption, photo_url)
-- =====================================================
drop function if exists public.publish_workout(uuid, text);

create or replace function public.publish_workout(
  workout_id uuid,
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
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select w.user_id, w.duration_seconds, w.started_at, w.ended_at
    into v_owner, v_dur_sec, v_started, v_ended
  from public.workouts w
  where w.id = workout_id;

  if v_owner is null then
    raise exception 'workout not found' using errcode = 'P0002';
  end if;
  if v_owner <> v_uid then
    raise exception 'not owner of workout' using errcode = '42501';
  end if;
  if v_caption is not null and char_length(v_caption) > 280 then
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

  v_title := 'Entrenó ' || coalesce(v_muscle, 'sesión')
          || ' · ' || v_n_ex || ' ejercicios'
          || case when v_dur_min is not null
                  then ' · ' || v_dur_min || ' min'
                  else '' end;

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
      'muscle_group',   v_muscle
    )
  )
  returning id into v_post_id;

  return v_post_id;
end;
$$;

grant execute on function public.publish_workout(uuid, text, text) to authenticated;

-- =====================================================
-- publish_pr(exercise_id, weight_kg, reps, caption, photo_url)
-- =====================================================
drop function if exists public.publish_pr(text, numeric, int, text);

create or replace function public.publish_pr(
  exercise_id text,
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
  if weight_kg is null or weight_kg <= 0 then
    raise exception 'invalid weight_kg' using errcode = '22023';
  end if;
  if reps is null or reps <= 0 then
    raise exception 'invalid reps' using errcode = '22023';
  end if;
  if v_caption is not null and char_length(v_caption) > 280 then
    raise exception 'caption too long' using errcode = '22023';
  end if;

  select name into v_ex_name from public.exercises where id = exercise_id;
  if v_ex_name is null then
    raise exception 'exercise not found' using errcode = 'P0002';
  end if;

  v_title    := 'Nuevo PR en ' || v_ex_name;
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

grant execute on function public.publish_pr(text, numeric, int, text, text) to authenticated;
