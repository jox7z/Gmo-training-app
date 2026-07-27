/**
 * achievements — motor de logros escalonados (estilo Duolingo). La racha se
 * deriva del historial (semana = cualquier semana con >= 1 entreno; corte lunes,
 * fecha local). Los tracks de fuerza/volumen se miden con `measure(ctx)`.
 */
import {
  ACHIEVEMENTS,
  evaluateTrack,
  unlockedTierIds,
  weekStreakFromHistory,
  daysThisWeekFromHistory,
} from '@/lib/achievements';
import { makeWorkout, makeExercise, makeSet } from './fixtures';

// Entreno del día `day` de julio 2026 al mediodía local.
function julyWorkout(day: number) {
  return makeWorkout({ startedAt: new Date(2026, 6, day, 12, 0).toISOString() });
}

describe('weekStreakFromHistory', () => {
  // Ancla temporal: miércoles 2026-07-15 (semana en curso: lunes 2026-07-13).
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 15, 12, 0));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('cuenta 3 semanas consecutivas con al menos un entreno', () => {
    // 2026-07-15 (actual), 2026-07-08 (-1 sem), 2026-07-01 (-2 sem).
    const history = [julyWorkout(15), julyWorkout(8), julyWorkout(1)];
    expect(weekStreakFromHistory(history)).toBe(3);
  });

  it('gracia: la semana en curso sin entreno no rompe la racha previa', () => {
    // Sin entreno en la semana actual; sí en las dos anteriores → racha 2.
    const history = [julyWorkout(8), julyWorkout(1)];
    expect(weekStreakFromHistory(history)).toBe(2);
  });

  it('un hueco entre semanas corta la racha', () => {
    // Semana actual (15) + hace dos semanas (1), pero falta la intermedia (8).
    const history = [julyWorkout(15), julyWorkout(1)];
    expect(weekStreakFromHistory(history)).toBe(1);
  });

  it('historial vacío → 0', () => {
    expect(weekStreakFromHistory([])).toBe(0);
  });
});

describe('daysThisWeekFromHistory', () => {
  // Semana en curso anclada al miércoles 2026-07-15 (lunes 2026-07-13 .. domingo 2026-07-19).
  const now = new Date(2026, 6, 15, 12, 0);

  it('dos entrenos el mismo día calendario cuentan como 1 día', () => {
    const history = [
      makeWorkout({ startedAt: new Date(2026, 6, 15, 9, 0).toISOString() }),
      makeWorkout({ startedAt: new Date(2026, 6, 15, 18, 0).toISOString() }),
    ];
    expect(daysThisWeekFromHistory(history, now)).toBe(1);
  });

  it('entrenos en días distintos de la semana en curso cuentan cada uno', () => {
    const history = [julyWorkout(13), julyWorkout(15), julyWorkout(19)];
    expect(daysThisWeekFromHistory(history, now)).toBe(3);
  });

  it('entrenos de la semana pasada no cuentan', () => {
    const history = [julyWorkout(8), julyWorkout(6)];
    expect(daysThisWeekFromHistory(history, now)).toBe(0);
  });
});

describe('evaluateTrack — fuerza (bench-press)', () => {
  const benchDef = ACHIEVEMENTS.find((d) => d.id === 'strength-bench-press')!;

  it('mide el peso top de por vida y desbloquea los niveles correctos', () => {
    const history = [
      makeWorkout({
        exercises: [
          makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 105, reps: 3 })] }),
        ],
      }),
    ];
    const prog = evaluateTrack(benchDef, { history });
    expect(prog.value).toBe(105);
    // Tiers 40/60/80/100 <= 105; 120/140 aún no.
    expect(prog.unlockedTiers.map((t) => t.threshold)).toEqual([40, 60, 80, 100]);
    expect(prog.level).toBe(4);
    expect(prog.currentTier!.id).toBe('bench-press-100');
    expect(prog.nextTier!.threshold).toBe(120);
  });
});

describe('evaluateTrack — volumen (nº de entrenos)', () => {
  const workoutsDef = ACHIEVEMENTS.find((d) => d.id === 'consistency-workouts')!;

  it('mide la longitud del historial y desbloquea 1 y 10', () => {
    const history = Array.from({ length: 12 }, () => makeWorkout());
    const prog = evaluateTrack(workoutsDef, { history });
    expect(prog.value).toBe(12);
    expect(prog.level).toBe(2); // niveles 1 y 10
    expect(prog.currentTier!.id).toBe('workouts-10');
    expect(prog.nextTier!.id).toBe('workouts-25');
  });
});

describe('unlockedTierIds', () => {
  it('agrega los tierIds desbloqueados de todos los tracks', () => {
    const history = [
      makeWorkout({
        exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 105 })] })],
      }),
      ...Array.from({ length: 11 }, () => makeWorkout()),
    ];
    const ids = unlockedTierIds({ history });
    expect(ids.has('bench-press-100')).toBe(true);
    expect(ids.has('bench-press-120')).toBe(false);
    expect(ids.has('workouts-10')).toBe(true); // 12 entrenos
    expect(ids.has('workouts-25')).toBe(false);
  });
});
