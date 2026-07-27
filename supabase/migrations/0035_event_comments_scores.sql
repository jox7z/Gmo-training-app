-- =============================================================
-- 0035_event_comments_scores.sql
-- event_comments tabla + RPCs + recompute_event_scores + trigger
-- + CREATE OR REPLACE join_event con backfill de score
-- =============================================================
-- Nota arquitectónica:
--   metric es etiqueta visual para el usuario (ej. "Total de repeticiones").
--   score = número de workouts completados (ended_at IS NOT NULL) cuyo
--   started_at cae dentro de [events.starts_at, coalesce(events.ends_at, 'infinity')].
--   Trigger en workouts mantiene score actualizado automáticamente.

-- ---------------------------------------------------------------
-- Tabla: event_comments
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_comments_event_created
  ON public.event_comments (event_id, created_at);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- RLS: select para autenticados
DROP POLICY IF EXISTS "event_comments select auth" ON public.event_comments;
CREATE POLICY "event_comments select auth"
ON public.event_comments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS: insert propio
DROP POLICY IF EXISTS "event_comments insert own" ON public.event_comments;
CREATE POLICY "event_comments insert own"
ON public.event_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS: delete autor o creador del evento
DROP POLICY IF EXISTS "event_comments delete author or creator" ON public.event_comments;
CREATE POLICY "event_comments delete author or creator"
ON public.event_comments FOR DELETE
USING (
  auth.uid() = user_id
  OR auth.uid() = (SELECT creator_id FROM public.events WHERE id = event_id)
);

-- ---------------------------------------------------------------
-- RPC: list_event_comments
-- Devuelve comentarios con datos de autor (igual que list_post_comments)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_event_comments(
  p_event_id uuid,
  lim        integer DEFAULT 100
)
RETURNS TABLE (
  id           uuid,
  event_id     uuid,
  user_id      uuid,
  body         text,
  created_at   timestamptz,
  username     text,
  display_name text,
  avatar_url   text,
  current_rank text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ec.id,
    ec.event_id,
    ec.user_id,
    ec.body,
    ec.created_at,
    p.username,
    p.display_name,
    p.avatar_url,
    p.current_rank
  FROM public.event_comments ec
  JOIN public.profiles p ON p.id = ec.user_id
  WHERE ec.event_id = p_event_id
  ORDER BY ec.created_at ASC
  LIMIT lim;
$$;

-- ---------------------------------------------------------------
-- RPC: add_event_comment
-- Inserta y devuelve la fila con datos de autor
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_event_comment(
  p_event_id uuid,
  p_body     text
)
RETURNS TABLE (
  id           uuid,
  event_id     uuid,
  user_id      uuid,
  body         text,
  created_at   timestamptz,
  username     text,
  display_name text,
  avatar_url   text,
  current_rank text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '28000';
  end if;
  if char_length(trim(p_body)) < 1 or char_length(p_body) > 500 then
    raise exception 'el comentario debe tener entre 1 y 500 caracteres' using errcode = '22023';
  end if;

  INSERT INTO public.event_comments (event_id, user_id, body)
  VALUES (p_event_id, v_uid, p_body)
  RETURNING id INTO v_id;

  RETURN QUERY
    SELECT
      ec.id,
      ec.event_id,
      ec.user_id,
      ec.body,
      ec.created_at,
      p.username,
      p.display_name,
      p.avatar_url,
      p.current_rank
    FROM public.event_comments ec
    JOIN public.profiles p ON p.id = ec.user_id
    WHERE ec.id = v_id;
end;
$$;

-- ---------------------------------------------------------------
-- RPC: delete_event_comment
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_event_comment(
  p_comment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid        uuid := auth.uid();
  v_comment    public.event_comments%rowtype;
  v_creator_id uuid;
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '28000';
  end if;

  SELECT * INTO v_comment FROM public.event_comments WHERE id = p_comment_id;
  if not found then
    raise exception 'comentario no encontrado' using errcode = 'P0002';
  end if;

  SELECT creator_id INTO v_creator_id FROM public.events WHERE id = v_comment.event_id;

  if v_uid <> v_comment.user_id AND v_uid <> v_creator_id then
    raise exception 'no tienes permiso para borrar este comentario' using errcode = '42501';
  end if;

  DELETE FROM public.event_comments WHERE id = p_comment_id;
end;
$$;

-- ---------------------------------------------------------------
-- Función: recompute_event_scores(p_user_id)
-- Score = nº workouts completados (ended_at IS NOT NULL) con
-- started_at dentro de [events.starts_at, coalesce(events.ends_at,'infinity')]
-- Solo aplica a retos (kind = 'challenge').
-- UPDATE idempotente.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_event_scores(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  UPDATE public.event_participants ep
  SET score = (
    SELECT count(*)
    FROM public.workouts w
    WHERE w.user_id    = p_user_id
      AND w.ended_at IS NOT NULL
      AND w.started_at >= e.starts_at
      AND w.started_at <  coalesce(e.ends_at, 'infinity'::timestamptz)
  )
  FROM public.events e
  WHERE ep.event_id = e.id
    AND ep.user_id  = p_user_id
    AND e.kind      = 'challenge';
end;
$$;

-- ---------------------------------------------------------------
-- Trigger en workouts: recalcula al completar (ended_at SET)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._trigger_recompute_event_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  -- Solo actua cuando ended_at pasa de NULL a NOT NULL
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR TG_OP = 'INSERT') THEN
    PERFORM public.recompute_event_scores(NEW.user_id);
  END IF;
  RETURN NEW;
end;
$$;

DROP TRIGGER IF EXISTS trg_workout_event_score ON public.workouts;
CREATE TRIGGER trg_workout_event_score
AFTER INSERT OR UPDATE OF ended_at ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public._trigger_recompute_event_scores();

-- ---------------------------------------------------------------
-- Seguridad: revocar ejecución de anon en funciones que requieren auth
-- (la función trigger tampoco debe ser callable via REST)
-- ---------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public._trigger_recompute_event_scores() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_event_scores(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_event_comments(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_event_comment(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_event_comment(uuid) FROM anon;

-- ---------------------------------------------------------------
-- CREATE OR REPLACE join_event
-- Definición original de 0014 + backfill de score al unirse
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.events where id = p_event_id) then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  insert into public.event_participants (event_id, user_id)
  values (p_event_id, v_uid)
  on conflict do nothing;

  -- Backfill de score para retos al momento de unirse
  PERFORM public.recompute_event_scores(v_uid);
end;
$$;
