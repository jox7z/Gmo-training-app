/**
 * warmupSets — rampa de calentamiento (40/60/80% × 8/5/3), redondeada al
 * incremento de disco del equipo y con piso de barra vacía. Lógica pura en kg.
 */
import { suggestWarmupSets } from '@/lib/warmupSets';

describe('suggestWarmupSets', () => {
  it('barbell 100 kg → 3 rampas crecientes por debajo del objetivo', () => {
    const r = suggestWarmupSets(100, 'barbell');
    expect(r).toEqual([
      { weightKg: 40, reps: 8 },
      { weightKg: 60, reps: 5 },
      { weightKg: 80, reps: 3 },
    ]);
    // Todas por debajo del objetivo y estrictamente crecientes.
    expect(r.every((s) => s.weightKg < 100)).toBe(true);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].weightKg).toBeGreaterThan(r[i - 1].weightKg);
    }
  });

  it('peso corporal → sin sugerencias', () => {
    expect(suggestWarmupSets(0, 'bodyweight')).toEqual([]);
    expect(suggestWarmupSets(80, 'bodyweight')).toEqual([]);
  });

  it('peso objetivo <= 0 → sin sugerencias', () => {
    expect(suggestWarmupSets(0, 'barbell')).toEqual([]);
    expect(suggestWarmupSets(-20, 'dumbbell')).toEqual([]);
  });

  it('dumbbell redondea al múltiplo de 2.5 más cercano', () => {
    // 22.5 → 0.4=9→10, 0.6=13.5→12.5, 0.8=18→17.5.
    const r = suggestWarmupSets(22.5, 'dumbbell');
    expect(r).toEqual([
      { weightKg: 10, reps: 8 },
      { weightKg: 12.5, reps: 5 },
      { weightKg: 17.5, reps: 3 },
    ]);
    // Cada peso es múltiplo de 2.5.
    expect(r.every((s) => Number.isInteger(s.weightKg / 2.5))).toBe(true);
  });

  it('máquina redondea a 1 kg (sin piso de barra)', () => {
    // 40 → 16, 24, 32.
    expect(suggestWarmupSets(40, 'machine')).toEqual([
      { weightKg: 16, reps: 8 },
      { weightKg: 24, reps: 5 },
      { weightKg: 32, reps: 3 },
    ]);
  });

  it('objetivo bajo en barra: el piso de 20 kg colapsa dos pasos → dedup a uno', () => {
    // 30 kg: 0.4=12→piso 20, 0.6=18→piso 20 (duplicado), 0.8=24→25.
    const r = suggestWarmupSets(30, 'barbell');
    expect(r).toEqual([
      { weightKg: 20, reps: 8 },
      { weightKg: 25, reps: 3 },
    ]);
    // Sin pesos repetidos.
    const weights = r.map((s) => s.weightKg);
    expect(new Set(weights).size).toBe(weights.length);
  });
});
