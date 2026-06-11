-- ============================================================
-- 0036_communities.sql
-- Tablas: communities, community_members
-- Helpers SECURITY DEFINER: is_active_member, can_access_community, community_role
-- RPCs: list_communities, get_community, create_community, update_community,
--        delete_community, join_community, leave_community,
--        list_community_members, set_member_role, remove_member,
--        approve_member, reject_member
-- ============================================================

-- ────────────────────────────────────────────
-- TABLAS
-- ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS communities (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL CHECK (char_length(name) BETWEEN 3 AND 50),
  description  text        CHECK (char_length(description) <= 500),
  cover_url    text,
  is_private   boolean     NOT NULL DEFAULT false,
  creator_id   uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_members (
  community_id uuid        NOT NULL REFERENCES communities ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users  ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'member'
                           CHECK (role IN ('owner','moderator','member')),
  status       text        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('pending','active')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_user
  ON community_members (user_id);

-- ────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────

ALTER TABLE communities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- communities: cualquier autenticado puede ver metadata (incluyendo privadas en búsqueda)
DROP POLICY IF EXISTS "communities_select" ON communities;
CREATE POLICY "communities_select" ON communities
  FOR SELECT TO authenticated USING (true);

-- communities: insert solo el propio creator
DROP POLICY IF EXISTS "communities_insert" ON communities;
CREATE POLICY "communities_insert" ON communities
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

-- communities: update owner o moderador (validado también en RPC)
DROP POLICY IF EXISTS "communities_update" ON communities;
CREATE POLICY "communities_update" ON communities
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner','moderator')
        AND cm.status = 'active'
    )
  );

-- communities: delete solo owner (validado también en RPC)
DROP POLICY IF EXISTS "communities_delete" ON communities;
CREATE POLICY "communities_delete" ON communities
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- community_members: cualquier autenticado puede ver filas (RPCs filtran pending)
DROP POLICY IF EXISTS "community_members_select" ON community_members;
CREATE POLICY "community_members_select" ON community_members
  FOR SELECT TO authenticated USING (true);

-- Sin policies de INSERT/UPDATE/DELETE directas; solo vía RPCs SECURITY DEFINER

