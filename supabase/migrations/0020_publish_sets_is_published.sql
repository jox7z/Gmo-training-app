-- 0020 publish_workout: marcar workouts.is_published = true + guard anti-duplicado
--
-- Problema: el RPC original no actualizaba workouts.is_published tras publicar,
-- permitiendo publicar el mismo workout múltiples veces y creando posts duplicados.
-- Solución: añadir v_published al SELECT inicial, lanzar excepción si ya está
-- publicado, y hacer UPDATE workouts SET is_published = true tras el INSERT.
--
-- v_dur_min se mueve al bloque declare exterior para eliminar el sub-bloque
-- declare anidado del RPC anterior.

drop function if exists public.publish_workout(uuid, text, text);

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
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

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

  update public.workouts set is_published = true where id = workout_id;

  return v_post_id;
end;
$$;

grant execute on function public.publish_workout(uuid, text, text) to authenticated;
