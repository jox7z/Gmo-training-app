import {
  EQUIPMENT_LABELS,
  exerciseById,
  MUSCLE_GROUP_LABELS,
  type Equipment,
  type MuscleGroup,
} from '@/data/exercises';
import { normalizeSearchText } from '@/lib/format';
import type { ExercisePerformance } from '@/lib/progressInsights';

export type ExerciseProgressSortMode = 'recent' | 'most-trained' | 'all';

export interface ExerciseProgressPickerFilters {
  query?: string;
  sortMode?: ExerciseProgressSortMode;
  muscle?: MuscleGroup | null;
  equipment?: Equipment | null;
}

export interface ExerciseProgressItemMetadata {
  muscle: MuscleGroup | null;
  equipment: Equipment | null;
  muscleLabel: string;
  equipmentLabel: string;
}

export interface ExerciseProgressFilterOption<T extends string> {
  value: T;
  label: string;
}

export interface AvailableExerciseProgressMetadata {
  muscles: ExerciseProgressFilterOption<MuscleGroup>[];
  equipment: ExerciseProgressFilterOption<Equipment>[];
}

const spanishCollator = new Intl.Collator('es', { sensitivity: 'base' });
const metadataCache = new Map<string, ExerciseProgressItemMetadata>();

export function normalizeExerciseProgressText(value: string): string {
  return normalizeSearchText(value);
}

export function getExerciseProgressItemMetadata(
  exerciseId: string,
): ExerciseProgressItemMetadata {
  const cached = metadataCache.get(exerciseId);
  if (cached) return cached;

  const exercise = exerciseById(exerciseId);

  if (!exercise) {
    const metadata: ExerciseProgressItemMetadata = {
      muscle: null,
      equipment: null,
      muscleLabel: 'Sin categoría',
      equipmentLabel: 'Equipo sin datos',
    };
    metadataCache.set(exerciseId, metadata);
    return metadata;
  }

  const metadata: ExerciseProgressItemMetadata = {
    muscle: exercise.muscle,
    equipment: exercise.equipment,
    muscleLabel: MUSCLE_GROUP_LABELS[exercise.muscle],
    equipmentLabel: EQUIPMENT_LABELS[exercise.equipment],
  };
  metadataCache.set(exerciseId, metadata);
  return metadata;
}

export function getAvailableExerciseProgressMetadata(
  items: readonly ExercisePerformance[],
): AvailableExerciseProgressMetadata {
  const muscles = new Set<MuscleGroup>();
  const equipment = new Set<Equipment>();

  for (const item of items) {
    const metadata = getExerciseProgressItemMetadata(item.exerciseId);
    if (metadata.muscle) muscles.add(metadata.muscle);
    if (metadata.equipment) equipment.add(metadata.equipment);
  }

  return {
    muscles: [...muscles]
      .map((value) => ({ value, label: MUSCLE_GROUP_LABELS[value] }))
      .sort((a, b) => spanishCollator.compare(a.label, b.label)),
    equipment: [...equipment]
      .map((value) => ({ value, label: EQUIPMENT_LABELS[value] }))
      .sort((a, b) => spanishCollator.compare(a.label, b.label)),
  };
}

export function filterAndSortExerciseProgress(
  items: readonly ExercisePerformance[],
  filters: ExerciseProgressPickerFilters = {},
): ExercisePerformance[] {
  const {
    query = '',
    sortMode = 'recent',
    muscle = null,
    equipment = null,
  } = filters;
  const normalizedQuery = normalizeExerciseProgressText(query);

  const filtered = items.filter((item) => {
    if (
      normalizedQuery &&
      !normalizeExerciseProgressText(item.name).includes(normalizedQuery)
    ) {
      return false;
    }

    const metadata = getExerciseProgressItemMetadata(item.exerciseId);
    return (
      (!muscle || metadata.muscle === muscle) &&
      (!equipment || metadata.equipment === equipment)
    );
  });

  filtered.sort((a, b) => {
    if (sortMode === 'most-trained') {
      return (
        b.sessions.length - a.sessions.length ||
        b.latest.ms - a.latest.ms ||
        spanishCollator.compare(a.name, b.name)
      );
    }

    if (sortMode === 'all') {
      return spanishCollator.compare(a.name, b.name);
    }

    return (
      b.latest.ms - a.latest.ms || spanishCollator.compare(a.name, b.name)
    );
  });

  // Una búsqueda iniciada desde "Recientes" consulta el historial completo.
  return sortMode === 'recent' && !normalizedQuery ? filtered.slice(0, 6) : filtered;
}
