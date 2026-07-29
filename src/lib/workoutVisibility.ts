export const WORKOUT_VISIBILITIES = ['public', 'followers', 'private'] as const;

export type WorkoutVisibility = (typeof WORKOUT_VISIBILITIES)[number];

export const DEFAULT_WORKOUT_VISIBILITY: WorkoutVisibility = 'public';

export const WORKOUT_VISIBILITY_OPTIONS = [
  {
    value: 'public',
    label: 'Público',
    description: 'Cualquier atleta puede ver este entreno.',
  },
  {
    value: 'followers',
    label: 'Seguidores',
    description: 'Solo tú y quienes te siguen pueden ver este entreno.',
  },
  {
    value: 'private',
    label: 'Privado',
    description: 'Solo tú puedes ver este entreno.',
  },
] as const satisfies readonly {
  value: WorkoutVisibility;
  label: string;
  description: string;
}[];

export function isWorkoutVisibility(value: unknown): value is WorkoutVisibility {
  return (
    typeof value === 'string' &&
    WORKOUT_VISIBILITIES.includes(value as WorkoutVisibility)
  );
}

export function normalizeWorkoutVisibility(
  value: unknown,
  fallback: WorkoutVisibility = DEFAULT_WORKOUT_VISIBILITY,
): WorkoutVisibility {
  return isWorkoutVisibility(value) ? value : fallback;
}

export function workoutVisibilityLabel(value: WorkoutVisibility): string {
  return (
    WORKOUT_VISIBILITY_OPTIONS.find((option) => option.value === value)?.label ??
    'Público'
  );
}
