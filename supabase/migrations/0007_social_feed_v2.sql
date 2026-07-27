-- 0007 Social feed v2: comments, photos, share
--
-- (El prompt original pedía 0005_social_feed_v2.sql, pero 0005 ya está
--  aplicado e inmutable. Renumerado al siguiente slot disponible.)
--
-- Extiende el modelo de 0004_social_feed.sql:
--   · posts gana photo_url, share_count y el tipo 'manual'
--   · nueva tabla post_comments (1..500 chars)
--   · bucket storage 'post-photos' con políticas por prefijo de uid
--   · RPCs nuevas: publish_manual_post, add_comment, delete_comment,
--     list_comments, increment_share
--   · feed_for_user actualizada con photo_url, share_count, comment_count
--   · triggers rank_up / streak (definidos en 0004) intactos

-- =====================================================
-- A. Extender public.posts
-- =====================================================
alter table public.posts add column if not exists photo_url   text;
alter table public.posts add column if not exists share_count int  not null default 0;

-- Permitir posts manuales sin título (la card usa caption + photo).
alter table public.posts alter column title drop not null;

-- Refrescar el check de tipo para incluir 'manual'.
alter table public.posts drop constraint if exists posts_type_check;
alter table public.posts add  constraint posts_type_check
  check (type in ('workout','pr','rank_up','streak','achievement','manual'));

-- Relajar el límite de caption de 280 → 500 chars para alinear con
-- post_comments y con la composer UI.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.posts'::regclass
      and contype  = 'c'
      and pg_get_constraintdef(oid) ilike '%char_length(caption)%'
  loop
    execute format('alter table public.posts drop constraint %I', r.conname);
  end loop;
end$$;

alter table public.posts add constraint posts_caption_len_check
  check (caption is null or char_length(caption) <= 500);

-- =====================================================
-- B. Tabla post_comments
-- =====================================================
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts on delete cascade,
  user_id    uuid not null references auth.users  on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx
  on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

drop policy if exists "post_comments read auth"         on public.post_comments;
drop policy if exists "post_comments insert own"        on public.post_comments;
drop policy if exists "post_comments delete own or owner" on public.post_comments;

create policy "post_comments read auth"
  on public.post_comments for select to authenticated using (true);

create policy "post_comments insert own"
  on public.post_comments for insert to authenticated
  with check (user_id = auth.uid());

-- UPDATE: ninguna policy → inmutables.
create policy "post_comments delete own or owner"
  on public.post_comments for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.posts p
      where p.id = post_comments.post_id and p.user_id = auth.uid()
    )
  );

-- =====================================================
-- C. Storage bucket post-photos
-- =====================================================
insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', false)
on conflict (id) do nothing;

-- Subida: solo si el primer segmento del path es el uid del caller.
drop policy if exists "post-photos insert own prefix" on storage.objects;
create policy "post-photos insert own prefix"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lectura: cualquier authenticated (cliente firma URL con signed URL).
drop policy if exists "post-photos read auth" on storage.objects;
create policy "post-photos read auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'post-photos');

-- Borrado: solo dueño del prefijo.
drop policy if exists "post-photos delete own prefix" on storage.objects;
create policy "post-photos delete own prefix"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- D. RPCs
-- =====================================================

