import { describe, expect, test } from '@jest/globals';

import { ACHIEVEMENTS } from '@/lib/achievements';
import {
  buildMuscleMilestones,
  filterMuscleMilestones,
  MILESTONE_MUSCLES,
} from '@/lib/muscleMilestones';

import { makeExercise, makeSet, makeWorkout } from './helpers/fixtures';

describe('muscleMilestones', () => {
  test('reutiliza los tiers de logros y aplica nivel completo al primario', () => {
    const benchTrack = ACHIEVEMENTS.find(
      (track) => track.exerciseId === 'bench-press',
    );
    const summary = buildMuscleMilestones([
      makeWorkout({
        exercises: [
          makeExercise({
            exerciseId: 'bench-press',
            exerciseName: 'Press de banca',
            sets: [
              makeSet({ weightKg: 60 }),
              makeSet({ weightKg: 80 }),
            ],
          }),
        ],
      }),
    ]);
    const bench = summary.lifts.find(
      (lift) => lift.exerciseId === 'bench-press',
    );
    const chest = summary.muscles.find((result) => result.muscle === 'chest');
    const triceps = summary.muscles.find(
      (result) => result.muscle === 'triceps',
    );

    expect(bench?.track).toBe(benchTrack);
    expect(bench).toEqual(
      expect.objectContaining({
        topWeightKg: 80,
        validSetCount: 2,
        level: 4,
        levelLabel: 'Fuerte',
        currentTier: benchTrack?.tiers[2],
        nextTier: benchTrack?.tiers[3],
        evidence: expect.objectContaining({
          weightKg: 80,
          reps: 8,
        }),
      }),
    );
    expect(chest).toEqual(
      expect.objectContaining({ level: 4, levelLabel: 'Fuerte' }),
    );
    expect(triceps).toEqual(
      expect.objectContaining({ level: 3, levelLabel: 'Sólido' }),
    );
  });

  test('solo acepta series completadas, no calentamiento y plausibles', () => {
    const summary = buildMuscleMilestones([
      makeWorkout({
        exercises: [
          makeExercise({
            exerciseId: 'overhead-press',
            exerciseName: 'Press militar',
            sets: [
              makeSet({ weightKg: 20 }),
              makeSet({ weightKg: 500, isWarmup: true }),
              makeSet({ weightKg: 400, isCompleted: false }),
              makeSet({ weightKg: Number.NaN }),
              makeSet({ weightKg: 70, reps: 0 }),
              makeSet({ weightKg: 1_001, reps: 1 }),
            ],
          }),
        ],
      }),
    ]);
    const press = summary.lifts.find(
      (lift) => lift.exerciseId === 'overhead-press',
    );

    expect(press).toEqual(
      expect.objectContaining({
        topWeightKg: 20,
        validSetCount: 1,
        level: 1,
        levelLabel: 'Registrado',
      }),
    );
  });

  test('omite full_body y baja exactamente un nivel a secundarios', () => {
    const summary = buildMuscleMilestones([
      makeWorkout({
        exercises: [
          makeExercise({
            exerciseId: 'deadlift',
            exerciseName: 'Peso muerto',
            muscleGroup: 'full_body',
            sets: [makeSet({ weightKg: 140 })],
          }),
        ],
      }),
    ]);
    const deadlift = summary.lifts.find(
      (lift) => lift.exerciseId === 'deadlift',
    );

    expect(summary.muscles.map((result) => result.muscle)).toEqual(
      MILESTONE_MUSCLES,
    );
    expect(summary.muscles).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ muscle: 'full_body' }),
      ]),
    );
    expect(deadlift).toEqual(
      expect.objectContaining({ level: 4, levelLabel: 'Fuerte' }),
    );
    for (const muscle of ['back', 'glutes', 'hamstrings', 'quads', 'core'] as const) {
      expect(
        summary.muscles.find((result) => result.muscle === muscle),
      ).toEqual(
        expect.objectContaining({ level: 3, levelLabel: 'Sólido' }),
      );
    }
  });

  test('filtra el selector por texto sin diacríticos y por estado', () => {
    const summary = buildMuscleMilestones([
      makeWorkout({
        exercises: [
          makeExercise({
            exerciseId: 'bench-press',
            exerciseName: 'Press de banca',
            sets: [makeSet({ weightKg: 40 })],
          }),
        ],
      }),
    ]);

    expect(
      filterMuscleMilestones(summary.muscles, { query: 'biceps' }).map(
        (result) => result.muscle,
      ),
    ).toEqual(['biceps']);
    expect(
      filterMuscleMilestones(summary.muscles, { status: 'with' }).map(
        (result) => result.muscle,
      ),
    ).toEqual(['chest', 'front_delt', 'triceps']);
    expect(
      filterMuscleMilestones(summary.muscles, { status: 'without' }),
    ).toHaveLength(MILESTONE_MUSCLES.length - 3);
  });

  test('desempata por repeticiones, fecha y conserva la sesión exacta', () => {
    const summary = buildMuscleMilestones([
      makeWorkout({
        id: 'sesion-antigua',
        routineName: 'Empuje A',
        startedAt: '2026-06-01T10:00:00.000Z',
        exercises: [
          makeExercise({
            id: 'press-antiguo',
            exerciseId: 'bench-press',
            sets: [makeSet({ id: 'serie-antigua', weightKg: 100, reps: 10 })],
          }),
        ],
      }),
      makeWorkout({
        id: 'sesion-menos-reps',
        routineName: 'Empuje B',
        startedAt: '2026-07-01T10:00:00.000Z',
        exercises: [
          makeExercise({
            exerciseId: 'bench-press',
            sets: [makeSet({ weightKg: 100, reps: 8 })],
          }),
        ],
      }),
      makeWorkout({
        id: 'sesion-reciente',
        routineName: 'Empuje C',
        startedAt: '2026-07-10T10:00:00.000Z',
        exercises: [
          makeExercise({
            id: 'press-reciente',
            exerciseId: 'bench-press',
            sets: [makeSet({ id: 'serie-reciente', weightKg: 100, reps: 10 })],
          }),
        ],
      }),
    ]);

    expect(
      summary.lifts.find((lift) => lift.exerciseId === 'bench-press')?.evidence,
    ).toEqual({
      workoutId: 'sesion-reciente',
      workoutName: 'Empuje C',
      workoutStartedAt: '2026-07-10T10:00:00.000Z',
      exerciseEntryId: 'press-reciente',
      setId: 'serie-reciente',
      weightKg: 100,
      reps: 10,
    });
  });
});
