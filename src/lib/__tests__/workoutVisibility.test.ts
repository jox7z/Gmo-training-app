import {
  DEFAULT_WORKOUT_VISIBILITY,
  isWorkoutVisibility,
  normalizeWorkoutVisibility,
  workoutVisibilityLabel,
} from '@/lib/workoutVisibility';

describe('workoutVisibility', () => {
  test.each(['public', 'followers', 'private'] as const)(
    'acepta visibilidad %s',
    (visibility) => {
      expect(isWorkoutVisibility(visibility)).toBe(true);
      expect(normalizeWorkoutVisibility(visibility)).toBe(visibility);
    },
  );

  test('rechaza valores desconocidos y conserva Público para datos legacy', () => {
    expect(isWorkoutVisibility('friends')).toBe(false);
    expect(isWorkoutVisibility(null)).toBe(false);
    expect(normalizeWorkoutVisibility('friends')).toBe(DEFAULT_WORKOUT_VISIBILITY);
    expect(workoutVisibilityLabel(DEFAULT_WORKOUT_VISIBILITY)).toBe('Público');
  });
});
