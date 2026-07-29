import {
  formatNumericInput,
  parseNumericInput,
  stepNumericValue,
} from '@/lib/numericInput';

const weightBounds = { min: 0, max: 1000, decimals: 1 } as const;

describe('numericInput', () => {
  it('normaliza coma decimal y limita el rango', () => {
    expect(parseNumericInput('82,5', weightBounds)).toBe(82.5);
    expect(parseNumericInput('1200', weightBounds)).toBe(1000);
    expect(parseNumericInput('-2', weightBounds)).toBeNull();
  });

  it('rechaza entradas no finitas, exponentes y vacías', () => {
    expect(parseNumericInput('', weightBounds)).toBeNull();
    expect(parseNumericInput('Infinity', weightBounds)).toBeNull();
    expect(parseNumericInput('1e999', weightBounds)).toBeNull();
    expect(parseNumericInput('12kg', weightBounds)).toBeNull();
  });

  it('mantiene pasos rápidos dentro de límites', () => {
    expect(stepNumericValue(997.5, 2.5, weightBounds)).toBe(1000);
    expect(stepNumericValue(1000, 2.5, weightBounds)).toBe(1000);
    expect(stepNumericValue(0, -2.5, weightBounds)).toBe(0);
  });

  it('formatea sin ceros decimales inútiles', () => {
    expect(formatNumericInput(82, 1)).toBe('82');
    expect(formatNumericInput(82.5, 1)).toBe('82.5');
  });
});
