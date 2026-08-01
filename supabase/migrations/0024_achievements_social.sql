-- 0024 Achievements & social enhancements
--
-- 1. publish_workout: detect PRs in the workout and store in metadata.prs
-- 2. publish_streak: new RPC for manual streak sharing
-- 3. publish_rank_up_auto: include display_name in title for celebratory message

-- =====================================================
-- 1. Update publish_workout to detect PRs
-- =====================================================
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
  v_prs      jsonb := '[]'::jsonb;
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

  v_title := 'Entrenó ' || coalesce(v_muscle, 'sesión')
          || ' · ' || v_n_ex || ' ejercicios'
          || case when v_dur_min is not null
                  then ' · ' || v_dur_min || ' min'
                  else '' end;

  -- Detect PRs: exercises where today's max weight beats all prior workouts
  select coalesce(jsonb_agg(pr_row), '[]'::jsonb) into v_prs
  from (
    with workout_bests as (
      select
        we.exercise_id,
        e.name                                                      as exercise_name,
        max(ws.weight_kg)                                           as max_weight,
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

grant execute on function public.publish_workout(uuid, text, text) to authenticated;

-- =====================================================
-- 2. publish_streak: manual streak sharing RPC
-- =====================================================
create or replace function public.publish_streak(
  caption   text default null,
  photo_url text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_weeks   int;
  v_longest int;
  v_caption text := nullif(trim(coalesce(caption, '')), '');
  v_photo   text := nullif(trim(coalesce(photo_url, '')), '');
  v_post_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select current_weeks, longest_weeks
    into v_weeks, v_longest
  from public.streaks
  where user_id = v_uid;

  if v_weeks is null or v_weeks < 1 then
    raise exception 'no active streak to share' using errcode = 'P0003';
  end if;

  if v_caption is not null and char_length(v_caption) > 500 then
    raise exception 'caption too long' using errcode = '22023';
  end if;

  insert into public.posts (user_id, type, title, subtitle, caption, photo_url, metadata)
  values (
    v_uid,
    'streak',
    v_weeks || case when v_weeks = 1 then ' semana' else ' semanas' end || ' en racha',
    case
      when v_longest > v_weeks then 'Mejor racha: ' || v_longest || ' sem'
      when v_longest = v_weeks then '¡Mejor racha de todos los tiempos!'
      else null
    end,
    v_caption,
    v_photo,
    jsonb_build_object(
      'weeks',         v_weeks,
      'longest_weeks', v_longest
    )
  )
  returning id into v_post_id;

  return v_post_id;
end;
$$;

grant execute on function public.publish_streak(text, text) to authenticated;

-- =====================================================
-- 3. Update rank_up auto trigger to include display_name
-- =====================================================
create or replace function public.publish_rank_up_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_optin      boolean;
  v_name       text;
  v_rank_label text;
begin
  if new.from_rank is null or new.from_rank = new.to_rank then
    return new;
  end if;

  select auto_publish_achievements, display_name
    into v_optin, v_name
  from public.profiles where id = new.user_id;

  if not coalesce(v_optin, false) then
    return new;
  end if;

  v_rank_label := initcap(new.to_rank);
  v_name := coalesce(v_name, 'Atleta');

  insert into public.posts (user_id, type, ref_id, title, subtitle, metadata)
  values (
    new.user_id,
    'rank_up',
    new.id,
    v_name || ' alcanzó ' || v_rank_label,
    '¡Dale sus felicitaciones!',
    jsonb_build_object(
      'from_rank',    new.from_rank,
      'to_rank',      new.to_rank,
      'reason',       new.reason,
      'display_name', v_name
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_publish_rank_up on public.rank_history;
create trigger trg_publish_rank_up
  after insert on public.rank_history
  for each row execute procedure public.publish_rank_up_auto();
