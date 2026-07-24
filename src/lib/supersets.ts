/**
 * supersets — máquina de avance del entreno activo con supersets.
 *
 * Precalcula la secuencia lineal de pasos (una serie por paso) intercalando las
 * rondas de cada grupo: A1→B1→A2→B2… Un ejercicio suelto aporta sus series
 * consecutivas. Toda la lógica es pura (sin efectos, sin RN/AsyncStorage): recibe
 * `WorkoutExercise[]` y devuelve pasos, para poder testearla en aislamiento.
 *
 * El algoritmo soporta grupos de 3+ miembros sin cambios (la UI de selección se
 * limita a 2 en el MVP). Series desiguales entre miembros se cubren solas: cuando
 * un miembro se queda sin series en una ronda, se excluye y el resto pasa a
 * comportarse como suelto (descanso normal) el resto de rondas.
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
    const maxSets = Math.max(...groupIdxs.map((idx) => exercises[idx].sets.length));
    for (let round = 0; round < maxSets; round++) {
      const members = groupIdxs.filter((idx) => round < exercises[idx].sets.length);
      members.forEach((idx, k) =>
        steps.push({ exIdx: idx, setIdx: round, closesRound: k === members.length - 1 }),
      );
    }
    i = j;
  }
  return steps;
}

export function findStepIndex(steps: WorkoutStep[], exIdx: number, setIdx: number): number {
  return steps.findIndex((s) => s.exIdx === exIdx && s.setIdx === setIdx);
}
