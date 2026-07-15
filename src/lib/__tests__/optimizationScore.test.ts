/**
 * optimizationScore — heatmap muscular semanal (conteo fraccional, corte lunes),
 * estado semafórico y análisis de músculos de una rutina.
 *
 * bench-press: primario chest, sinergistas [triceps, front_delt] → cada serie
 * suma 1 a chest y 0.5 a cada sinergista.
 */
import {
  weeklySetsByMuscle,
  muscleStatusFromWeeklySets,
  analyzeRoutineMuscles,
} from '@/lib/optimizationScore';
import type { Routine } from '@/store/routines';
import { makeWorkout, makeExercise, makeSet } from './fixtures';

describe('weeklySetsByMuscle', () => {
  // now = miércoles 2026-07-15 12:00 local. Corte de semana en lunes 2026-07-13.
  const now = new Date(2026, 6, 15, 12, 0).getTime();

  it('lunes 00:01 cuenta en la semana; domingo previo 23:59 NO', () => {
    const monday = makeWorkout({
      startedAt: new Date(2026, 6, 13, 0, 1).toISOString(), // lunes de la semana actual
      exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet()] })],
    });
    const prevSunday = makeWorkout({
      startedAt: new Date(2026, 6, 12, 23, 59).toISOString(), // domingo semana anterior
      exercises: [
        makeExercise({
          exerciseId: 'squat',
          exerciseName: 'Sentadilla',
          muscleGroup: 'quads',
          sets: [makeSet()],
        }),
      ],
    });
    const sets = weeklySetsByMuscle([monday, prevSunday], now);
    expect(sets.chest).toBe(1); // del lunes
    expect(sets.quads).toBeUndefined(); // el domingo previo queda fuera
  });

  it('conteo fraccional: cada serie suma 0.5 a cada sinergista, redondeado a 0.5', () => {
    const monday = makeWorkout({
      startedAt: new Date(2026, 6, 13, 9, 0).toISOString(),
      exercises: [
        makeExercise({
          exerciseId: 'bench-press',
          sets: [
            makeSet(),
            makeSet(),
            makeSet(),
            makeSet({ isWarmup: true }), // no cuenta
            makeSet({ isCompleted: false }), // no cuenta
          ],
        }),
      ],
    });
    const sets = weeklySetsByMuscle([monday], now);
    expect(sets.chest).toBe(3); // 3 series de trabajo
    expect(sets.triceps).toBe(1.5); // 3 * 0.5
    expect(sets.front_delt).toBe(1.5);
    // Todos los valores son múltiplos de 0.5.
    for (const v of Object.values(sets)) {
      expect(v % 0.5).toBe(0);
    }
  });
});

describe('muscleStatusFromWeeklySets', () => {
  it('mapea series semanales a estado semafórico', () => {
    expect(muscleStatusFromWeeklySets(0)).toBe('untrained');
    expect(muscleStatusFromWeeklySets(0.5)).toBe('low');
    expect(muscleStatusFromWeeklySets(8)).toBe('optimal');
    expect(muscleStatusFromWeeklySets(20)).toBe('optimal');
    expect(muscleStatusFromWeeklySets(20.5)).toBe('high');
  });
});

describe('analyzeRoutineMuscles', () => {
  const routine: Routine = {
    id: 'r1',
    name: 'Full body',
    splitType: 'full_body',
    createdAt: '2026-07-01T00:00:00.000Z',
    days: [
      {
        id: 'd1',
        name: 'Día 1',
        exercises: [
          {
            id: 'de1',
            exerciseId: 'bench-press',
            targetSets: 10,
            targetRepsMin: 6,
            targetRepsMax: 10,
            restSeconds: 120,
          },
        ],
      },
    ],
  };

  const items = analyzeRoutineMuscles(routine);
  const byMuscle = (m: string) => items.find((i) => i.muscle === m);

  it('cuenta sinergistas (0.5) además del primario', () => {
    expect(byMuscle('chest')!.weeklySets).toBe(10); // primario
    expect(byMuscle('triceps')!.weeklySets).toBe(5); // 10 * 0.5
    expect(byMuscle('front_delt')!.weeklySets).toBe(5);
  });

  it('asigna estado y frecuencia por músculo', () => {
    const chest = byMuscle('chest')!;
    expect(chest.status).toBe('optimal'); // 10 en [8, 20]
    expect(chest.frequency).toBe(1);
    expect(byMuscle('triceps')!.status).toBe('low'); // 5 < 8
  });

  it('omite músculos ausentes en la rutina', () => {
    expect(byMuscle('quads')).toBeUndefined();
    expect(byMuscle('back')).toBeUndefined();
  });
});
