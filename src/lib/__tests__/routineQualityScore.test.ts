import { describe, expect, test } from '@jest/globals';

import { computeRoutineQualityScore } from '@/lib/routineQualityScore';
import type {
  Routine,
  RoutineDay,
  RoutineDayExercise,
} from '@/store/routines';

function exercise(
  exerciseId: string,
  targetSets: number,
  id = exerciseId,
): RoutineDayExercise {
  return {
    id,
    exerciseId,
    targetSets,
    targetRepsMin: 8,
    targetRepsMax: 12,
    restSeconds: 90,
  };
}

function day(
  id: string,
  exercises: RoutineDayExercise[],
): RoutineDay {
  return {
    id,
    name: id,
    exercises,
  };
}

function routine(days: RoutineDay[]): Routine {
  return {
    id: 'routine',
    name: 'Rutina',
    splitType: 'custom',
    createdAt: '2026-07-27T00:00:00.000Z',
    days,
  };
}

function balancedDays(targetSets: number): RoutineDay[] {
  const exercises = [
    exercise('bench-press', targetSets),
    exercise('barbell-row', targetSets),
    exercise('lateral-raise', targetSets),
    exercise('squat', targetSets),
    exercise('romanian-deadlift', targetSets),
    exercise('standing-calf', targetSets),
    exercise('plank', targetSets),
  ];

  return [
    day(
      'lunes',
      exercises.map((item) => ({ ...item, id: `${item.id}-lunes` })),
    ),
    day(
      'jueves',
      exercises.map((item) => ({ ...item, id: `${item.id}-jueves` })),
    ),
  ];
}

describe('routineQualityScore', () => {
  test('rutina vacía produce cero sin músculos evaluados', () => {
    const result = computeRoutineQualityScore(routine([]));

    expect(result).toMatchObject({
      score: 0,
      label: 'Muy baja',
      breakdown: {
        coverage: { score: 0, points: 0, coveredRegions: [] },
        volume: { score: 0, points: 0, assessedMuscles: 0 },
        frequency: { score: 0, points: 0, assessedMuscles: 0 },
        structure: {
          score: 0,
          points: 0,
          totalDays: 0,
          emptyDays: 0,
        },
      },
    });
  });

  test('rutina parcial refleja cobertura limitada y frecuencia de un día', () => {
    const result = computeRoutineQualityScore(
      routine([day('push', [exercise('bench-press', 4)])]),
    );

    expect(result.score).toBe(54);
    expect(result.label).toBe('Media');
    expect(result.breakdown.coverage).toMatchObject({
      score: 37.5,
      points: 13.1,
      coveredRegions: ['chest', 'shoulders', 'arms'],
    });
    expect(result.breakdown.volume).toMatchObject({
      score: 50,
      assessedMuscles: 3,
    });
    expect(result.breakdown.frequency.score).toBe(55);
    expect(result.breakdown.structure.score).toBe(100);
  });

  test('rutina equilibrada cubre regiones con volumen y frecuencia amplios', () => {
    const result = computeRoutineQualityScore(
      routine(balancedDays(5)),
    );

    expect(result).toMatchObject({
      score: 99,
      label: 'Muy alta',
      breakdown: {
        coverage: {
          score: 100,
          weight: 35,
          points: 35,
          totalRegions: 8,
        },
        volume: {
          score: 95,
          weight: 30,
          points: 28.5,
          assessedMuscles: 12,
        },
        frequency: {
          score: 100,
          weight: 20,
          points: 20,
          assessedMuscles: 12,
        },
        structure: {
          score: 100,
          weight: 15,
          points: 15,
          nonEmptyDays: 2,
          emptyDays: 0,
          extremeDensityDays: 0,
        },
      },
    });
  });

  test('volumen muy alto reduce componente de volumen', () => {
    const balanced = computeRoutineQualityScore(
      routine(balancedDays(5)),
    );
    const veryHigh = computeRoutineQualityScore(
      routine(balancedDays(11)),
    );

    expect(veryHigh.breakdown.volume.score).toBe(60);
    expect(veryHigh.breakdown.volume.score).toBeLessThan(
      balanced.breakdown.volume.score,
    );
    expect(veryHigh.score).toBe(88);
  });

  test('mismo contenido siempre produce mismo resultado', () => {
    const input = routine([
      day('único', [
        exercise('squat', 3),
        exercise('bench-press', 3),
        exercise('legacy-unknown', 4),
      ]),
    ]);

    expect(computeRoutineQualityScore(input)).toEqual(
      computeRoutineQualityScore(structuredClone(input)),
    );
  });
});
