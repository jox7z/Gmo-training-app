/**
 * units — conversión kg↔lb y formato de peso de serie.
 * La DB siempre guarda kg; el display convierte según la unidad del usuario.
 */
import { KG_TO_LB, toDisplay, fromDisplay, formatWeight, formatDuration } from '@/lib/units';

describe('toDisplay / fromDisplay', () => {
  it('kg es identidad', () => {
    expect(toDisplay(100, 'kg')).toBe(100);
    expect(fromDisplay(100, 'kg')).toBe(100);
  });

  it('lb convierte con KG_TO_LB', () => {
    expect(toDisplay(100, 'lb')).toBeCloseTo(100 * KG_TO_LB, 6);
    expect(fromDisplay(100 * KG_TO_LB, 'lb')).toBeCloseTo(100, 6);
  });

  it('ida y vuelta no acumula error perceptible', () => {
    // Tolerancia a 2 decimales: fromDisplay redondea a la precisión numeric(6,2)
    // de la DB, así que el round-trip puede diferir hasta 0.01 kg del original.
    const kg = 62.5;
    expect(fromDisplay(toDisplay(kg, 'lb'), 'lb')).toBeCloseTo(kg, 2);
  });

  it('redondea a 2 decimales (precisión numeric(6,2) de la DB)', () => {
    // 135 lb / 2.20462 = 61.235094... → 61.24 tras redondear.
    expect(fromDisplay(135, 'lb')).toBe(61.24);
  });
});

describe('formatWeight (peso de SERIE)', () => {
  it('peso <= 0 es peso corporal', () => {
    expect(formatWeight(0, 'kg')).toBe('Peso corporal');
    expect(formatWeight(-5, 'lb')).toBe('Peso corporal');
  });

  it('formatea en la unidad de display', () => {
    expect(formatWeight(100, 'kg')).toBe('100 kg');
    expect(formatWeight(100, 'lb')).toBe('220.5 lb');
  });

  it('quita el ".0" sobrante pero conserva decimales reales', () => {
    expect(formatWeight(80, 'kg')).toBe('80 kg');
    expect(formatWeight(62.5, 'kg')).toBe('62.5 kg');
  });
});

describe('formatDuration', () => {
  it('minutos:segundos con padding', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('incluye horas cuando aplica', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });
});
