import { describe, expect, test } from '@jest/globals';

import {
  filterAndSortExerciseProgress,
  getAvailableExerciseProgressMetadata,
  getExerciseProgressItemMetadata,
  normalizeExerciseProgressText,
} from '@/lib/exerciseProgressPicker';
import type {
  ExercisePerformance,
  ExercisePerformanceSession,
} from '@/lib/progressInsights';

function makePerformance({
  exerciseId,
  name,
  latestMs,
  sessionCount = 1,
}: {
  exerciseId: string;
  name: string;
  latestMs: number;
  sessionCount?: number;
}): ExercisePerformance {
  const sessions = Array.from({ length: sessionCount }, (_, index) =>
    makeSession(latestMs - index * 1_000),
  );

  return {
    exerciseId,
    name,
    sessions,
    latest: sessions[0],
    defaultMetric: 'weight',
  };
}

function makeSession(ms: number): ExercisePerformanceSession {
  return {
    workoutId: `workout-${ms}`,
    startedAt: new Date(ms).toISOString(),
    ms,
    setCount: 1,
    totalReps: 8,
    topWeightKg: 50,
    activeSeconds: null,
  };
}

describe('exerciseProgressPicker', () => {
  test('normaliza acentos, mayúsculas y espacios para buscar por nombre', () => {
    expect(normalizeExerciseProgressText('  EXTENSIÓN   de Bíceps ')).toBe(
      'extension de biceps',
    );

    const item = makePerformance({
      exerciseId: 'legacy-extension',
      name: 'Extensión de bíceps',
      latestMs: 10,
    });
    expect(
      filterAndSortExerciseProgress([item], {
        sortMode: 'all',
        query: 'extension de biceps',
      }),
    ).toEqual([item]);
  });

  test('la búsqueda consulta todos los ejercicios aunque el modo sea recientes', () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      makePerformance({
        exerciseId: `legacy-${index}`,
        name: index === 7 ? 'Objetivo lejano' : `Ejercicio ${index}`,
        latestMs: 100 - index,
      }),
    );

    expect(
      filterAndSortExerciseProgress(items, {
        sortMode: 'recent',
        query: 'objetivo',
      }).map((item) => item.exerciseId),
    ).toEqual(['legacy-7']);
  });

  test('recientes devuelve solo los seis últimos', () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      makePerformance({
        exerciseId: `legacy-${index}`,
        name: `Ejercicio ${index}`,
        latestMs: index,
      }),
    );

    expect(
      filterAndSortExerciseProgress(items, { sortMode: 'recent' }).map(
        (item) => item.exerciseId,
      ),
    ).toEqual(['legacy-7', 'legacy-6', 'legacy-5', 'legacy-4', 'legacy-3', 'legacy-2']);
  });

  test('más entrenados ordena por cantidad de sesiones descendente', () => {
    const one = makePerformance({
      exerciseId: 'one',
      name: 'Uno',
      latestMs: 30,
      sessionCount: 1,
    });
    const three = makePerformance({
      exerciseId: 'three',
      name: 'Tres',
      latestMs: 10,
      sessionCount: 3,
    });
    const two = makePerformance({
      exerciseId: 'two',
      name: 'Dos',
      latestMs: 20,
      sessionCount: 2,
    });

    expect(
      filterAndSortExerciseProgress([one, three, two], {
        sortMode: 'most-trained',
      }).map((item) => item.exerciseId),
    ).toEqual(['three', 'two', 'one']);
  });

  test('todos usa orden alfabético español', () => {
    const items = ['Oblicuos', 'Ñandú', 'Nadar'].map((name, index) =>
      makePerformance({
        exerciseId: `legacy-${name}`,
        name,
        latestMs: index,
      }),
    );

    expect(
      filterAndSortExerciseProgress(items, { sortMode: 'all' }).map(
        (item) => item.name,
      ),
    ).toEqual(['Nadar', 'Ñandú', 'Oblicuos']);
  });

  test('combina músculo y equipo con AND', () => {
    const bench = makePerformance({
      exerciseId: 'bench-press',
      name: 'Press de banca',
      latestMs: 30,
    });
    const dumbbellBench = makePerformance({
      exerciseId: 'flat-db-press',
      name: 'Press plano con mancuernas',
      latestMs: 20,
    });
    const row = makePerformance({
      exerciseId: 'barbell-row',
      name: 'Remo con barra',
      latestMs: 10,
    });

    expect(
      filterAndSortExerciseProgress([bench, dumbbellBench, row], {
        sortMode: 'all',
        muscle: 'chest',
        equipment: 'barbell',
      }),
    ).toEqual([bench]);
  });

  test('mantiene ejercicios legacy visibles y no inventa metadata para sus chips', () => {
    const legacy = makePerformance({
      exerciseId: 'ejercicio-eliminado',
      name: 'Press histórico',
      latestMs: 40,
    });
    const bench = makePerformance({
      exerciseId: 'bench-press',
      name: 'Press de banca',
      latestMs: 30,
    });

    expect(
      filterAndSortExerciseProgress([legacy, bench], { sortMode: 'all' }),
    ).toContain(legacy);
    expect(
      filterAndSortExerciseProgress([legacy, bench], {
        sortMode: 'recent',
        query: 'historico',
      }),
    ).toEqual([legacy]);
    expect(getExerciseProgressItemMetadata(legacy.exerciseId)).toEqual({
      muscle: null,
      equipment: null,
      muscleLabel: 'Sin categoría',
      equipmentLabel: 'Equipo sin datos',
    });
    expect(getAvailableExerciseProgressMetadata([legacy, bench])).toEqual({
      muscles: [{ value: 'chest', label: 'Pecho' }],
      equipment: [{ value: 'barbell', label: 'Barra' }],
    });
  });
});
