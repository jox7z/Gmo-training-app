import { describe, expect, test } from '@jest/globals';

import {
  calculateCompletedMuscleVolume,
  calculatePlannedMuscleVolume,
  classifyMuscleVolume,
  normalizeEquivalentSets,
  type MuscleVolumeZone,
} from '@/lib/muscleVolume';
import type { Routine } from '@/store/routines';

import { makeExercise, makeSet, makeWorkout } from './helpers/fixtures';

function plannedRoutine(
  days: Routine['days'],
): Pick<Routine, 'days'> {
  return { days };
}

function volumeFor<T extends { muscle: string }>(
  results: T[],
  muscle: string,
): T {
  const result = results.find((item) => item.muscle === muscle);
  if (!result) throw new Error(`Volumen ausente para ${muscle}`);
  return result;
}

describe('muscleVolume', () => {
  test('press banca aporta 1 serie al pecho y 0.5 a cada secundario', () => {
    const result = calculatePlannedMuscleVolume(
      plannedRoutine([
        {
          id: 'push',
          name: 'Push',
          exercises: [
            {
              id: 'bench',
              exerciseId: 'bench-press',
              targetSets: 4,
              targetRepsMin: 6,
              targetRepsMax: 8,
              restSeconds: 120,
            },
          ],
        },
      ]),
    );

    expect(volumeFor(result, 'chest')).toMatchObject({
      totalSets: 4,
      frequency: 1,
      zone: 'minimal',
    });
    expect(volumeFor(result, 'triceps')).toMatchObject({
      totalSets: 2,
      frequency: 1,
    });
    expect(volumeFor(result, 'front_delt')).toMatchObject({
      totalSets: 2,
      frequency: 1,
    });
    expect(volumeFor(result, 'chest').exercises).toEqual([
      {
        exerciseId: 'bench-press',
        exerciseName: 'Press de banca',
        equivalentSets: 4,
        frequency: 1,
      },
    ]);
  });

  test('agrega contribuciones secundarias y frecuencia por día, no por fila', () => {
    const bench = {
      id: 'bench',
      exerciseId: 'bench-press',
      targetSets: 2,
      targetRepsMin: 8,
      targetRepsMax: 10,
      restSeconds: 90,
    };
    const result = calculatePlannedMuscleVolume(
      plannedRoutine([
        {
          id: 'lunes',
          name: 'Lunes',
          exercises: [bench, { ...bench, id: 'bench-duplicate', targetSets: 1 }],
        },
        {
          id: 'jueves',
          name: 'Jueves',
          exercises: [{ ...bench, id: 'bench-thursday' }],
        },
      ]),
    );

    expect(volumeFor(result, 'triceps')).toMatchObject({
      totalSets: 2.5,
      frequency: 2,
      exercises: [
        expect.objectContaining({
          exerciseId: 'bench-press',
          equivalentSets: 2.5,
          frequency: 2,
        }),
      ],
    });
  });

  test('historial ignora calentamiento, pendientes y rendimiento inválido', () => {
    const result = calculateCompletedMuscleVolume([
      makeWorkout({
        id: 'session-1',
        exercises: [
          makeExercise({
            exerciseId: 'bench-press',
            sets: [
              makeSet(),
              makeSet({ isWarmup: true }),
              makeSet({ isCompleted: false }),
              makeSet({ reps: Number.NaN }),
              makeSet({ reps: 0 }),
              makeSet({ weightKg: Number.POSITIVE_INFINITY }),
            ],
          }),
        ],
      }),
    ]);

    expect(volumeFor(result, 'chest')).toMatchObject({
      totalSets: 1,
      frequency: 1,
    });
    expect(volumeFor(result, 'triceps').totalSets).toBe(0.5);
  });

  test('full body distribuye solo a secundarios visibles', () => {
    const result = calculateCompletedMuscleVolume([
      makeWorkout({
        exercises: [
          makeExercise({
            exerciseId: 'deadlift',
            exerciseName: 'Peso muerto',
            sets: [makeSet(), makeSet()],
          }),
        ],
      }),
    ]);

    expect(
      (result as { muscle: string }[]).some(
        (item) => item.muscle === 'full_body',
      ),
    ).toBe(false);
    expect(volumeFor(result, 'back').totalSets).toBe(1);
    expect(volumeFor(result, 'glutes').totalSets).toBe(1);
    expect(volumeFor(result, 'hamstrings').totalSets).toBe(1);
    expect(volumeFor(result, 'quads').totalSets).toBe(1);
    expect(volumeFor(result, 'core').totalSets).toBe(1);
  });

  test.each<[number, MuscleVolumeZone]>([
    [0, 'none'],
    [0.5, 'minimal'],
    [4.5, 'minimal'],
    [5, 'effective'],
    [9.5, 'effective'],
    [10, 'productive'],
    [20, 'productive'],
    [20.5, 'very_high'],
  ])('clasifica %s series en zona %s', (sets, zone) => {
    expect(classifyMuscleVolume(sets)).toBe(zone);
  });

  test('normaliza valores no finitos y overrides a pasos de 0.5', () => {
    expect(normalizeEquivalentSets(Number.NaN)).toBe(0);
    expect(normalizeEquivalentSets(1.24)).toBe(1);
    expect(normalizeEquivalentSets(1.26)).toBe(1.5);

    const result = calculatePlannedMuscleVolume(
      plannedRoutine([
        {
          id: 'push',
          name: 'Push',
          exercises: [
            {
              id: 'bench',
              exerciseId: 'bench-press',
              targetSets: 2,
              targetRepsMin: 8,
              targetRepsMax: 10,
              restSeconds: 90,
            },
          ],
        },
      ]),
      {
        contributionOverrides: {
          'bench-press': { chest: 0.5, triceps: 0 },
        },
      },
    );

    expect(volumeFor(result, 'chest').totalSets).toBe(1);
    expect(volumeFor(result, 'triceps').totalSets).toBe(0);
  });
});
