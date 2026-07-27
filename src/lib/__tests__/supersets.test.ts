/**
 * supersets — secuencia de pasos que intercala rondas de grupo (A1→B1→A2→B2…),
 * deja las series sueltas consecutivas y marca `closesRound` para saber cuándo
 * toca descanso. Pura: solo `WorkoutExercise[]` de entrada.
 */
import { buildStepSequence, findStepIndex, dissolveNonContiguousGroups } from '@/lib/supersets';
import { makeExercise, makeSet } from './fixtures';

/** Ejercicio con `n` series y un grupo opcional; nombra para leer los asserts. */
function ex(name: string, n: number, groupId?: string) {
  return makeExercise({
    exerciseName: name,
    supersetGroupId: groupId,
    sets: Array.from({ length: n }, () => makeSet()),
  });
}

/** Igual que `ex` pero con descanso intra-grupo activo (Parte F). */
function exRest(name: string, n: number, groupId: string) {
  return makeExercise({
    exerciseName: name,
    supersetGroupId: groupId,
    groupRestEnabled: true,
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

  it('grupo 2 con warmups solo en A → warmups de A primero (descanso), luego round-robin de reales', () => {
    const g = 'gw1';
    // A: 2 warmups + 2 reales; B: solo 2 reales.
    const A = makeExercise({
      exerciseName: 'A',
      supersetGroupId: g,
      sets: [makeSet({ isWarmup: true }), makeSet({ isWarmup: true }), makeSet(), makeSet()],
    });
    const B = makeExercise({ exerciseName: 'B', supersetGroupId: g, sets: [makeSet(), makeSet()] });
    const steps = buildStepSequence([A, B]);
    expect(tuples(steps)).toEqual([
      [0, 0, true], // A warmup 1 → descanso normal
      [0, 1, true], // A warmup 2 → descanso normal
      [0, 2, false], // A real 1 — setIdx REAL 2 (tras los 2 warmups), no ronda 0
      [1, 0, true], // B real 1 cierra ronda
      [0, 3, false], // A real 2 — setIdx REAL 3
      [1, 1, true], // B real 2 cierra ronda
    ]);
    // Confirma explícito: los pasos de trabajo de A apuntan al índice REAL en sets[]
    // (2 y 3), no a un número de ronda ficticio empezando en 0.
    const aWorkSetIdxs = steps.filter((s) => s.exIdx === 0).slice(2).map((s) => s.setIdx);
    expect(aWorkSetIdxs).toEqual([2, 3]);
  });

  it('grupo 2 con warmups en ambos → todos los warmups de A, luego los de B, luego el trabajo', () => {
    const g = 'gw2';
    // A: 1 warmup + 2 reales; B: 2 warmups + 2 reales.
    const A = makeExercise({
      exerciseName: 'A',
      supersetGroupId: g,
      sets: [makeSet({ isWarmup: true }), makeSet(), makeSet()],
    });
    const B = makeExercise({
      exerciseName: 'B',
      supersetGroupId: g,
      sets: [makeSet({ isWarmup: true }), makeSet({ isWarmup: true }), makeSet(), makeSet()],
    });
    const steps = buildStepSequence([A, B]);
    expect(tuples(steps)).toEqual([
      [0, 0, true], // A warmup (único)
      [1, 0, true], // B warmup 1
      [1, 1, true], // B warmup 2
      [0, 1, false], // A real 1 — setIdx REAL 1
      [1, 2, true], // B real 1 — setIdx REAL 2
      [0, 2, false], // A real 2 — setIdx REAL 2
      [1, 3, true], // B real 2 — setIdx REAL 3
    ]);
  });

  it('triset con warmup en un miembro → warmup suelto primero, luego round-robin de 3', () => {
    const g = 'gw3';
    // A: 1 warmup + 2 reales; B y C: 2 reales cada uno.
    const A = makeExercise({
      exerciseName: 'A',
      supersetGroupId: g,
      sets: [makeSet({ isWarmup: true }), makeSet(), makeSet()],
    });
    const B = makeExercise({ exerciseName: 'B', supersetGroupId: g, sets: [makeSet(), makeSet()] });
    const C = makeExercise({ exerciseName: 'C', supersetGroupId: g, sets: [makeSet(), makeSet()] });
    const steps = buildStepSequence([A, B, C]);
    expect(tuples(steps)).toEqual([
      [0, 0, true], // A warmup → descanso normal
      [0, 1, false], // A real 1 — setIdx REAL 1
      [1, 0, false], // B real 1
      [2, 0, true], // C real 1 cierra ronda
      [0, 2, false], // A real 2 — setIdx REAL 2
      [1, 1, false], // B real 2
      [2, 1, true], // C real 2 cierra ronda
    ]);
  });

  it('grupo 2 con groupRestEnabled → TODAS las series de trabajo cierran ronda', () => {
    const g = 'gr2';
    const steps = buildStepSequence([exRest('A', 2, g), exRest('B', 2, g)]);
    expect(tuples(steps)).toEqual([
      [0, 0, true], // A1 — con descanso también cierra
      [1, 0, true], // B1 cierra ronda 0
      [0, 1, true], // A2 — con descanso también cierra
      [1, 1, true], // B2 cierra ronda 1
    ]);
  });

  it('triset con groupRestEnabled → los 3 miembros de cada ronda cierran individualmente', () => {
    const g = 'gr3';
    const steps = buildStepSequence([exRest('A', 2, g), exRest('B', 2, g), exRest('C', 2, g)]);
    expect(tuples(steps)).toEqual([
      [0, 0, true], // A1
      [1, 0, true], // B1
      [2, 0, true], // C1
      [0, 1, true], // A2
      [1, 1, true], // B2
      [2, 1, true], // C2
    ]);
  });

  it('groupRestEnabled=false explícito reproduce el intercalado clásico (sin regresión)', () => {
    const g = 'grf';
    const A = makeExercise({
      exerciseName: 'A',
      supersetGroupId: g,
      groupRestEnabled: false,
      sets: [makeSet(), makeSet()],
    });
    const B = makeExercise({
      exerciseName: 'B',
      supersetGroupId: g,
      groupRestEnabled: false,
      sets: [makeSet(), makeSet()],
    });
    expect(tuples(buildStepSequence([A, B]))).toEqual([
      [0, 0, false], // A1
      [1, 0, true], // B1 cierra ronda
      [0, 1, false], // A2
      [1, 1, true], // B2 cierra ronda
    ]);
  });

  it('groupRestEnabled no altera la fase de calentamiento (los warmups ya cerraban ronda)', () => {
    const g = 'grw';
    // A: 1 warmup + 2 reales (con descanso); B: 2 reales (con descanso).
    const A = makeExercise({
      exerciseName: 'A',
      supersetGroupId: g,
      groupRestEnabled: true,
      sets: [makeSet({ isWarmup: true }), makeSet(), makeSet()],
    });
    const B = makeExercise({
      exerciseName: 'B',
      supersetGroupId: g,
      groupRestEnabled: true,
      sets: [makeSet(), makeSet()],
    });
    expect(tuples(buildStepSequence([A, B]))).toEqual([
      [0, 0, true], // A warmup (setIdx REAL 0) — igual que sin el flag
      [0, 1, true], // A real 1 — ahora cierra por el flag
      [1, 0, true], // B real 1 — cierra por el flag
      [0, 2, true], // A real 2 — cierra por el flag
      [1, 1, true], // B real 2 — cierra ronda
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

describe('dissolveNonContiguousGroups', () => {
  /** Item mínimo con solo los campos que le importan a la función. */
  function item(name: string, groupId?: string, groupRestEnabled?: boolean) {
    return { name, supersetGroupId: groupId, groupRestEnabled };
  }

  it('grupo contiguo de 2+ sobrevive intacto', () => {
    const result = dissolveNonContiguousGroups([item('A', 'g'), item('B', 'g'), item('C')]);
    expect(result.map((i) => i.supersetGroupId)).toEqual(['g', 'g', undefined]);
  });

  it('reagrupar un subconjunto de un trío deja un resto no contiguo → se disuelve', () => {
    // [A(g1),B(g1),C(g1),D] → seleccionar {B,D} y agrupar como g2 produce
    // [A(g1), B(g2), D(g2), C(g1)]: A y C comparten "g1" por valor pero ya no son
    // adyacentes (B/D quedaron entre medio) — deben disolverse a sueltos aunque el
    // conteo global de "g1" siga siendo 2.
    const result = dissolveNonContiguousGroups([
      item('A', 'g1'),
      item('B', 'g2'),
      item('D', 'g2'),
      item('C', 'g1'),
    ]);
    expect(result.map((i) => [i.name, i.supersetGroupId])).toEqual([
      ['A', undefined],
      ['B', 'g2'],
      ['D', 'g2'],
      ['C', undefined],
    ]);
  });

  it('swap del miembro del medio de un trío parte la corrida → los extremos se disuelven', () => {
    // [A(g),B_remnant(sin grupo),B_new(g),C(g)]: A queda aislado (corrida de 1);
    // [B_new,C] sigue siendo un par válido (corrida de 2).
    const result = dissolveNonContiguousGroups([
      item('A', 'g'),
      item('B_remnant', undefined),
      item('B_new', 'g'),
      item('C', 'g'),
    ]);
    expect(result.map((i) => [i.name, i.supersetGroupId])).toEqual([
      ['A', undefined],
      ['B_remnant', undefined],
      ['B_new', 'g'],
      ['C', 'g'],
    ]);
  });

  it('array vacío o sin ningún grupo no cambia nada', () => {
    expect(dissolveNonContiguousGroups([])).toEqual([]);
    const loose = [item('A'), item('B')];
    expect(dissolveNonContiguousGroups(loose)).toEqual(loose);
  });

  it('al disolver un huérfano también limpia groupRestEnabled (no deja el flag colgando)', () => {
    // Un par con descanso activado (A,B ambos true); se quita B (queda solo, sin
    // grupo, gestionado fuera de esta función) dejando a A como corrida de 1. Si
    // solo se limpiara supersetGroupId, A quedaría "suelto" pero con
    // groupRestEnabled:true colgando — listo para contaminar el próximo grupo en el
    // que A entre (buildStepSequence lee el flag del primer miembro del grupo).
    const result = dissolveNonContiguousGroups([item('A', 'g', true)]);
    expect(result).toEqual([{ name: 'A', supersetGroupId: undefined, groupRestEnabled: undefined }]);
  });

  it('un ejercicio ajeno insertado en medio de un circuito lo parte en 2 pares — cada uno debe quedar con un id DISTINTO', () => {
    // Circuito de 4 [A,B,C,D] + un drag que clava E justo en el medio:
    // [A,B,E,C,D] — [A,B] y [C,D] miden ≥2 cada uno (sobreviven el chequeo de
    // longitud) pero YA NO son el mismo grupo visual/mecánico. Sin la reasignación,
    // ambos seguirían compartiendo "g" y togglear el descanso de uno afectaría al otro.
    const result = dissolveNonContiguousGroups([
      item('A', 'g'),
      item('B', 'g'),
      item('E'),
      item('C', 'g'),
      item('D', 'g'),
    ]);
    const [a, b, e, c, d] = result;
    expect(e.supersetGroupId).toBeUndefined();
    expect(a.supersetGroupId).toBeDefined();
    expect(a.supersetGroupId).toBe(b.supersetGroupId); // A y B siguen pareja
    expect(c.supersetGroupId).toBeDefined();
    expect(c.supersetGroupId).toBe(d.supersetGroupId); // C y D siguen pareja
    expect(a.supersetGroupId).not.toBe(c.supersetGroupId); // pero YA NO es el mismo grupo
  });
});
