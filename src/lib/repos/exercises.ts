import { supabase } from '@/lib/supabase';
import { uuidv4 } from '@/lib/ids';
import { type Exercise, type MuscleGroup, type Equipment } from '@/data/exercises';

export interface CustomExerciseInput {
  name: string;
  muscle: MuscleGroup;
  secondary?: MuscleGroup[];
  equipment: Equipment;
  isCompound: boolean;
  instructions: string;
}

interface DbExercise {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles: string[] | null;
  equipment: string;
  instructions: string | null;
  is_compound: boolean;
  is_custom: boolean;
  created_by: string | null;
  gif_url: string | null;
}

function toDomain(row: DbExercise): Exercise {
  const secondary =
    row.secondary_muscles && row.secondary_muscles.length > 0
      ? (row.secondary_muscles as MuscleGroup[])
      : undefined;
  return {
    id: row.id,
    name: row.name,
    muscle: row.muscle_group as MuscleGroup,
    secondary,
    equipment: row.equipment as Equipment,
    isCompound: row.is_compound,
    instructions: row.instructions ?? '',
    isCustom: row.is_custom,
    createdBy: row.created_by ?? undefined,
    gifUrl: row.gif_url ?? undefined,
  };
}

/**
 * Resuelve ejercicios por id sin filtrar por dueño — usado para nombres de
 * ejercicios custom AJENOS (rutina pública de otro usuario). RLS `exercises
 * read all` (using true) permite leer cualquier fila, custom o no.
 */
export async function getExercisesByIds(ids: string[]): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('exercises').select('*').in('id', ids);
  if (error) throw error;
  return (data ?? []).map((row: any) => toDomain(row as DbExercise));
}

export async function listCustomExercises(userId: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('created_by', userId)
    .eq('is_custom', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => toDomain(row as DbExercise));
}

export async function createCustomExercise(
  userId: string,
  input: CustomExerciseInput,
): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      id: uuidv4(),
      name: input.name,
      muscle_group: input.muscle,
      secondary_muscles: input.secondary ?? [],
      equipment: input.equipment,
      is_compound: input.isCompound,
      instructions: input.instructions,
      is_custom: true,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return toDomain(data as DbExercise);
}

export async function updateCustomExercise(
  id: string,
  patch: Partial<CustomExerciseInput>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.muscle !== undefined) row.muscle_group = patch.muscle;
  if (patch.secondary !== undefined) row.secondary_muscles = patch.secondary;
  if (patch.equipment !== undefined) row.equipment = patch.equipment;
  if (patch.isCompound !== undefined) row.is_compound = patch.isCompound;
  if (patch.instructions !== undefined) row.instructions = patch.instructions;

  const { error } = await supabase.from('exercises').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) {
    // 23503 = foreign_key_violation: routine_day_exercises / workout_exercises
    // referencian exercises(id) con RESTRICT. Traducimos a un mensaje legible.
    if ((error as { code?: string }).code === '23503') {
      throw new Error('Este ejercicio ya se usó en una rutina o entreno, no se puede borrar');
    }
    throw error;
  }
}
