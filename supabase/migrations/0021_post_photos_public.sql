-- El bucket post-photos fue creado con public=false en 0007.
-- getPublicUrl() genera URLs del tipo /storage/v1/object/public/...
-- que Supabase rechaza con 403 en buckets privados.
-- Las fotos de posts son contenido social visible por todos los usuarios:
-- hacer el bucket público permite que <Image uri=publicUrl> funcione en la app.
-- Las políticas de upload/delete por prefijo de uid se conservan intactas.
update storage.buckets
   set public = true
 where id = 'post-photos';
