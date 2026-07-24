/**
 * oneRepMax — estimación de 1RM (Epley/Brzycki) y agregación de récords por
 * ejercicio. Todo el cálculo es en kg; se filtran series no completadas, de
 * calentamiento y con peso <= 0.
 */
import { estimate1RM, computeExerciseRecords } from '@/lib/oneRepMax';
import { makeWorkout, makeExercise, makeSet } from './fixtures';

describe('estimate1RM', () => {
  it('Epley: 100 kg × 5 → 100 * (1 + 5/30) ≈ 116.67', () => {
    expect(estimate1RM(100, 5, 'epley')).toBeCloseTo(116.6667, 3);
  });

  it('Brzycki: 100 kg × 5 → (100 * 36) / (37 - 5) = 112.5', () => {
    expect(estimate1RM(100, 5, 'brzycki')).toBe(112.5);
  });

  it('con 1 rep el 1RM es el propio peso en ambas fórmulas', () => {
    expect(estimate1RM(140, 1, 'epley')).toBe(140);
    expect(estimate1RM(140, 1, 'brzycki')).toBe(140);
  });

  it('peso <= 0 devuelve 0 (peso corporal / inválido)', () => {
    expect(estimate1RM(0, 8, 'epley')).toBe(0);
    expect(estimate1RM(-20, 8, 'brzycki')).toBe(0);
  });

  it('reps se acotan a [1, 30]: 0 reps cuenta como 1, 40 reps como 30', () => {
    expect(estimate1RM(100, 0, 'epley')).toBe(100); // acotado a 1 rep
    expect(estimate1RM(100, 40, 'epley')).toBe(200); // acotado a 30: 100*(1+30/30)
  });
});

describe('computeExerciseRecords', () => {
  // Sesión A: bench 100×5 y squat 140×3 (fecha más antigua).
  const workoutA = makeWorkout({
    startedAt: '2026-07-01T10:00:00.000Z',
    exercises: [
      makeExercise({
        exerciseId: 'bench-press',
        sets: [makeSet({ weightKg: 100, reps: 5 })],
      }),
      makeExercise({
        exerciseId: 'squat',
        exerciseName: 'Sentadilla',
        muscleGroup: 'quads',
        sets: [makeSet({ weightKg: 140, reps: 3 })],
      }),
    ],
  });

  // Sesión B: bench 102×3 real + calentamiento 60×10 + incompleta 110×1 + 0 kg.
  const workoutB = makeWorkout({
    startedAt: '2026-07-08T10:00:00.000Z',
    exercises: [
      makeExercise({
        exerciseId: 'bench-press',
        sets: [
          makeSet({ weightKg: 60, reps: 10, isWarmup: true }),
          makeSet({ weightKg: 102, reps: 3 }),
          makeSet({ weightKg: 110, reps: 1, isCompleted: false }),
          makeSet({ weightKg: 0, reps: 8 }),
        ],
      }),
    ],
  });

  const records = computeExerciseRecords([workoutB, workoutA], 'epley');
  const bench = records.find((r) => r.exerciseId === 'bench-press')!;
  const squat = records.find((r) => r.exerciseId === 'squat')!;

  it('ordena por mejor 1RM estimado descendente (squat 154 > bench 116.7)', () => {
    expect(records.map((r) => r.exerciseId)).toEqual(['squat', 'bench-press']);
  });

  it('ignora calentamiento, incompletas y peso 0 para el mejor peso', () => {
    // El 110×1 es incompleto → no cuenta; el mejor peso real es 102×3.
    expect(bench.bestWeightKg).toBe(102);
    expect(bench.bestWeightReps).toBe(3);
    expect(bench.bestWeightDate).toBe('2026-07-08T10:00:00.000Z');
  });

  it('el mejor 1RM puede venir de otra serie que el mejor peso', () => {
    // 100×5 (Epley 116.67) supera a 102×3 (112.2).
    expect(bench.bestE1rmKg).toBeCloseTo(116.6667, 3);
    expect(bench.bestE1rmWeightKg).toBe(100);
    expect(bench.bestE1rmReps).toBe(5);
    expect(bench.bestE1rmDate).toBe('2026-07-01T10:00:00.000Z');
  });

  it('cuenta sesiones con al menos una serie válida por ejercicio', () => {
    expect(bench.sessions).toBe(2); // aparece en A y B
    expect(squat.sessions).toBe(1); // solo en A
  });

  it('omite ejercicios sin ninguna serie válida (solo calentamiento)', () => {
    const warmupOnly = makeWorkout({
      exercises: [
        makeExercise({
          exerciseId: 'db-fly',
          sets: [makeSet({ weightKg: 20, reps: 12, isWarmup: true })],
        }),
      ],
    });
    const recs = computeExerciseRecords([warmupOnly], 'epley');
    expect(recs).toHaveLength(0);
  });
});
