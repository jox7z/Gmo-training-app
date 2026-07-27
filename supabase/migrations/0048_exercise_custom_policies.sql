-- =====================================================
-- Custom exercises: UPDATE / DELETE policies
-- =====================================================
-- La tabla public.exercises (0001) ya tenía SELECT abierto (using true) e INSERT
-- restringido a (auth.uid() = created_by and is_custom = true). Faltaban las
-- políticas de UPDATE y DELETE, así que por el default de RLS cualquier intento
-- de editar/borrar un ejercicio custom quedaba bloqueado. Se añaden acotadas al
-- dueño y a filas is_custom (el catálogo global no es editable por nadie).

create policy "exercises update own custom"
  on public.exercises for update
  using (auth.uid() = created_by and is_custom = true)
  with check (auth.uid() = created_by and is_custom = true);

create policy "exercises delete own custom"
  on public.exercises for delete
  using (auth.uid() = created_by and is_custom = true);
