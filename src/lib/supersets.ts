/**
 * supersets — máquina de avance del entreno activo con supersets.
 *
 * Precalcula la secuencia lineal de pasos (una serie por paso) intercalando las
 * rondas de cada grupo: A1→B1→A2→B2… Un ejercicio suelto aporta sus series
 * consecutivas. Toda la lógica es pura (sin efectos, sin RN/AsyncStorage): recibe
 * `WorkoutExercise[]` y devuelve pasos, para poder testearla en aislamiento.
 *
 * El algoritmo soporta grupos de 2 a 4 miembros (supersets, trisets y circuitos).
 * Series desiguales entre miembros se cubren solas: cuando un miembro se queda sin
 * series en una ronda, se excluye y el resto pasa a comportarse como suelto
 * (descanso normal) el resto de rondas.
 *
 * Calentamiento dentro de un grupo: cada miembro hace sus PROPIAS series isWarmup
 * primero (en orden de miembro, cada una con descanso normal), y solo cuando todos
 * terminaron su calentamiento arranca la fase de trabajo intercalada (round-robin)
 * sobre las series que NO son warmup. Así el calentamiento de uno nunca se empareja
 * contra las series reales del otro.
 */
import type { WorkoutExercise } from '@/store/workouts';

export interface WorkoutStep {
  exIdx: number;
  setIdx: number;
  /**
   * Este paso cierra la ronda de su grupo (o es una serie suelta) → toca descanso.
   * Si es false, el paso salta directo al siguiente miembro del grupo sin descanso.
   */
  closesRound: boolean;
}

export function buildStepSequence(exercises: WorkoutExercise[]): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  let i = 0;
  while (i < exercises.length) {
    const groupId = exercises[i].supersetGroupId;
    // Ejercicio suelto: todas sus series consecutivas, cada una cierra ronda.
    if (!groupId) {
      exercises[i].sets.forEach((_, si) => steps.push({ exIdx: i, setIdx: si, closesRound: true }));
      i += 1;
      continue;
    }
    // Grupo: recorre los miembros contiguos con el mismo supersetGroupId.
    let j = i;
    while (j < exercises.length && exercises[j].supersetGroupId === groupId) j += 1;
    const groupIdxs = Array.from({ length: j - i }, (_, k) => i + k);

    // Fase de calentamiento: cada miembro hace sus propias series isWarmup como pasos
    // sueltos (descanso normal), en orden de miembro, ANTES de la fase de trabajo
    // intercalada del grupo — evita emparejar el calentamiento de uno contra las
    // series reales del otro.
    groupIdxs.forEach((idx) => {
      exercises[idx].sets.forEach((s, si) => {
        if (s.isWarmup) steps.push({ exIdx: idx, setIdx: si, closesRound: true });
      });
    });

    // Fase de trabajo: solo series NO warmup, intercaladas por ronda. setIdx usa el
    // índice REAL dentro de sets[] (puede no coincidir con el nº de ronda si hay
    // warmups prependeados).
    const workIdxByMember = new Map(
      groupIdxs.map((idx) => [
        idx,
        exercises[idx].sets.map((s, si) => (s.isWarmup ? -1 : si)).filter((si) => si >= 0),
      ]),
    );
    // Descanso intra-grupo: si el grupo lo tiene activo, CADA serie del round-robin
    // cierra ronda (dispara el descanso autopausado entre miembros); si no, solo la
    // del último miembro de la ronda. Todos los miembros comparten el mismo valor:
    // basta leerlo del primero.
    const groupRestEnabled = exercises[groupIdxs[0]].groupRestEnabled ?? false;
    const maxRounds = Math.max(...groupIdxs.map((idx) => workIdxByMember.get(idx)!.length));
    for (let round = 0; round < maxRounds; round++) {
      const members = groupIdxs.filter((idx) => round < workIdxByMember.get(idx)!.length);
      members.forEach((idx, k) =>
        steps.push({
          exIdx: idx,
          setIdx: workIdxByMember.get(idx)![round],
          closesRound: groupRestEnabled || k === members.length - 1,
        }),
      );
    }
    i = j;
  }
  return steps;
}

export function findStepIndex(steps: WorkoutStep[], exIdx: number, setIdx: number): number {
  return steps.findIndex((s) => s.exIdx === exIdx && s.setIdx === setIdx);
}

/**
 * Limpia `supersetGroupId` (y `groupRestEnabled`, si el tipo lo tiene) de cualquier
 * elemento cuya "corrida" contigua con el mismo id mida <2 — un grupo se define por
 * CONTIGÜIDAD, no solo por compartir el mismo id. Reutilizable en el editor de rutina
 * (agrupar/desagrupar/borrar) y en `swapExercise` del entreno activo: ambos pueden
 * dejar residuos con el mismo id pero ya no adyacentes (ej. al reagrupar un
 * subconjunto de un grupo de 3+, o al insertar el reemplazo de un swap en medio de un
 * grupo), lo que rompe el supuesto de `buildStepSequence` (que solo agrupa corridas
 * contiguas) y deja el badge/UI mostrando "compañeros" que ya no participan del mismo
 * round-robin. También limpiar `groupRestEnabled` importa: si no, un ejercicio que
 * queda solo conserva el flag colgando, y si luego se reagrupa con otro (que parte de
 * `undefined`), el grupo nuevo queda con miembros en desacuerdo — `buildStepSequence`
 * lee el flag del primer miembro, así que la UI (que muestra el del último) y la
 * mecánica real podrían divergir silenciosamente.
 */
export function dissolveNonContiguousGroups<
  T extends { supersetGroupId?: string; groupRestEnabled?: boolean },
>(items: T[]): T[] {
  const result = [...items];
  let i = 0;
  while (i < result.length) {
    const groupId = result[i].supersetGroupId;
    if (!groupId) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < result.length && result[j].supersetGroupId === groupId) j += 1;
    if (j - i < 2) {
      result[i] = { ...result[i], supersetGroupId: undefined, groupRestEnabled: undefined };
    }
    i = j;
  }
  return result;
}

/** Etiqueta del grupo según su tamaño total: 2 → Superset, 3 → Triset, 4+ → Circuito. */
export function supersetLabel(size: number): string {
  if (size >= 4) return 'Circuito';
  if (size === 3) return 'Triset';
  return 'Superset';
}
