-- Cambia workouts.user_id → auth.users(id) en lugar de profiles(id).
-- Motivo: la FK a profiles falla cuando la fila de profiles no existe aún
-- (trigger handle_new_user tardío, onboarding incompleto, etc.). Referenciar
-- auth.users garantiza que cualquier usuario autenticado pueda guardar workouts
-- independientemente del estado de su perfil.
alter table public.workouts
  drop constraint workouts_user_id_fkey,
  add  constraint workouts_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
