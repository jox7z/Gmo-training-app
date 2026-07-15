/**
 * plates — reparto greedy de discos por lado (patrón Hevy). Lógica pura.
 * Trabaja en la unidad de display (kg/lb); el sobrante nunca es negativo.
 */
import { calcPlates } from '@/lib/plates';

describe('calcPlates', () => {
  it('reparto exacto en kg: 100, barra 20 → 25+15 por lado', () => {
    const r = calcPlates(100, 20, 'kg');
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(r.achievable).toBe(100);
    expect(r.remainder).toBe(0);
  });

  it('acumula con epsilon: 102.5, barra 20 → 41.25/lado = 25+15+1.25', () => {
    const r = calcPlates(102.5, 20, 'kg');
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
      { plate: 1.25, count: 1 },
    ]);
    expect(r.achievable).toBe(102.5);
    expect(r.remainder).toBe(0);
  });

  it('objetivo == barra: sin discos, alcanzable = barra, sobrante 0', () => {
    const r = calcPlates(20, 20, 'kg');
    expect(r.perSide).toEqual([]);
    expect(r.achievable).toBe(20);
    expect(r.remainder).toBe(0);
  });

  it('objetivo < barra: sin discos, alcanzable = barra (no baja de la barra)', () => {
    const r = calcPlates(10, 20, 'kg');
    expect(r.perSide).toEqual([]);
    expect(r.achievable).toBe(20);
    expect(r.remainder).toBe(0);
  });

  it('inalcanzable: 101, barra 20 → resto 0.5/lado no cabe, alcanzable 100, sobrante 1', () => {
    const r = calcPlates(101, 20, 'kg');
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(r.achievable).toBe(100);
    expect(r.remainder).toBe(1);
  });

  it('tabla lb: 135, barra 45 → un disco de 45 por lado', () => {
    const r = calcPlates(135, 45, 'lb');
    expect(r.perSide).toEqual([{ plate: 45, count: 1 }]);
    expect(r.achievable).toBe(135);
    expect(r.remainder).toBe(0);
  });
});
