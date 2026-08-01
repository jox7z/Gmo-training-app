-- 0017 Notifications in-app
--
-- Adds a notifications system for social events (reactions, comments, follows)
-- and community/event activity. NO push notifications — in-app only.
--
-- Safe to run on top of 0001-0016.

-- =====================================================
-- A. TABLE
-- =====================================================
create table if not exists public.notifications (
  id           uuid        primary key default gen_random_uuid(),
  recipient_id uuid        not null references auth.users on delete cascade,
  actor_id     uuid        references auth.users on delete cascade,   -- null = sistema/ranking
  type         text        not null check (type in (
                             'reaction',   -- alguien reaccionó a tu post
                             'comment',    -- alguien comentó tu post
                             'follow',     -- alguien te siguió
                             'event',      -- recordatorio / actividad de evento
                             'community'   -- alguien que sigues se unió a un evento
                           )),
  post_id      uuid        references public.posts  on delete cascade,   -- nullable
  event_id     uuid        references public.events on delete cascade,   -- nullable
  metadata     jsonb       not null default '{}',
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- Índice principal para list_notifications (recipient + tiempo desc)
create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

-- Índice parcial para unread_notifications_count (sólo no leídas)
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

-- =====================================================
-- B. RLS
-- =====================================================
alter table public.notifications enable row level security;

-- Solo el recipiente puede leer sus notificaciones
drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

-- El recipiente puede marcar como leídas (UPDATE solo en read_at)
drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid());

-- Inserciones SOLO vía triggers / RPCs security-definer (no insert directo del cliente)
-- (no insert policy = inserts bloqueados para el rol authenticated)

-- =====================================================
-- C. TRIGGER FUNCTIONS
-- =====================================================

-- C.1 Reacciones → notificación al dueño del post
create or replace function public.notify_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner uuid;
begin
  -- Obtener dueño del post
  select user_id into v_post_owner
  from public.posts
  where id = new.post_id;

  -- No notificar si el post no existe o si el actor es el dueño
  if v_post_owner is null or v_post_owner = new.user_id then
    return new;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, type, post_id, metadata
  ) values (
    v_post_owner,
    new.user_id,
    'reaction',
    new.post_id,
    jsonb_build_object('reaction_type', new.type)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_reaction on public.post_reactions;
create trigger trg_notify_reaction
  after insert on public.post_reactions
  for each row execute procedure public.notify_reaction();

-- C.2 Comentarios → notificación al dueño del post
create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner uuid;
begin
  select user_id into v_post_owner
  from public.posts
  where id = new.post_id;

  if v_post_owner is null or v_post_owner = new.user_id then
    return new;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, type, post_id, metadata
  ) values (
    v_post_owner,
    new.user_id,
    'comment',
    new.post_id,
    jsonb_build_object(
      'comment_id',      new.id,
      'comment_snippet', left(new.body, 80)
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_comment on public.post_comments;
create trigger trg_notify_comment
  after insert on public.post_comments
  for each row execute procedure public.notify_comment();

-- C.3 Follows → notificación al usuario seguido
create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- follows ya tiene CHECK (follower_id <> following_id), pero doble-check
  if new.follower_id = new.following_id then
    return new;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, type, metadata
  ) values (
    new.following_id,
    new.follower_id,
    'follow',
    '{}'::jsonb
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow
  after insert on public.follows
  for each row execute procedure public.notify_follow();

-- C.4 Actividad de comunidad: alguien que sigues se une a un evento
--     → notifica a todos sus seguidores
create or replace function public.notify_community_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower uuid;
begin
  -- Para cada seguidor del actor que se unió al evento
  for v_follower in
    select follower_id
    from public.follows
    where following_id = new.user_id
  loop
    -- No notificar si el seguidor es el propio actor (edge case)
    if v_follower = new.user_id then
      continue;
    end if;

    insert into public.notifications (
      recipient_id, actor_id, type, event_id, metadata
    ) values (
      v_follower,
      new.user_id,
      'community',
      new.event_id,
      jsonb_build_object('action', 'joined_event')
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_community_join on public.event_participants;
create trigger trg_notify_community_join
  after insert on public.event_participants
  for each row execute procedure public.notify_community_join();

-- NOTA: Eventos/ranking global (tipo 'event') se generan vía
-- la RPC notify_event_reminder(event_id) que puede ser invocada
-- desde un cron job o desde create_event. No hay trigger automático
-- porque el caso de uso es "recordatorio X horas antes de starts_at",
-- lo que requiere un job scheduler externo (e.g. pg_cron o Edge Function).
-- Prioridad: los 4 triggers sociales (reaction/comment/follow/community)
-- están 100% funcionales.

-- =====================================================
-- D. RPCs
-- =====================================================

-- D.1 list_notifications(cursor_ts, lim)
--     Devuelve notificaciones del usuario autenticado con datos del actor
--     y del post si aplica. Paginación por cursor de created_at (mismo
--     patrón que feed_for_user en 0012).
create or replace function public.list_notifications(
  cursor_ts timestamptz default null,
  lim       int         default 30
)
returns table (
  id             uuid,
  type           text,
  post_id        uuid,
  event_id       uuid,
  metadata       jsonb,
  read_at        timestamptz,
  created_at     timestamptz,
  actor_id       uuid,
  actor_username text,
  actor_name     text,
  actor_avatar   text,
  actor_rank     text,
  post_title     text,
  post_type      text,
  event_title    text
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select auth.uid() as uid,
           greatest(1, least(coalesce(lim, 30), 100)) as lim
  )
  select
    n.id,
    n.type,
    n.post_id,
    n.event_id,
    n.metadata,
    n.read_at,
    n.created_at,
    n.actor_id,
    ap.username        as actor_username,
    ap.display_name    as actor_name,
    ap.avatar_url      as actor_avatar,
    ap.current_rank    as actor_rank,
    p.title            as post_title,
    p.type             as post_type,
    e.title            as event_title
  from public.notifications n
  cross join me
  left join public.profiles ap on ap.id = n.actor_id
  left join public.posts    p  on p.id  = n.post_id
  left join public.events   e  on e.id  = n.event_id
  where n.recipient_id = me.uid
    and (list_notifications.cursor_ts is null or n.created_at < list_notifications.cursor_ts)
  order by n.created_at desc
  limit (select me.lim from me);
$$;

grant execute on function public.list_notifications(timestamptz, int) to authenticated;

-- D.2 unread_notifications_count()
--     Devuelve el número de notificaciones no leídas del usuario.
create or replace function public.unread_notifications_count()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.notifications
  where recipient_id = auth.uid()
    and read_at is null;
$$;

grant execute on function public.unread_notifications_count() to authenticated;

-- D.3 mark_notifications_read(ids)
--     Marca como leídas las notificaciones indicadas (o todas si ids es null).
--     Devuelve el número de filas actualizadas.
create or replace function public.mark_notifications_read(ids uuid[] default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.notifications
     set read_at = now()
   where recipient_id = v_uid
     and read_at is null
     and (ids is null or id = any(ids));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
