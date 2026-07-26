import { describe, expect, test } from '@jest/globals';

import {
  validateSetForCompletion,
  validateWorkoutForFinish,
} from '@/lib/workoutValidation';

import { makeExercise, makeSet, makeWorkout } from './helpers/fixtures';

describe('workoutValidation', () => {
  test('bloquea historial vacío y una sesión con solo calentamiento', () => {
    const empty = validateWorkoutForFinish(makeWorkout({ exercises: [] }));
    const warmupOnly = validateWorkoutForFinish(
      makeWorkout({
        exercises: [
          makeExercise({
            sets: [makeSet({ isWarmup: true, isCompleted: true })],
          }),
        ],
      }),
    );

    expect(empty.canFinish).toBe(false);
    expect(empty.completedWorkingSets).toBe(0);
    expect(warmupOnly.canFinish).toBe(false);
    expect(warmupOnly.completedWorkingSets).toBe(0);
    expect(warmupOnly.errors[0]).toContain('al menos una serie de trabajo');
  });

  test('acepta bodyweight y descanso abierto; las pendientes solo advierten', () => {
    const result = validateWorkoutForFinish(
      makeWorkout({
        exercises: [
          makeExercise({
            exerciseId: 'push-up',
            exerciseName: 'Flexiones',
            sets: [
              makeSet({
                weightKg: 0,
                reps: 15,
                restStartedAt: '2026-07-19T12:01:00.000Z',
              }),
              makeSet({ isCompleted: false }),
            ],
          }),
        ],
      }),
    );

    expect(result).toEqual({
      canFinish: true,
      completedWorkingSets: 1,
      pendingSets: 1,
      errors: [],
      warnings: ['1 serie quedará pendiente.'],
    });
  });

  test.each([
    [{ reps: Number.NaN, weightKg: 10 }, 'repeticiones'],
    [{ reps: 1.5, weightKg: 10 }, 'repeticiones'],
    [{ reps: 0, weightKg: 10 }, 'repeticiones'],
    [{ reps: 1_000, weightKg: 10 }, 'repeticiones'],
    [{ reps: 8, weightKg: Number.POSITIVE_INFINITY }, 'peso'],
    [{ reps: 8, weightKg: -1 }, 'peso'],
    [{ reps: 8, weightKg: 1_001 }, 'peso'],
    [{ reps: 8, weightKg: 10, durationSeconds: Number.NaN }, 'duración'],
    [{ reps: 8, weightKg: 10, durationSeconds: -1 }, 'duración'],
  ])('rechaza entradas no finitas o fuera de límites: %o', (set, fragment) => {
    expect(validateSetForCompletion(set, 'Prueba').join(' ')).toContain(fragment);
  });

  test('acepta exactamente los límites plausibles', () => {
    expect(
      validateSetForCompletion({
        reps: 999,
        weightKg: 1_000,
        durationSeconds: 0,
      }),
    ).toEqual([]);
  });
});
