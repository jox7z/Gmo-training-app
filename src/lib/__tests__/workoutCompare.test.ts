/**
 * workoutCompare — detección de PRs por peso, máximo histórico y series de la
 * sesión anterior. Solo cuentan series completadas y no de calentamiento.
 */
import {
  detectPRs,
  historicMaxWeight,
  previousExerciseSets,
  exerciseTopWeight,
} from '@/lib/workoutCompare';
import { makeWorkout, makeExercise, makeSet } from './fixtures';

describe('exerciseTopWeight', () => {
  it('máximo peso entre series completadas no de calentamiento', () => {
    const ex = makeExercise({
      sets: [
        makeSet({ weightKg: 80 }),
        makeSet({ weightKg: 120, isWarmup: true }), // calentamiento pesado → ignorado
        makeSet({ weightKg: 100, isCompleted: false }), // incompleta → ignorada
        makeSet({ weightKg: 90 }),
      ],
    });
    expect(exerciseTopWeight(ex)).toBe(90);
  });

  it('0 si no hay series completadas de trabajo', () => {
    const ex = makeExercise({ sets: [makeSet({ isWarmup: true })] });
    expect(exerciseTopWeight(ex)).toBe(0);
  });
});

describe('detectPRs', () => {
  const prev = makeWorkout({
    startedAt: '2026-07-01T10:00:00.000Z',
    exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 100 })] })],
  });

  it('marca PR cuando el top actual supera el máximo histórico', () => {
    const current = makeWorkout({
      startedAt: '2026-07-08T10:00:00.000Z',
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 105 })] })],
    });
    const prs = detectPRs([prev], current);
    expect(prs.has('bench-press')).toBe(true);
  });

  it('NO marca PR cuando iguala el máximo histórico (estrictamente mayor)', () => {
    const current = makeWorkout({
      startedAt: '2026-07-08T10:00:00.000Z',
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 100 })] })],
    });
    const prs = detectPRs([prev], current);
    expect(prs.has('bench-press')).toBe(false);
  });

  it('ignora ejercicios sin serie válida (top 0)', () => {
    const current = makeWorkout({
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ isCompleted: false })] })],
    });
    expect(detectPRs([prev], current).size).toBe(0);
  });
});

describe('historicMaxWeight', () => {
  const wLow = makeWorkout({
    id: 'w-low',
    exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 100 })] })],
  });
  const wHigh = makeWorkout({
    id: 'w-high',
    exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 120 })] })],
  });

  it('máximo peso histórico a lo largo del historial', () => {
    expect(historicMaxWeight([wLow, wHigh], 'bench-press')).toBe(120);
  });

  it('respeta excludeWorkoutId', () => {
    expect(historicMaxWeight([wLow, wHigh], 'bench-press', 'w-high')).toBe(100);
  });

  it('0 si el ejercicio nunca se registró', () => {
    expect(historicMaxWeight([wLow, wHigh], 'squat')).toBe(0);
  });
});

describe('previousExerciseSets', () => {
  // history ordenado descendente por startedAt (convención del caller).
  const recent = makeWorkout({
    id: 'recent',
    startedAt: '2026-07-10T10:00:00.000Z',
    exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 105, reps: 5 })] })],
  });
  const older = makeWorkout({
    id: 'older',
    startedAt: '2026-07-01T10:00:00.000Z',
    exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 90, reps: 8 })] })],
  });

  it('devuelve las series de la sesión más reciente que contiene el ejercicio', () => {
    const sets = previousExerciseSets([recent, older], 'bench-press');
    expect(sets).not.toBeNull();
    expect(sets!.map((s) => s.weightKg)).toEqual([105]);
  });

  it('excludeWorkoutId salta la sesión indicada y cae a la anterior', () => {
    const sets = previousExerciseSets([recent, older], 'bench-press', 'recent');
    expect(sets!.map((s) => s.weightKg)).toEqual([90]);
  });

  it('salta sesiones cuyo ejercicio es solo calentamiento/incompleto', () => {
    const warmupOnly = makeWorkout({
      id: 'warmup',
      startedAt: '2026-07-12T10:00:00.000Z',
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 60, isWarmup: true })] })],
    });
    const sets = previousExerciseSets([warmupOnly, older], 'bench-press');
    expect(sets!.map((s) => s.weightKg)).toEqual([90]); // cae al 'older' con serie real
  });

  it('null si el ejercicio nunca se registró', () => {
    expect(previousExerciseSets([recent, older], 'deadlift')).toBeNull();
  });
});
