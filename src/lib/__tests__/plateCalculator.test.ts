import { describe, expect, test } from '@jest/globals';

import { calculatePlateLoad } from '@/lib/plateCalculator';

describe('plateCalculator', () => {
  test('calcula una carga exacta en kg por lado', () => {
    expect(calculatePlateLoad(100, 20)).toEqual({
      requestedKg: 100,
      barKg: 20,
      loadedKg: 100,
      differenceKg: 0,
      platesPerSide: [
        { weightKg: 25, count: 1 },
        { weightKg: 15, count: 1 },
      ],
      isExact: true,
      isBelowBar: false,
    });
  });

  test('redondea hacia abajo cuando no puede representar el objetivo', () => {
    const result = calculatePlateLoad(23, 20);

    expect(result.loadedKg).toBe(22.5);
    expect(result.loadedKg).toBeLessThan(result.requestedKg);
    expect(result.differenceKg).toBe(0.5);
    expect(result.isExact).toBe(false);
  });

  test('marca objetivos por debajo de la barra sin sugerir discos', () => {
    const result = calculatePlateLoad(15, 20);

    expect(result.isBelowBar).toBe(true);
    expect(result.platesPerSide).toEqual([]);
    expect(result.loadedKg).toBe(20);
    expect(result.differenceKg).toBe(5);
  });

  test.each([
    [Number.NaN, Number.NaN],
    [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
    [-100, -20],
  ])('normaliza valores no finitos o negativos: %p / %p', (target, bar) => {
    expect(calculatePlateLoad(target, bar)).toMatchObject({
      requestedKg: 0,
      barKg: 0,
      loadedKg: 0,
      differenceKg: 0,
      isExact: true,
      isBelowBar: false,
    });
  });

  test('deduplica discos disponibles y respeta el conjunto limitado', () => {
    const result = calculatePlateLoad(62.5, 20, [20, 20, 1.25]);

    expect(result.platesPerSide).toEqual([
      { weightKg: 20, count: 1 },
      { weightKg: 1.25, count: 1 },
    ]);
    expect(result.loadedKg).toBe(62.5);
  });
});
