import { Unit } from '@/store/app';

export const KG_TO_LB = 2.20462;

export function toDisplay(weightKg: number, unit: Unit): number {
  return unit === 'kg' ? weightKg : weightKg * KG_TO_LB;
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value / KG_TO_LB;
}

export function formatWeight(weightKg: number, unit: Unit, decimals = 1): string {
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
