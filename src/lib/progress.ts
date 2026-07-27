import { Unit } from '@/store/app';

export interface ProgressSummary {
  totalWorkouts: number;
  totalActiveSeconds: number;
  totalRestSeconds: number;
  totalReps: number;
  totalWeightKg: number;
  avgSetDuration: number;
  avgRestAfter: number;
  workoutsPerWeek: number;
}

export type ProgressPeriod = '7d' | '30d' | '90d' | 'all';

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins === 0 ? `${hours}h` : `${hours}h ${remainMins}m`;
}

const KG_TO_LB = 2.20462;

export function formatWeight(kg: number, unit: Unit): string {
  const value = unit === 'lb' ? kg * KG_TO_LB : kg;
  const rounded = Math.round(value);
  const formatted = rounded.toLocaleString('en-US');
  return `${formatted} ${unit}`;
}
