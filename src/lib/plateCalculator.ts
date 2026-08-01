export const METRIC_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export type MetricPlateKg = (typeof METRIC_PLATES_KG)[number];

export interface PlateStack {
  weightKg: MetricPlateKg;
  count: number;
}

export interface PlateLoadResult {
  requestedKg: number;
  barKg: number;
  loadedKg: number;
  differenceKg: number;
  platesPerSide: PlateStack[];
  isExact: boolean;
  isBelowBar: boolean;
}

const PRECISION = 100;
const EPSILON_KG = 0.01;

function normalizeKg(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, value) * PRECISION) / PRECISION;
}

/**
 * Calcula discos por lado usando una estrategia greedy, de mayor a menor.
 *
 * El peso que no pueda representarse con los discos disponibles se redondea
 * hacia abajo: nunca sugiere cargar más de lo que la persona solicitó.
 */
export function calculatePlateLoad(
  targetKg: number,
  barKg: number,
  availablePlates: readonly MetricPlateKg[] = METRIC_PLATES_KG,
): PlateLoadResult {
  const requestedKg = normalizeKg(targetKg);
  const safeBarKg = normalizeKg(barKg);
  const isBelowBar = requestedKg < safeBarKg - EPSILON_KG;
  const perSideTargetKg = Math.max(0, (requestedKg - safeBarKg) / 2);
  let remainingUnits = Math.round(perSideTargetKg * PRECISION);

  const uniquePlates = [...new Set(availablePlates)]
    .filter((plate) => METRIC_PLATES_KG.includes(plate))
    .sort((a, b) => b - a);

  const platesPerSide: PlateStack[] = [];
  for (const plate of uniquePlates) {
    const plateUnits = Math.round(plate * PRECISION);
    const count = Math.floor(remainingUnits / plateUnits);
    if (count > 0) {
      platesPerSide.push({ weightKg: plate, count });
      remainingUnits -= count * plateUnits;
    }
  }

  const loadedPerSideKg = platesPerSide.reduce(
    (total, plate) => total + plate.weightKg * plate.count,
    0,
  );
  const loadedKg = normalizeKg(safeBarKg + loadedPerSideKg * 2);
  const differenceKg = normalizeKg(Math.abs(requestedKg - loadedKg));

  return {
    requestedKg,
    barKg: safeBarKg,
    loadedKg,
    differenceKg,
    platesPerSide,
    isExact: differenceKg <= EPSILON_KG,
    isBelowBar,
  };
}