-- D.1 publish_manual_post(caption, photo_url) -> post.id
create or replace function public.publish_manual_post(caption text, photo_url text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_caption text := nullif(trim(coalesce(caption, '')), '');
  v_photo   text := nullif(trim(coalesce(photo_url, '')), '');
  v_post_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if v_caption is null and v_photo is null then
    raise exception 'manual post requires caption or photo' using errcode = '22023';
  end if;
  if v_caption is not null and char_length(v_caption) > 500 then
    raise exception 'caption too long' using errcode = '22023';
  end if;

  insert into public.posts (user_id, type, title, caption, photo_url, metadata)
  values (v_uid, 'manual', null, v_caption, v_photo, '{}'::jsonb)
  returning id into v_post_id;

  return v_post_id;
end;
$$;

grant execute on function public.publish_manual_post(text, text) to authenticated;

-- D.2 add_comment(post_id, body) -> comment.id
create or replace function public.add_comment(post_id uuid, body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_body text := trim(coalesce(body, ''));
  v_id   uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 500 then
    raise exception 'invalid comment length' using errcode = '22023';
  end if;
  if not exists (select 1 from public.posts p where p.id = add_comment.post_id) then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  insert into public.post_comments (post_id, user_id, body)
  values (add_comment.post_id, v_uid, v_body)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_comment(uuid, text) to authenticated;

-- D.3 delete_comment(comment_id) — autor del comentario o dueño del post
create or replace function public.delete_comment(comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_author     uuid;
  v_post_owner uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select c.user_id, p.user_id
    into v_author, v_post_owner
  from public.post_comments c
  join public.posts p on p.id = c.post_id
  where c.id = comment_id;

  if v_author is null then
    raise exception 'comment not found' using errcode = 'P0002';
  end if;
  if v_uid <> v_author and v_uid <> v_post_owner then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.post_comments where id = comment_id;
end;
$$;

grant execute on function public.delete_comment(uuid) to authenticated;

-- D.4 list_comments(post_id, lim) -> comentarios + autor
create or replace function public.list_comments(post_id uuid, lim int default 50)
returns table (
  id           uuid,
  post_id      uuid,
  user_id      uuid,
  body         text,
  created_at   timestamptz,
  username     text,
  display_name text,
  avatar_url   text,
  current_rank text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id, c.post_id, c.user_id, c.body, c.created_at,
    pr.username, pr.display_name, pr.avatar_url, pr.current_rank
  from public.post_comments c
  join public.profiles pr on pr.id = c.user_id
  where c.post_id = list_comments.post_id
  order by c.created_at asc
  limit greatest(1, least(coalesce(lim, 50), 200));
$$;

grant execute on function public.list_comments(uuid, int) to authenticated;

-- D.5 increment_share(post_id) -> nuevo share_count
create or replace function public.increment_share(post_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.posts
     set share_count = share_count + 1
   where id = increment_share.post_id
  returning share_count into v_new;

  if v_new is null then
    raise exception 'post not found' using errcode = 'P0002';
  end if;
  return v_new;
end;
$$;

grant execute on function public.increment_share(uuid) to authenticated;

-- D.6 feed_for_user — añade photo_url, share_count, comment_count.
-- Cambia el tipo de retorno → drop + recreate.
drop function if exists public.feed_for_user(timestamptz, int);

create or replace function public.feed_for_user(
  cursor_ts timestamptz default null,
  lim       int         default 20
) returns table (
  id            uuid,
  user_id       uuid,
  type          text,
  ref_id        uuid,
  title         text,
  subtitle      text,
  caption       text,
  photo_url     text,
  share_count   int,
  comment_count int,
  metadata      jsonb,
  created_at    timestamptz,
  username      text,
  display_name  text,
  avatar_url    text,
  current_rank  text,
  fire_count    int,
  muscle_count  int,
  clap_count    int,
  my_reactions  text[]
)
language sql
security definer
set search_path = public
stable
as $$
  with v as (
    select auth.uid() as uid,
           greatest(1, least(coalesce(lim, 20), 100)) as lim
  )
  select
    p.id, p.user_id, p.type, p.ref_id, p.title, p.subtitle, p.caption,
    p.photo_url,
    p.share_count,
    coalesce(cc.comment_count, 0)::int,
    p.metadata, p.created_at,
    pr.username, pr.display_name, pr.avatar_url, pr.current_rank,
    coalesce(rc.fire_count,   0)::int,
    coalesce(rc.muscle_count, 0)::int,
    coalesce(rc.clap_count,   0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  cross join v
  left join lateral (
    select
      count(*) filter (where r.type = 'fire')   as fire_count,
      count(*) filter (where r.type = 'muscle') as muscle_count,
      count(*) filter (where r.type = 'clap')   as clap_count
    from public.post_reactions r
    where r.post_id = p.id
  ) rc on true
  left join lateral (
    select array_agg(r.type) as types
    from public.post_reactions r
    where r.post_id = p.id and r.user_id = v.uid
  ) mr on true
  left join lateral (
    select count(*)::int as comment_count
    from public.post_comments cm
    where cm.post_id = p.id
  ) cc on true
  where (
       p.user_id = v.uid
    or p.user_id in (
         select following_id from public.follows where follower_id = v.uid
       )
  )
    and (feed_for_user.cursor_ts is null or p.created_at < feed_for_user.cursor_ts)
  order by p.created_at desc
  limit (select v.lim from v);
$$;

grant execute on function public.feed_for_user(timestamptz, int) to authenticated;

-- =====================================================
-- E. Triggers automáticos — verificación
-- =====================================================
-- Definidos en 0004_social_feed.sql:
--   · trg_publish_rank_up        (after insert on rank_history)
--   · trg_publish_streak_milestone (after update of current_weeks on streaks)
-- Ambos respetan profiles.auto_publish_achievements. Intactos.
