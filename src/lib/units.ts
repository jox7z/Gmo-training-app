import { Unit } from '@/store/app';

export const KG_TO_LB = 2.20462;

export function toDisplay(weightKg: number, unit: Unit): number {
  return unit === 'kg' ? weightKg : weightKg * KG_TO_LB;
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value / KG_TO_LB;
}

/**
 * Formatea el peso de una SERIE de ejercicio. Un peso <= 0 se interpreta como
 * ejercicio de peso corporal y devuelve "Peso corporal".
 * NO usar para mostrar medidas de peso corporal del usuario (progress tracking);
 * para eso existe `formatWeight` en `@/lib/progress`.
 */
export function formatWeight(weightKg: number, unit: Unit, decimals = 1): string {
  if (weightKg <= 0) return 'Peso corporal';
  const v = toDisplay(weightKg, unit);
  return `${v.toFixed(decimals).replace(/\.0$/, '')} ${unit}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
