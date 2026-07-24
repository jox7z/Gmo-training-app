import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listCustomExercises,
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  getExercisesByIds,
  type CustomExerciseInput,
} from '@/lib/repos/exercises';
import {
  type Exercise,
  addCustomExerciseToCache,
  updateCustomExerciseInCache,
  removeCustomExerciseFromCache,
} from '@/data/exercises';
import { useAppStore } from '@/store/app';

export const exercisesKeys = {
  custom: (userId: string) => ['exercises', 'custom', userId] as const,
  byIds: (ids: string[]) => ['exercises', 'byIds', [...ids].sort()] as const,
};

/**
 * Resuelve ejercicios que no están en el catálogo estático ni en el cache de
 * ejercicios custom DEL VIEWER — caso de una rutina pública de otro usuario
 * con un ejercicio custom de ESE OTRO usuario (RLS de exercises permite leer
 * cualquier fila, `exerciseById` local solo conoce los propios).
 */
export function useExerciseNames(ids: string[]) {
  return useQuery({
    queryKey: exercisesKeys.byIds(ids),
    queryFn: () => getExercisesByIds(ids),
    enabled: ids.length > 0,
  });
}

export function useCustomExercises(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? exercisesKeys.custom(userId) : (['exercises', 'custom', 'noop'] as const),
    queryFn: () => listCustomExercises(userId!),
    enabled: !!userId,
  });
}

export function useCreateCustomExercise() {
  const qc = useQueryClient();
  // El userId sale del store (perfil de sesión); así el call site queda limpio
  // (useCreateCustomExercise().mutate(input)) sin tener que pasarlo cada vez.
  const userId = useAppStore((s) => s.profile?.id);
  return useMutation<Exercise, Error, CustomExerciseInput>({
    mutationFn: (input) => {
      if (!userId) throw new Error('Necesitas iniciar sesión para crear ejercicios');
      return createCustomExercise(userId, input);
    },
    onSuccess: (created) => {
      // Cache de módulo primero: corre antes que el onSuccess del call site
      // (ej. onCreated→addExercise en el editor de rutina), así ese re-render
      // ya resuelve el nombre en vez de mostrar el UUID crudo.
      addCustomExerciseToCache(created);
      if (!userId) return;
      // Inserta en sitio al principio de la lista (orden por created_at desc).
      qc.setQueryData<Exercise[]>(exercisesKeys.custom(userId), (old) =>
        old ? [created, ...old] : [created],
      );
    },
  });
}

export function useUpdateCustomExercise(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<Exercise, Error, { exercise: Exercise; patch: CustomExerciseInput }>({
    mutationFn: async ({ exercise, patch }) => {
      await updateCustomExercise(exercise.id, patch);
      // El repo no devuelve la fila; reconstruimos el dominio localmente.
      return { ...exercise, ...patch };
    },
    onSuccess: (updated) => {
      // Cache de módulo primero (mismo criterio que useCreateCustomExercise),
      // así los ~20 sitios no-React que resuelven por exerciseById() ven el
      // nombre/músculo nuevos antes del próximo refetch.
      updateCustomExerciseInCache(updated);
      if (!userId) return;
      qc.setQueryData<Exercise[]>(exercisesKeys.custom(userId), (old) =>
        old ? old.map((e) => (e.id === updated.id ? updated : e)) : old,
      );
    },
  });
}

export function useDeleteCustomExercise(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCustomExercise(id),
    onSuccess: (_data, id) => {
      // Cache de módulo primero, para no dejar el ejercicio borrado resoluble
      // por exerciseById() hasta el próximo refetch de useCustomExercises.
      removeCustomExerciseFromCache(id);
      if (!userId) return;
      qc.setQueryData<Exercise[]>(exercisesKeys.custom(userId), (old) =>
        old ? old.filter((e) => e.id !== id) : old,
      );
    },
  });
}
