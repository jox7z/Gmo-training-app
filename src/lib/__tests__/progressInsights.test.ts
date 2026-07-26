import { describe, expect, test } from '@jest/globals';

import {
  buildExercisePerformance,
  buildPerformanceTimeline,
  performanceMetricValue,
  resolvePerformanceMetric,
} from '@/lib/progressInsights';

import { makeExercise, makeSet, makeWorkout } from './helpers/fixtures';

describe('progressInsights', () => {
  test('produce contratos vacíos con historial vacío', () => {
    expect(buildExercisePerformance([])).toEqual([]);
  });

  test('resume carga, reps y tiempo reales por sesión', () => {
    const performance = buildExercisePerformance([
      makeWorkout({
        id: 'anterior',
        startedAt: '2026-07-10T12:00:00.000Z',
        exercises: [
          makeExercise({
            sets: [
              makeSet({ weightKg: 50, reps: 8, durationSeconds: 30 }),
              makeSet({ weightKg: 50, reps: 7, durationSeconds: 32 }),
              makeSet({ weightKg: 100, reps: 2, isWarmup: true }),
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
              makeSet({ weightKg: 52.5, reps: 8, durationSeconds: 35 }),
              makeSet({ weightKg: 52.5, reps: 8, durationSeconds: 36 }),
              makeSet({ weightKg: Number.NaN }),
              makeSet({ reps: 0 }),
              makeSet({ weightKg: 1_001, reps: 1 }),
              makeSet({ weightKg: 1, reps: 1_000 }),
              makeSet({ isCompleted: false }),
            ],
          }),
        ],
      }),
    ]);

    expect(performance).toHaveLength(1);
    expect(performance[0].latest).toEqual(
      expect.objectContaining({
        workoutId: 'reciente',
        setCount: 2,
        totalReps: 16,
        topWeightKg: 52.5,
        activeSeconds: 71,
      }),
    );
    expect(performance[0].defaultMetric).toBe('weight');
  });

  test('combina entradas repetidas del ejercicio dentro del mismo entrenamiento', () => {
    const performance = buildExercisePerformance([
      makeWorkout({
        exercises: [
          makeExercise({ sets: [makeSet({ weightKg: 20, reps: 10 })] }),
          makeExercise({ sets: [makeSet({ weightKg: 25, reps: 8 })] }),
        ],
      }),
    ]);

    expect(performance[0].sessions).toHaveLength(1);
    expect(performance[0].latest).toEqual(
      expect.objectContaining({
        setCount: 2,
        totalReps: 18,
        topWeightKg: 25,
      }),
    );
  });

  test('peso corporal usa reps y no inventa una carga', () => {
    const performance = buildExercisePerformance([
      makeWorkout({
        exercises: [
          makeExercise({
            exerciseId: 'pull-up',
            exerciseName: 'Dominadas',
            sets: [
              makeSet({ weightKg: 0, reps: 8 }),
              makeSet({ weightKg: 0, reps: 6 }),
            ],
          }),
        ],
      }),
    ])[0];

    expect(performance.defaultMetric).toBe('reps');
    expect(performanceMetricValue(performance.latest, 'reps')).toBe(14);
    expect(performanceMetricValue(performance.latest, 'weight')).toBeNull();
    expect(performanceMetricValue(performance.latest, 'duration')).toBeNull();
  });

  test('sesión corporal reciente usa reps aunque exista carga histórica', () => {
    const performance = buildExercisePerformance([
      makeWorkout({
        id: 'lastrada',
        startedAt: '2026-07-10T12:00:00.000Z',
        exercises: [
          makeExercise({
            exerciseId: 'pull-up',
            exerciseName: 'Dominadas',
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
            exerciseName: 'Dominadas',
            sets: [makeSet({ weightKg: 0, reps: 8 })],
          }),
        ],
      }),
    ])[0];

    expect(performance.defaultMetric).toBe('reps');
    expect(resolvePerformanceMetric(performance, null)).toBe('reps');
    expect(resolvePerformanceMetric(performance, 'weight')).toBe('weight');
  });

  test('línea de tiempo filtra rango, futuro y métricas sin dato', () => {
    const nowMs = Date.parse('2026-07-19T12:00:00.000Z');
    const performance = buildExercisePerformance([
      makeWorkout({
        startedAt: '2026-07-18T12:00:00.000Z',
        exercises: [
          makeExercise({ sets: [makeSet({ weightKg: 80, reps: 8 })] }),
        ],
      }),
      makeWorkout({
        startedAt: '2026-06-01T12:00:00.000Z',
        exercises: [
          makeExercise({ sets: [makeSet({ weightKg: 70, reps: 8 })] }),
        ],
      }),
      makeWorkout({ startedAt: '2026-07-20T12:00:00.000Z' }),
      makeWorkout({ startedAt: 'fecha-inválida' }),
    ])[0];

    expect(buildPerformanceTimeline(performance, 'weight', '30d', nowMs)).toEqual([
      {
        workoutId: performance.sessions.find(
          (session) => session.ms === Date.parse('2026-07-18T12:00:00.000Z'),
        )?.workoutId,
        ms: Date.parse('2026-07-18T12:00:00.000Z'),
        value: 80,
      },
    ]);
    expect(buildPerformanceTimeline(performance, 'duration', 'all', nowMs)).toEqual([]);
  });

  test('conserva estancamientos y caídas sin corregir ni calificar la tendencia', () => {
    const nowMs = Date.parse('2026-07-19T12:00:00.000Z');
    const performance = buildExercisePerformance([
      makeWorkout({
        id: 'inicio',
        startedAt: '2026-07-01T12:00:00.000Z',
        exercises: [makeExercise({ sets: [makeSet({ weightKg: 50, reps: 10 })] })],
      }),
      makeWorkout({
        id: 'igual',
        startedAt: '2026-07-08T12:00:00.000Z',
        exercises: [makeExercise({ sets: [makeSet({ weightKg: 50, reps: 10 })] })],
      }),
      makeWorkout({
        id: 'baja',
        startedAt: '2026-07-15T12:00:00.000Z',
        exercises: [makeExercise({ sets: [makeSet({ weightKg: 45, reps: 10 })] })],
      }),
    ])[0];

    expect(buildPerformanceTimeline(performance, 'weight', '30d', nowMs)).toEqual([
      { workoutId: 'inicio', ms: Date.parse('2026-07-01T12:00:00.000Z'), value: 50 },
      { workoutId: 'igual', ms: Date.parse('2026-07-08T12:00:00.000Z'), value: 50 },
      { workoutId: 'baja', ms: Date.parse('2026-07-15T12:00:00.000Z'), value: 45 },
    ]);
  });
});
