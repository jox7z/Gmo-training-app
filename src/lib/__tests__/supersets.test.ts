/**
 * supersets — secuencia de pasos que intercala rondas de grupo (A1→B1→A2→B2…),
 * deja las series sueltas consecutivas y marca `closesRound` para saber cuándo
 * toca descanso. Pura: solo `WorkoutExercise[]` de entrada.
 */
import { buildStepSequence, findStepIndex } from '@/lib/supersets';
import { makeExercise, makeSet } from './fixtures';

/** Ejercicio con `n` series y un grupo opcional; nombra para leer los asserts. */
function ex(name: string, n: number, groupId?: string) {
  return makeExercise({
    exerciseName: name,
    supersetGroupId: groupId,
    sets: Array.from({ length: n }, () => makeSet()),
  });
}

/** Aplana los pasos a tuplas legibles [exIdx, setIdx, closesRound]. */
function tuples(steps: ReturnType<typeof buildStepSequence>) {
  return steps.map((s) => [s.exIdx, s.setIdx, s.closesRound] as const);
}

describe('buildStepSequence', () => {
  it('ejercicios sueltos → series consecutivas, todas cierran ronda', () => {
    const steps = buildStepSequence([ex('A', 2), ex('B', 1)]);
    expect(tuples(steps)).toEqual([
      [0, 0, true],
      [0, 1, true],
      [1, 0, true],
    ]);
  });

  it('grupo 2+2 → intercala A1,B1,A2,B2; solo B (último miembro) cierra ronda', () => {
    const g = 'g1';
    const steps = buildStepSequence([ex('A', 2, g), ex('B', 2, g)]);
    expect(tuples(steps)).toEqual([
      [0, 0, false], // A1
      [1, 0, true], // B1 cierra ronda 0
      [0, 1, false], // A2
      [1, 1, true], // B2 cierra ronda 1
    ]);
  });

  it('grupo 3+3 → 3 rondas completas intercaladas', () => {
    const g = 'g3';
    const steps = buildStepSequence([ex('A', 3, g), ex('B', 3, g)]);
    expect(tuples(steps)).toEqual([
      [0, 0, false],
      [1, 0, true],
      [0, 1, false],
      [1, 1, true],
      [0, 2, false],
      [1, 2, true],
    ]);
  });

  it('grupo 4+2 (desigual) → tras agotarse B, A cierra ronda como suelto', () => {
    const g = 'g42';
    const steps = buildStepSequence([ex('A', 4, g), ex('B', 2, g)]);
    expect(tuples(steps)).toEqual([
      [0, 0, false], // A1
      [1, 0, true], // B1
      [0, 1, false], // A2
      [1, 1, true], // B2 (última de B)
      [0, 2, true], // A3 — B agotada, A cierra sola
      [0, 3, true], // A4 — cierra sola
    ]);
  });

  it('suelto antes y después de un grupo → orden y closesRound correctos', () => {
    const g = 'gm';
    const steps = buildStepSequence([ex('Solo1', 1), ex('A', 2, g), ex('B', 2, g), ex('Solo2', 1)]);
    expect(tuples(steps)).toEqual([
      [0, 0, true], // Solo1
      [1, 0, false], // A1
      [2, 0, true], // B1
      [1, 1, false], // A2
      [2, 1, true], // B2
      [3, 0, true], // Solo2
    ]);
  });

  it('dos grupos separados con el mismo largo → cada uno se intercala aparte', () => {
    const steps = buildStepSequence([ex('A', 1, 'x'), ex('B', 1, 'x'), ex('C', 1, 'y'), ex('D', 1, 'y')]);
    expect(tuples(steps)).toEqual([
      [0, 0, false],
      [1, 0, true],
      [2, 0, false],
      [3, 0, true],
    ]);
  });
});

describe('findStepIndex', () => {
  it('encuentra el índice del paso por (exIdx, setIdx)', () => {
    const g = 'g1';
    const steps = buildStepSequence([ex('A', 2, g), ex('B', 2, g)]);
    expect(findStepIndex(steps, 1, 0)).toBe(1); // B1 es el 2º paso
    expect(findStepIndex(steps, 0, 1)).toBe(2); // A2 es el 3º paso
  });

  it('posición inexistente → -1', () => {
    const steps = buildStepSequence([ex('A', 1)]);
    expect(findStepIndex(steps, 5, 5)).toBe(-1);
  });
});
