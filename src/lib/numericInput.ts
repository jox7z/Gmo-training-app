export interface NumericInputBounds {
  min: number;
  max: number;
  decimals: number;
}

export interface NumericAccessibilityValue {
  text: string;
}

const DECIMAL_INPUT = /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;

export function formatNumericInput(
  value: number,
  decimals: number,
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue
    .toFixed(Math.max(0, Math.trunc(decimals)))
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

export function parseNumericInput(
  input: string,
  bounds: NumericInputBounds,
): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!normalized || !DECIMAL_INPUT.test(normalized)) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  return normalizeNumericValue(parsed, bounds);
}

export function stepNumericValue(
  value: number,
  delta: number,
  bounds: NumericInputBounds,
): number {
  const base = Number.isFinite(value) ? value : bounds.min;
  const safeDelta = Number.isFinite(delta) ? delta : 0;
  return normalizeNumericValue(base + safeDelta, bounds);
}

export function normalizeNumericValue(
  value: number,
  bounds: NumericInputBounds,
): number {
  const min = Number.isFinite(bounds.min) ? bounds.min : 0;
  const max =
    Number.isFinite(bounds.max) && bounds.max >= min
      ? bounds.max
      : min;
  const decimals = Math.max(0, Math.min(6, Math.trunc(bounds.decimals)));
  const finite = Number.isFinite(value) ? value : min;
  const clamped = Math.min(max, Math.max(min, finite));
  const factor = 10 ** decimals;
  const rounded = Math.round(clamped * factor) / factor;
  return Math.min(max, Math.max(min, rounded));
}

/**
 * Fabric convierte `accessibilityValue.now/min/max` a enteros nativos en algunas
 * versiones. Los pesos decimales como 22.5 deben anunciarse solo como texto para
 * no perder precisión ni derribar el TextInput.
 */
export function numericAccessibilityValue(
  text: string,
  label: string,
): NumericAccessibilityValue {
  return { text: `${text.trim()} ${label.trim()}`.trim() };
}
