-- Recuperada desde supabase_migrations.schema_migrations (version 20260724182724)
-- tras el borrado accidental del working tree el 2026-07-29.
alter table public.workout_sets
  add constraint workout_sets_completed_reps_positive check (not is_completed or reps > 0),
  add constraint workout_sets_weight_nonnegative check (weight_kg >= 0);
