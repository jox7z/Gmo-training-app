import { describe, expect, test } from '@jest/globals';

import { buildExerciseDetails, exerciseTrendMetric } from '@/lib/exerciseDetails';

import { makeExercise, makeSet, makeWorkout } from './helpers/fixtures';

describe('exerciseDetails', () => {
  test('conserva solo marcas reales y agrega duración activa registrada', () => {
    const details = buildExerciseDetails(
      [
        makeWorkout({
          id: 'anterior',
          startedAt: '2026-07-10T12:00:00.000Z',
          exercises: [
            makeExercise({
              sets: [
                makeSet({ weightKg: 60, reps: 10, durationSeconds: 30 }),
                makeSet({ weightKg: 60, reps: 8, durationSeconds: 32 }),
              ],
            }),
          ],
        }),
        makeWorkout({
          id: 'reciente',
          startedAt: '2026-07-19T12:00:00.000Z',
          exercises: [
            makeExercise({
              sets: [
                makeSet({ weightKg: 65, reps: 8, durationSeconds: 35 }),
                makeSet({ weightKg: 65, reps: 7, durationSeconds: 36 }),
                makeSet({ weightKg: 100, reps: 1, isWarmup: true }),
                makeSet({ weightKg: Number.NaN }),
                makeSet({ weightKg: 1_001, reps: 1 }),
                makeSet({ weightKg: 1, reps: 1_000 }),
              ],
            }),
          ],
        }),
      ],
      'bench-press',
    );

    expect(details.sessionCount).toBe(2);
    expect(details.workingSetCount).toBe(4);
    expect(details.maxWeight).toEqual({
      weightKg: 65,
      reps: 8,
      startedAt: '2026-07-19T12:00:00.000Z',
    });
    expect(details.maxReps?.reps).toBe(10);
    expect(details.maxActiveSession?.activeSeconds).toBe(71);
    expect(details.sessions[0].activeSeconds).toBe(71);
    expect(exerciseTrendMetric(details.sessions)).toBe('weight');
  });

  test('peso corporal sigue reps sin fabricar volumen o duración', () => {
    const details = buildExerciseDetails(
      [
        makeWorkout({
          exercises: [
            makeExercise({
              exerciseId: 'pull-up',
              sets: [
                makeSet({ weightKg: 0, reps: 12 }),
                makeSet({ weightKg: 0, reps: 8 }),
              ],
            }),
          ],
        }),
      ],
      'pull-up',
    );

    expect(details.totalReps).toBe(20);
    expect(details.maxWeight?.weightKg).toBe(0);
    expect(details.maxRepsSession?.totalReps).toBe(20);
    expect(details.maxActiveSession).toBeNull();
    expect(exerciseTrendMetric(details.sessions)).toBe('reps');
  });

  test('tendencia mixta con lastre y peso corporal usa reps comparables', () => {
    const details = buildExerciseDetails(
      [
        makeWorkout({
          id: 'lastrada',
          startedAt: '2026-07-10T12:00:00.000Z',
          exercises: [
            makeExercise({
              exerciseId: 'pull-up',
              sets: [makeSet({ weightKg: 10, reps: 6 })],
            }),
          ],
        }),
        makeWorkout({
          id: 'corporal',
          startedAt: '2026-07-19T12:00:00.000Z',
          exercises: [
            makeExercise({
              exerciseId: 'pull-up',
              sets: [makeSet({ weightKg: 0, reps: 8 })],
            }),
          ],
        }),
      ],
      'pull-up',
    );

    expect(exerciseTrendMetric(details.sessions)).toBe('reps');
  });

  test('ignora sesiones sin series efectivas válidas', () => {
    const details = buildExerciseDetails(
      [
        makeWorkout({
          exercises: [
            makeExercise({
              sets: [
                makeSet({ isCompleted: false }),
                makeSet({ isWarmup: true }),
                makeSet({ reps: -1 }),
                makeSet({ weightKg: Number.POSITIVE_INFINITY }),
              ],
            }),
          ],
        }),
      ],
      'bench-press',
    );

    expect(details.sessions).toEqual([]);
    expect(details.maxWeight).toBeNull();
  });
});
