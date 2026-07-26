import { describe, expect, test } from '@jest/globals';

import { toDisplay } from '@/lib/units';
import {
  detectPRs,
  detectSetPR,
  exerciseTopWeight,
  getPreviousSetValue,
} from '@/lib/workoutCompare';

import { makeExercise, makeSet, makeWorkout } from './helpers/fixtures';

describe('workoutCompare', () => {
  test('ignora calentamiento, series pendientes y peso corporal al elegir el top set', () => {
    const exercise = makeExercise({
      sets: [
        makeSet({ weightKg: 200, reps: 3, isWarmup: true }),
        makeSet({ weightKg: 100, reps: 5, isCompleted: false }),
        makeSet({ weightKg: 0, reps: 20 }),
        makeSet({ weightKg: 80, reps: 6 }),
        makeSet({ weightKg: 80, reps: 8 }),
      ],
    });

    expect(exerciseTopWeight(exercise)).toBe(80);
  });

  test('devuelve null con historial vacío, fecha inválida o índice inválido', () => {
    const current = makeWorkout({ routineDayId: 'push' });

    expect(getPreviousSetValue([], current, 'bench-press', 0)).toBeNull();
    expect(
      getPreviousSetValue(
        [makeWorkout({ startedAt: '2026-07-18T12:00:00.000Z' })],
        makeWorkout({ startedAt: 'fecha-inválida' }),
        'bench-press',
        0,
      ),
    ).toBeNull();
    expect(getPreviousSetValue([], current, 'bench-press', -1)).toBeNull();
    expect(getPreviousSetValue([], current, 'bench-press', 0.5)).toBeNull();
  });

  test('recupera solo series laborales y usa la última como fallback manteniendo kg', () => {
    const previous = makeWorkout({
      id: 'anterior',
      startedAt: '2026-07-18T12:00:00.000Z',
      exercises: [
        makeExercise({
          sets: [
            makeSet({ weightKg: 20, reps: 10, isWarmup: true }),
            makeSet({ weightKg: 100, reps: 5 }),
            makeSet({ weightKg: 110, reps: 3, isCompleted: false }),
          ],
        }),
      ],
    });
    const current = makeWorkout({
      id: 'actual',
      startedAt: '2026-07-19T12:00:00.000Z',
    });

    const value = getPreviousSetValue(
      [previous],
      current,
      'bench-press',
      2,
    );

    expect(value).toEqual({
      weightKg: 100,
      reps: 5,
      sourceSetIndex: 0,
      usedFallback: true,
      sessionId: 'anterior',
    });
    expect(toDisplay(value?.weightKg ?? 0, 'kg')).toBe(100);
    expect(toDisplay(value?.weightKg ?? 0, 'lb')).toBeCloseTo(220.462, 3);
  });

  test('detecta récords de carga sin contar peso corporal', () => {
    const previous = makeWorkout({
      exercises: [
        makeExercise({
          sets: [makeSet({ weightKg: 80, reps: 8 })],
        }),
      ],
    });
    const current = makeWorkout({
      exercises: [
        makeExercise({
          sets: [makeSet({ weightKg: 85, reps: 6 })],
        }),
        makeExercise({
          exerciseId: 'push-up',
          exerciseName: 'Flexiones',
          sets: [makeSet({ weightKg: 0, reps: 20 })],
        }),
      ],
    });

    const prs = detectPRs([previous], current);

    expect(prs).toEqual(new Set(['bench-press']));
  });

  test('el PR en vivo exige historial positivo y rechaza warmup/bodyweight', () => {
    const history = [
      makeWorkout({
        id: 'histórico',
        startedAt: '2026-07-18T12:00:00.000Z',
        exercises: [
          makeExercise({ sets: [makeSet({ weightKg: 80, reps: 8 })] }),
        ],
      }),
    ];
    const current = makeWorkout({
      id: 'actual',
      startedAt: '2026-07-19T12:00:00.000Z',
      exercises: [
        makeExercise({
          sets: [
            makeSet({ weightKg: 85, isCompleted: false }),
            makeSet({ weightKg: 100, isWarmup: true, isCompleted: false }),
            makeSet({ weightKg: 0, isCompleted: false }),
          ],
        }),
      ],
    });

    expect(detectSetPR(history, current, 0, 0)).toBe(true);
    expect(detectSetPR([], current, 0, 0)).toBe(false);
    expect(detectSetPR(history, current, 0, 1)).toBe(false);
    expect(detectSetPR(history, current, 0, 2)).toBe(false);
  });
});
