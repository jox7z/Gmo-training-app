import { Unit } from '@/store/app';

const KG_TO_LB = 2.20462;

export function formatWeight(kg: number, unit: Unit): string {
  const value = unit === 'lb' ? kg * KG_TO_LB : kg;
  const rounded = Math.round(value);
  const formatted = rounded.toLocaleString('en-US');
  return `${formatted} ${unit}`;
}
