-- Recuperada desde supabase_migrations.schema_migrations (version 20260724184046)
-- tras el borrado accidental del working tree el 2026-07-29.
create policy "exercises update own custom"
  on public.exercises for update
  using (auth.uid() = created_by and is_custom = true)
  with check (auth.uid() = created_by and is_custom = true);

create policy "exercises delete own custom"
  on public.exercises for delete
  using (auth.uid() = created_by and is_custom = true);
