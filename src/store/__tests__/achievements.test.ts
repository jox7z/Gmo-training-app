/**
 * store/achievements — persistencia de niveles desbloqueados (AsyncStorage) y
 * detección de niveles NUEVOS para celebrar. El primer sync() (seeded:false)
 * hace un backfill silencioso: persiste en el estado los tiers que ya
 * corresponden al historial, pero no devuelve nada. A partir de ahí, cada
 * sync() devuelve solo los tiers recién cruzados, ordenados ASCENDENTE por
 * threshold — sin importar el orden en que el motor puro los detecta.
 */
import { useAchievementsStore } from '@/store/achievements';
import { makeWorkout, makeExercise, makeSet } from '@/lib/__tests__/fixtures';
import type { Workout } from '@/store/workouts';

// Entreno "limpio": sin ejercicios, para que solo alimente el track de
// volumen (nº de entrenos) y no arrastre de paso ningún tier de fuerza/variedad.
function emptyWorkout(): Workout {
  return makeWorkout({ exercises: [] });
}

// Ancla temporal: miércoles 2026-07-15 (misma semana que el `startedAt` fijo
// de `makeWorkout`, 2026-07-14) — el track `streak` de achievements.ts deriva
// de `new Date()` real. Sin esto, ningún tier de racha se cruza HOY, pero
// queda flaky en el tiempo: extender este archivo con entrenos en semanas
// distintas dependería de qué día corre el test. Mismo ancla que
// src/lib/__tests__/achievements.test.ts.
beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 6, 15, 12, 0));
});
afterAll(() => {
  jest.useRealTimers();
});

beforeEach(async () => {
  await useAchievementsStore.getState().reset();
});

describe('sync — primer backfill (seeded:false)', () => {
  it('desbloquea el tier en el estado persistido pero no devuelve nada para celebrar', () => {
    const newly = useAchievementsStore.getState().sync({ history: [emptyWorkout()] });

    expect(newly).toEqual([]);

    const state = useAchievementsStore.getState();
    expect(state.seeded).toBe(true);
    expect(typeof state.unlocked['workouts-1']).toBe('string');
  });
});

describe('sync — segundo sync con exactamente un tier nuevo', () => {
  it('devuelve solo el tier recién cruzado, sin repetir el ya notificado en el backfill', () => {
    // Backfill inicial: 1 entreno → registra 'workouts-1' en silencio.
    useAchievementsStore.getState().sync({ history: [emptyWorkout()] });

    // 10 entrenos: cruza 'workouts-1' (ya registrado, se ignora) y 'workouts-10' (nuevo).
    const newly = useAchievementsStore
      .getState()
      .sync({ history: Array.from({ length: 10 }, () => emptyWorkout()) });

    expect(newly).toHaveLength(1);
    expect(newly[0].tier.id).toBe('workouts-10');
  });
});

describe('sync — varios tiers cruzados a la vez', () => {
  it('el array devuelto queda ordenado ascendente por threshold, no por orden de detección', () => {
    // Backfill inicial en silencio (historial vacío: no cruza ningún tier).
    useAchievementsStore.getState().sync({ history: [] });

    // 50 entrenos cruzan 'workouts-1/10/25/50'. Uno de ellos además tiene una
    // serie de 45 kg en press de banca, que cruza 'bench-press-40' — un track
    // declarado ANTES que 'consistency-workouts' en el catálogo, así que el
    // motor lo agrega primero al set (threshold 40) pese a caer en medio del
    // rango 25..50. Si sync() no ordenara el resultado, este test fallaría.
    const history: Workout[] = [
      makeWorkout({
        exercises: [makeExercise({ exerciseId: 'bench-press', sets: [makeSet({ weightKg: 45 })] })],
      }),
      ...Array.from({ length: 49 }, () => emptyWorkout()),
    ];

    const newly = useAchievementsStore.getState().sync({ history });

    expect(newly.map((u) => u.tier.id)).toEqual([
      'workouts-1',
      'workouts-10',
      'workouts-25',
      'bench-press-40',
      'workouts-50',
    ]);
    expect(newly.map((u) => u.tier.threshold)).toEqual([1, 10, 25, 40, 50]);
  });
});
