-- ---------------------------------------------------------------
-- get_event(p_event_id uuid)
-- Retorna un único evento enriquecido (mismo shape que list_events).
-- Usado por useEvent como fallback directo en lugar de cargar
-- todos los eventos con list_events('all').
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_event(p_event_id uuid)
RETURNS TABLE (
  id                uuid,
  kind              text,
  title             text,
  description       text,
  cover_url         text,
  location          text,
  metric            text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  created_at        timestamptz,
  creator_id        uuid,
  creator_username  text,
  creator_name      text,
  participant_count int,
  is_joined         boolean,
  is_creator        boolean,
  community_id      uuid,
  community_name    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'no autenticado' USING errcode = '28000';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.kind,
    e.title,
    e.description,
    e.cover_url,
    e.location,
    e.metric,
    e.starts_at,
    e.ends_at,
    e.created_at,
    e.creator_id,
    cp.username  AS creator_username,
    cp.display_name AS creator_name,
    COALESCE(pc.cnt, 0)::int AS participant_count,
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = e.id AND ep.user_id = v_uid
    ) AS is_joined,
    (e.creator_id = v_uid) AS is_creator,
    e.community_id,
    comm.name AS community_name
  FROM public.events e
  JOIN  public.profiles cp ON cp.id = e.creator_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS cnt
    FROM public.event_participants ep
    WHERE ep.event_id = e.id
  ) pc ON true
  LEFT JOIN public.communities comm ON comm.id = e.community_id
  WHERE e.id = p_event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_event(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_event(uuid) TO authenticated;
