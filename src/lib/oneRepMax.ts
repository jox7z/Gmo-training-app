/**
 * Estimación de 1RM (una repetición máxima) y agregación de récords por
 * ejercicio a partir del historial local de workouts.
 *
 * El 1RM estimado NO es un valor medido: se calcula con fórmulas estándar
 * (Epley/Brzycki) a partir del peso y las reps de una serie. Sirve para
 * comparar progreso entre series de distinto rango de reps.
 *
 * Todo el cálculo es en kg (unidad de almacenamiento); la conversión a la
 * unidad del usuario se hace solo al renderizar con `@/lib/units`.
 */
import { Workout } from '@/store/workouts';
import { exerciseById } from '@/data/exercises';

export type OneRMFormula = 'epley' | 'brzycki';

export const ONE_RM_FORMULAS: { id: OneRMFormula; label: string }[] = [
  { id: 'epley', label: 'Epley' },
  { id: 'brzycki', label: 'Brzycki' },
];

/**
 * 1RM estimado en kg. `weightKg <= 0` → 0 (peso corporal / inválido). Las reps
 * se redondean y se acotan a [1, 30]; con 1 rep el 1RM es el propio peso.
 */
export function estimate1RM(weightKg: number, reps: number, formula: OneRMFormula): number {
  if (weightKg <= 0) return 0;
  const r = Math.min(30, Math.max(1, Math.round(reps)));
  if (r === 1) return weightKg;
  return formula === 'epley'
    ? weightKg * (1 + r / 30)
    : (weightKg * 36) / (37 - r);
}

export interface ExerciseRecord {
  exerciseId: string;
  name: string;
  /** Nº de sesiones (workouts) donde aparece con ≥1 serie válida. */
  sessions: number;
  /** Mejor peso levantado (desempate: más reps). */
  bestWeightKg: number;
  bestWeightReps: number;
  bestWeightDate: string;
  /** Mejor 1RM estimado (puede venir de otra serie distinta al mejor peso). */
  bestE1rmKg: number;
  bestE1rmWeightKg: number;
  bestE1rmReps: number;
  bestE1rmDate: string;
}

interface Acc {
  exerciseId: string;
  name: string;
  sessions: number;
  bestWeightKg: number;
  bestWeightReps: number;
  bestWeightDate: string;
  bestE1rmKg: number;
  bestE1rmWeightKg: number;
  bestE1rmReps: number;
  bestE1rmDate: string;
}

/**
 * Agrega los récords por ejercicio en una sola pasada sobre `history`.
 * Solo cuenta series completadas, no de calentamiento y con peso > 0.
 * Ordena por mejor 1RM estimado descendente.
 */
export function computeExerciseRecords(history: Workout[], formula: OneRMFormula): ExerciseRecord[] {
  const map = new Map<string, Acc>();

  for (const w of history) {
    const date = w.startedAt;
    for (const ex of w.exercises) {
      const validSets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup && s.weightKg > 0);
      if (validSets.length === 0) continue;

      let acc = map.get(ex.exerciseId);
      if (!acc) {
        acc = {
          exerciseId: ex.exerciseId,
          name: exerciseById(ex.exerciseId)?.name ?? ex.exerciseName,
          sessions: 0,
          bestWeightKg: 0,
          bestWeightReps: 0,
          bestWeightDate: date,
          bestE1rmKg: 0,
          bestE1rmWeightKg: 0,
          bestE1rmReps: 0,
          bestE1rmDate: date,
        };
        map.set(ex.exerciseId, acc);
      }

      acc.sessions += 1;

      for (const s of validSets) {
        // Mejor peso (desempate: más reps con ese peso).
        if (
          s.weightKg > acc.bestWeightKg ||
          (s.weightKg === acc.bestWeightKg && s.reps > acc.bestWeightReps)
        ) {
          acc.bestWeightKg = s.weightKg;
          acc.bestWeightReps = s.reps;
          acc.bestWeightDate = date;
        }
        // Mejor 1RM estimado.
        const e1rm = estimate1RM(s.weightKg, s.reps, formula);
        if (e1rm > acc.bestE1rmKg) {
          acc.bestE1rmKg = e1rm;
          acc.bestE1rmWeightKg = s.weightKg;
          acc.bestE1rmReps = s.reps;
          acc.bestE1rmDate = date;
        }
      }
    }
  }

  return Array.from(map.values())
    .filter((a) => a.bestWeightKg > 0)
    .sort((a, b) => b.bestE1rmKg - a.bestE1rmKg);
}
