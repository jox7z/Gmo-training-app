-- 0047_workout_sets_check_constraints.sql
-- Refuerza en la DB las mismas reglas que valida `isValidWorkout` en el cliente:
--   * una serie COMPLETADA debe tener reps > 0 (las no completadas quedan libres);
--   * el peso nunca puede ser negativo (weight_kg = 0 es "peso corporal", válido).
-- Espejo servidor del guard de `src/lib/workoutGuards.ts`.

alter table public.workout_sets
  add constraint workout_sets_completed_reps_positive check (not is_completed or reps > 0),
  add constraint workout_sets_weight_nonnegative check (weight_kg >= 0);
