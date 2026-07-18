/**
 * exerciseProgress — serie temporal de peso top por ejercicio y listado de
 * ejercicios entrenados. Las sesiones sin serie válida (solo calentamiento) se
 * excluyen del timeline para no dibujar caídas falsas a 0.
 */
import { buildExerciseTimeline, listTrainedExercises } from '@/lib/exerciseProgress';
import { makeWorkout, makeExercise, makeSet } from './fixtures';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();

describe('buildExerciseTimeline', () => {
  it('excluye sesiones solo-calentamiento y ordena ascendente por fecha', () => {
    const wLate = makeWorkout({
      startedAt: '2026-07-10T10:00:00.000Z',
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 100, reps: 5 })] })],
    });
    const wEarly = makeWorkout({
      startedAt: '2026-07-01T10:00:00.000Z',
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 90, reps: 8 })] })],
    });
    const wWarmup = makeWorkout({
      startedAt: '2026-07-05T10:00:00.000Z',
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 60, reps: 10, isWarmup: true })] })],
    });

    const tl = buildExerciseTimeline([wLate, wEarly, wWarmup], 'bench-press', 'all');
    expect(tl).toEqual([
      { date: '2026-07-01', topWeightKg: 90, repsAtTop: 8 },
      { date: '2026-07-10', topWeightKg: 100, repsAtTop: 5 },
    ]);
  });

  it('repsAtTop corresponde a la serie del peso máximo', () => {
    const w = makeWorkout({
      startedAt: '2026-07-10T10:00:00.000Z',
      exercises: [
        makeExercise({
          exerciseId: 'bench-press',
          sets: [makeSet({ weightKg: 90, reps: 10 }), makeSet({ weightKg: 100, reps: 4 })],
        }),
      ],
    });
    const tl = buildExerciseTimeline([w], 'bench-press', 'all');
    expect(tl[0]).toEqual({ date: '2026-07-10', topWeightKg: 100, repsAtTop: 4 });
  });

  it('el período filtra por fecha (7d deja fuera lo anterior)', () => {
    const recent = makeWorkout({
      startedAt: daysAgo(2),
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 100, reps: 5 })] })],
    });
    const old = makeWorkout({
      startedAt: daysAgo(40),
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 80, reps: 5 })] })],
    });
    const tl = buildExerciseTimeline([recent, old], 'bench-press', '7d');
    expect(tl).toHaveLength(1);
    expect(tl[0].topWeightKg).toBe(100);
  });
});

describe('listTrainedExercises', () => {
  const w1 = makeWorkout({
    startedAt: '2026-07-10T10:00:00.000Z',
    exercises: [
      makeExercise({ exerciseId: 'bench-press' }),
      makeExercise({ exerciseId: 'squat', exerciseName: 'Sentadilla', muscleGroup: 'quads' }),
    ],
  });
  const w2 = makeWorkout({
    startedAt: '2026-07-08T10:00:00.000Z',
    exercises: [makeExercise({ exerciseId: 'squat', exerciseName: 'Sentadilla', muscleGroup: 'quads' })],
  });
  const w3 = makeWorkout({
    startedAt: '2026-07-05T10:00:00.000Z',
    exercises: [makeExercise({ exerciseId: 'bench-press' })],
  });
  const w4 = makeWorkout({
    startedAt: '2026-07-01T10:00:00.000Z',
    exercises: [makeExercise({ exerciseId: 'bench-press' }), makeExercise({ exerciseId: 'db-fly' })],
  });

  const list = listTrainedExercises([w1, w2, w3, w4]);

  it('ordena por recencia y desempata por frecuencia', () => {
    // bench y squat comparten lastDate 2026-07-10 → gana bench (3 sesiones > 2).
    expect(list.map((e) => e.exerciseId)).toEqual(['bench-press', 'squat', 'db-fly']);
  });

  it('cuenta sesiones y fecha más reciente por ejercicio', () => {
    const bench = list.find((e) => e.exerciseId === 'bench-press')!;
    const squat = list.find((e) => e.exerciseId === 'squat')!;
    const dbFly = list.find((e) => e.exerciseId === 'db-fly')!;
    expect(bench).toMatchObject({ sessions: 3, lastDate: '2026-07-10' });
    expect(squat).toMatchObject({ sessions: 2, lastDate: '2026-07-10' });
    expect(dbFly).toMatchObject({ sessions: 1, lastDate: '2026-07-01' });
  });
});
