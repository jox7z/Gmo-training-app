/**
 * plates.ts — cálculo de discos por lado (patrón Hevy). Lógica pura, sin React.
 *
 * Dado un peso objetivo, la barra y la unidad, reparte de forma greedy los discos
 * disponibles a un solo lado de la barra y devuelve el peso realmente alcanzable
 * y el sobrante que no cabe con discos estándar.
 */

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const PLATES_LB = [45, 35, 25, 10, 5, 2.5];
export const BARS_KG = [20, 15, 10];
export const BARS_LB = [45, 35, 25];

export interface PlateBreakdown {
  /** Discos por lado, de mayor a menor. */
  perSide: { plate: number; count: number }[];
  /** Peso total alcanzable (barra + discos), en la misma unidad. */
  achievable: number;
  /** target - achievable (>= 0). */
  remainder: number;
}

const EPS = 0.001;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcPlates(target: number, bar: number, unit: 'kg' | 'lb'): PlateBreakdown {
  // Si el objetivo no supera la barra no hay discos que poner: no se puede bajar
  // por debajo del peso de la barra, así que el sobrante es 0 (no negativo).
  if (target <= bar + EPS) {
    return { perSide: [], achievable: round2(bar), remainder: 0 };
  }

  const plates = unit === 'kg' ? PLATES_KG : PLATES_LB;
  let perSideWeight = (target - bar) / 2; // peso a repartir en un solo lado
  const perSide: { plate: number; count: number }[] = [];

  for (const plate of plates) {
    let count = 0;
    // Epsilon para tolerar el ruido de coma flotante al acumular restas.
    while (perSideWeight >= plate - EPS) {
      perSideWeight -= plate;
      count += 1;
    }
    if (count > 0) perSide.push({ plate, count });
  }

  const platesPerSide = perSide.reduce((sum, p) => sum + p.plate * p.count, 0);
  const achievable = round2(bar + platesPerSide * 2);
  const remainder = round2(Math.max(0, target - achievable));

  return { perSide, achievable, remainder };
}
