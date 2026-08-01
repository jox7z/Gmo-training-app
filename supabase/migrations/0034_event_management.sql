-- =============================================================
-- 0034_event_management.sql
-- RPCs update_event, delete_event; bucket covers + policies
-- =============================================================

-- ---------------------------------------------------------------
-- RPC: update_event
-- Solo el creador puede editar; kind no es editable.
-- Validaciones idénticas a create_event.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_event(
  p_event_id   uuid,
  p_title      text,
  p_description text DEFAULT NULL,
  p_cover_url  text DEFAULT NULL,
  p_location   text DEFAULT NULL,
  p_metric     text DEFAULT NULL,
  p_starts_at  timestamptz DEFAULT NULL,
  p_ends_at    timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid       uuid := auth.uid();
  v_creator   uuid;
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '28000';
  end if;

  select creator_id into v_creator
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'evento no encontrado' using errcode = 'P0002';
  end if;

  if v_creator <> v_uid then
    raise exception 'solo el creador puede editar este evento' using errcode = '42501';
  end if;

  -- Validaciones de longitud (mismas que create_event)
  if char_length(p_title) < 1 or char_length(p_title) > 120 then
    raise exception 'el título debe tener entre 1 y 120 caracteres' using errcode = '22023';
  end if;
  if p_description is not null and char_length(p_description) > 1000 then
    raise exception 'la descripción no puede superar 1000 caracteres' using errcode = '22023';
  end if;

  update public.events
  set
    title       = p_title,
    description = p_description,
    cover_url   = p_cover_url,
    location    = p_location,
    metric      = p_metric,
    starts_at   = coalesce(p_starts_at, starts_at),
    ends_at     = p_ends_at
  where id = p_event_id;
end;
$$;

-- ---------------------------------------------------------------
-- RPC: delete_event
-- Solo el creador puede eliminar; participants caen por cascade
-- (FK event_participants.event_id → events.id ON DELETE CASCADE).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_event(
  p_event_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_uid     uuid := auth.uid();
  v_creator uuid;
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '28000';
  end if;

  select creator_id into v_creator
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'evento no encontrado' using errcode = 'P0002';
  end if;

  if v_creator <> v_uid then
    raise exception 'solo el creador puede eliminar este evento' using errcode = '42501';
  end if;

  delete from public.events where id = p_event_id;
end;
$$;

-- ---------------------------------------------------------------
-- Storage bucket: covers (público, max 5 MB)
-- ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------
-- Storage RLS policies: covers bucket
-- Patrón calcado de avatars (0009/0010/0021):
--   lectura pública; insert/update/delete sólo en carpeta propia.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "covers public read"  ON storage.objects;
DROP POLICY IF EXISTS "covers owner insert" ON storage.objects;
DROP POLICY IF EXISTS "covers owner update" ON storage.objects;
DROP POLICY IF EXISTS "covers owner delete" ON storage.objects;

CREATE POLICY "covers public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

CREATE POLICY "covers owner insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "covers owner update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "covers owner delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