-- ────────────────────────────────────────────
-- HELPERS SECURITY DEFINER
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_active_member(
  p_community uuid,
  p_user      uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community
      AND user_id      = p_user
      AND status       = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION can_access_community(p_community uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM communities WHERE id = p_community AND NOT is_private
  )
  OR is_active_member(p_community, auth.uid());
$$;

CREATE OR REPLACE FUNCTION community_role(p_community uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM community_members
  WHERE community_id = p_community
    AND user_id      = auth.uid()
    AND status       = 'active';
$$;

REVOKE EXECUTE ON FUNCTION is_active_member(uuid, uuid)   FROM anon;
REVOKE EXECUTE ON FUNCTION can_access_community(uuid)     FROM anon;
REVOKE EXECUTE ON FUNCTION community_role(uuid)           FROM anon;

-- ────────────────────────────────────────────
-- RPCs
-- ────────────────────────────────────────────

-- list_communities
CREATE OR REPLACE FUNCTION list_communities(
  p_filter text    DEFAULT 'all',   -- 'all' | 'mine' | 'joined'
  p_search text    DEFAULT NULL,
  lim      integer DEFAULT 50
)
RETURNS TABLE (
  id           uuid,
  name         text,
  description  text,
  cover_url    text,
  is_private   boolean,
  creator_id   uuid,
  created_at   timestamptz,
  member_count bigint,
  is_member    boolean,
  my_role      text,
  my_status    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.cover_url,
    c.is_private,
    c.creator_id,
    c.created_at,
    COALESCE((
      SELECT COUNT(*) FROM community_members cm2
      WHERE cm2.community_id = c.id AND cm2.status = 'active'
    ), 0)::bigint AS member_count,
    EXISTS (
      SELECT 1 FROM community_members cm3
      WHERE cm3.community_id = c.id AND cm3.user_id = v_uid AND cm3.status = 'active'
    ) AS is_member,
    (SELECT cm4.role FROM community_members cm4
     WHERE cm4.community_id = c.id AND cm4.user_id = v_uid) AS my_role,
    (SELECT cm5.status FROM community_members cm5
     WHERE cm5.community_id = c.id AND cm5.user_id = v_uid) AS my_status
  FROM communities c
  WHERE
    -- filtro de tab
    (
      p_filter = 'all'    OR
      (p_filter = 'mine'   AND c.creator_id = v_uid) OR
      (p_filter = 'joined' AND EXISTS (
        SELECT 1 FROM community_members cmj
        WHERE cmj.community_id = c.id AND cmj.user_id = v_uid AND cmj.status = 'active'
      ))
    )
    -- búsqueda
    AND (
      p_search IS NULL OR p_search = '' OR
      c.name ILIKE '%' || p_search || '%' OR
      c.description ILIKE '%' || p_search || '%'
    )
  ORDER BY c.created_at DESC
  LIMIT lim;
END;
$$;

REVOKE EXECUTE ON FUNCTION list_communities(text, text, integer) FROM anon;

-- get_community
CREATE OR REPLACE FUNCTION get_community(p_id uuid)
RETURNS TABLE (
  id           uuid,
  name         text,
  description  text,
  cover_url    text,
  is_private   boolean,
  creator_id   uuid,
  created_at   timestamptz,
  member_count bigint,
  is_member    boolean,
  my_role      text,
  my_status    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.cover_url,
    c.is_private,
    c.creator_id,
    c.created_at,
    COALESCE((
      SELECT COUNT(*) FROM community_members cm2
      WHERE cm2.community_id = c.id AND cm2.status = 'active'
    ), 0)::bigint AS member_count,
    EXISTS (
      SELECT 1 FROM community_members cm3
      WHERE cm3.community_id = c.id AND cm3.user_id = v_uid AND cm3.status = 'active'
    ) AS is_member,
    (SELECT cm4.role FROM community_members cm4
     WHERE cm4.community_id = c.id AND cm4.user_id = v_uid) AS my_role,
    (SELECT cm5.status FROM community_members cm5
     WHERE cm5.community_id = c.id AND cm5.user_id = v_uid) AS my_status
  FROM communities c
  WHERE c.id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_community(uuid) FROM anon;

-- create_community
CREATE OR REPLACE FUNCTION create_community(
  p_name        text,
  p_description text    DEFAULT NULL,
  p_cover_url   text    DEFAULT NULL,
  p_is_private  boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_id   uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF char_length(trim(p_name)) < 3 OR char_length(trim(p_name)) > 50 THEN
    RAISE EXCEPTION 'El nombre debe tener entre 3 y 50 caracteres';
  END IF;
  IF p_description IS NOT NULL AND char_length(p_description) > 500 THEN
    RAISE EXCEPTION 'La descripción no puede superar los 500 caracteres';
  END IF;

  INSERT INTO communities (name, description, cover_url, is_private, creator_id)
  VALUES (trim(p_name), p_description, p_cover_url, p_is_private, v_uid)
  RETURNING id INTO v_id;

  INSERT INTO community_members (community_id, user_id, role, status)
  VALUES (v_id, v_uid, 'owner', 'active');

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_community(text, text, text, boolean) FROM anon;

-- update_community
CREATE OR REPLACE FUNCTION update_community(
  p_id          uuid,
  p_name        text    DEFAULT NULL,
  p_description text    DEFAULT NULL,
  p_cover_url   text    DEFAULT NULL,
  p_is_private  boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_id
      AND user_id = v_uid
      AND role IN ('owner','moderator')
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Solo el owner o moderador puede editar esta comunidad';
  END IF;
  IF p_name IS NOT NULL AND (char_length(trim(p_name)) < 3 OR char_length(trim(p_name)) > 50) THEN
    RAISE EXCEPTION 'El nombre debe tener entre 3 y 50 caracteres';
  END IF;

  UPDATE communities SET
    name        = COALESCE(p_name,        name),
    description = COALESCE(p_description, description),
    cover_url   = COALESCE(p_cover_url,   cover_url),
    is_private  = COALESCE(p_is_private,  is_private)
  WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_community(uuid, text, text, text, boolean) FROM anon;

-- delete_community
CREATE OR REPLACE FUNCTION delete_community(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_id
      AND user_id = v_uid
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Solo el owner puede eliminar la comunidad';
  END IF;

  DELETE FROM communities WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_community(uuid) FROM anon;

-- join_community  → devuelve 'active' | 'pending'
CREATE OR REPLACE FUNCTION join_community(p_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_priv   boolean;
  v_status text;
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT is_private INTO v_priv FROM communities WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comunidad no encontrada';
  END IF;

  SELECT status INTO v_status FROM community_members
  WHERE community_id = p_id AND user_id = v_uid;
  v_exists := FOUND;

  -- Idempotente: ya es miembro activo u owner/mod
  IF v_exists AND v_status = 'active' THEN
    RETURN 'active';
  END IF;

  v_status := CASE WHEN v_priv THEN 'pending' ELSE 'active' END;

  IF v_exists THEN
    UPDATE community_members
    SET status = v_status, joined_at = now()
    WHERE community_id = p_id AND user_id = v_uid;
  ELSE
    INSERT INTO community_members (community_id, user_id, role, status)
    VALUES (p_id, v_uid, 'member', v_status);
  END IF;

  RETURN v_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION join_community(uuid) FROM anon;

-- leave_community
CREATE OR REPLACE FUNCTION leave_community(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_role     text;
  v_owner_ct bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT role INTO v_role FROM community_members
  WHERE community_id = p_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RETURN; -- no es miembro, nada que hacer
  END IF;

  IF v_role = 'owner' THEN
    SELECT COUNT(*) INTO v_owner_ct FROM community_members
    WHERE community_id = p_id AND role = 'owner' AND status = 'active';
    IF v_owner_ct <= 1 THEN
      RAISE EXCEPTION 'No puedes salir: eres el único owner. Transfiere la propiedad primero o elimina la comunidad.';
    END IF;
  END IF;

  DELETE FROM community_members WHERE community_id = p_id AND user_id = v_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION leave_community(uuid) FROM anon;

-- list_community_members
CREATE OR REPLACE FUNCTION list_community_members(
  p_id uuid,
  lim  integer DEFAULT 100
)
RETURNS TABLE (
  user_id      uuid,
  username     text,
  display_name text,
  avatar_url   text,
  current_rank text,
  role         text,
  status       text,
  joined_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_my_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT cm.role INTO v_my_role FROM community_members cm
  WHERE cm.community_id = p_id AND cm.user_id = v_uid AND cm.status = 'active';

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.current_rank,
    cm.role,
    cm.status,
    cm.joined_at
  FROM community_members cm
  JOIN profiles p ON p.id = cm.user_id
  WHERE cm.community_id = p_id
    AND (
      -- activos: siempre visibles
      cm.status = 'active'
      OR
      -- pending: visible solo para owner/mod y el propio solicitante
      (cm.status = 'pending' AND (v_my_role IN ('owner','moderator') OR cm.user_id = v_uid))
    )
  ORDER BY
    CASE cm.role WHEN 'owner' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,
    cm.joined_at
  LIMIT lim;
END;
$$;

REVOKE EXECUTE ON FUNCTION list_community_members(uuid, integer) FROM anon;

-- set_member_role
CREATE OR REPLACE FUNCTION set_member_role(
  p_id   uuid,
  p_user uuid,
  p_role text    -- 'moderator' | 'member'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_role NOT IN ('moderator','member') THEN
    RAISE EXCEPTION 'Rol inválido. Usa ''moderator'' o ''member''';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_id AND user_id = v_uid AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Solo el owner puede cambiar roles';
  END IF;
  -- No se puede cambiar el rol del propio owner
  IF p_user = v_uid THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol de owner';
  END IF;

  UPDATE community_members
  SET role = p_role
  WHERE community_id = p_id AND user_id = p_user AND status = 'active';
END;
$$;

REVOKE EXECUTE ON FUNCTION set_member_role(uuid, uuid, text) FROM anon;

-- remove_member
CREATE OR REPLACE FUNCTION remove_member(
  p_id   uuid,
  p_user uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_my_role  text;
  v_tgt_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT role INTO v_my_role FROM community_members
  WHERE community_id = p_id AND user_id = v_uid AND status = 'active';
  IF v_my_role NOT IN ('owner','moderator') THEN
    RAISE EXCEPTION 'Solo owner o moderador puede eliminar miembros';
  END IF;

  SELECT role INTO v_tgt_role FROM community_members
  WHERE community_id = p_id AND user_id = p_user;
  IF v_tgt_role = 'owner' THEN
    RAISE EXCEPTION 'No se puede eliminar al owner';
  END IF;

  DELETE FROM community_members WHERE community_id = p_id AND user_id = p_user;
END;
$$;

REVOKE EXECUTE ON FUNCTION remove_member(uuid, uuid) FROM anon;

-- approve_member
CREATE OR REPLACE FUNCTION approve_member(
  p_id   uuid,
  p_user uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_id AND user_id = v_uid
      AND role IN ('owner','moderator') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Solo owner o moderador puede aprobar solicitudes';
  END IF;

  UPDATE community_members
  SET status = 'active'
  WHERE community_id = p_id AND user_id = p_user AND status = 'pending';
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_member(uuid, uuid) FROM anon;

-- reject_member
CREATE OR REPLACE FUNCTION reject_member(
  p_id   uuid,
  p_user uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_id AND user_id = v_uid
      AND role IN ('owner','moderator') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Solo owner o moderador puede rechazar solicitudes';
  END IF;

  DELETE FROM community_members
  WHERE community_id = p_id AND user_id = p_user AND status = 'pending';
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_member(uuid, uuid) FROM anon;
