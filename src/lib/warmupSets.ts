/**
 * warmupSets — sugerencia de series de calentamiento antes de las series de
 * trabajo. Lógica pura (sin React/RN), en el mismo espíritu que oneRepMax.ts y
 * plates.ts. Todo en kg; el redondeo usa el incremento de disco típico del
 * equipo y respeta un piso (la barra vacía) cuando aplica.
 */
import type { Equipment } from '@/data/exercises';

export interface WarmupSuggestion {
  weightKg: number;
  reps: number;
}

// Rampa clásica: 40% × 8, 60% × 5, 80% × 3 del peso de trabajo.
const RAMP: { pct: number; reps: number }[] = [
  { pct: 0.4, reps: 8 },
  { pct: 0.6, reps: 5 },
  { pct: 0.8, reps: 3 },
];

/**
 * Devuelve las series de calentamiento sugeridas para alcanzar `targetWeightKg`
 * con el `equipment` dado. Vacío para peso corporal o peso objetivo <= 0.
 *
 * - `step`: incremento de redondeo (2.5 kg para barra/smith/mancuerna por el
 *   par de discos/mancuernas de 2.5; 1 kg para máquina/cable/kettlebell).
 * - `floor`: piso de peso (barra vacía = 20 kg en barra/smith). Los pasos que
 *   caen bajo el piso se elevan a él y luego se deduplican.
 * - Se descartan las sugerencias >= al peso objetivo (no tiene sentido "calentar"
 *   con el mismo peso o más) y los valores repetidos tras el redondeo/piso.
 */
export function suggestWarmupSets(
  targetWeightKg: number,
  equipment: Equipment,
): WarmupSuggestion[] {
  if (targetWeightKg <= 0 || equipment === 'bodyweight') return [];

  const step =
    equipment === 'barbell' || equipment === 'smith' || equipment === 'dumbbell' ? 2.5 : 1;
  const floor = equipment === 'barbell' || equipment === 'smith' ? 20 : 0;

  const rounded = RAMP.map((r) => ({
    weightKg: Math.max(floor, Math.round((targetWeightKg * r.pct) / step) * step),
    reps: r.reps,
  }));

  return rounded.filter(
    (s, i) =>
      s.weightKg < targetWeightKg && rounded.findIndex((x) => x.weightKg === s.weightKg) === i,
  );
}
