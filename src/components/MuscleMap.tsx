/**
 * MuscleMap — silueta corporal realista usando react-native-body-highlighter.
 * Dos vistas: 'front' y 'back'. Cada MuscleKey se mapea a uno o más slugs de
 * la librería; si varios keys colisionan en el mismo slug (los tres delts →
 * deltoids) se queda con el último color definido.
 *
 * API pública intacta para no romper app/(tabs)/routines.tsx.
 */
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export type MuscleKey =
  | 'chest'
  | 'back'
  | 'front_delt'
  | 'lateral_delt'
  | 'rear_delt'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

interface Props {
  view: 'front' | 'back';
  colors: Partial<Record<MuscleKey, string>>;
  /** Ancho en px; la altura se calcula automáticamente (aspect ratio ~1:2). */
  size?: number;
  gender?: 'male' | 'female';
}

// ─── Mapeo MuscleKey → slug(s) ───────────────────────────────────────────────
// Los tres delts colapsan en 'deltoids' porque la librería no los separa.

const MUSCLE_SLUGS: Record<MuscleKey, Slug[]> = {
  chest:        ['chest'],
  back:         ['trapezius', 'upper-back', 'lower-back'],
  front_delt:   ['deltoids'],
  lateral_delt: ['deltoids'],
  rear_delt:    ['deltoids'],
  biceps:       ['biceps'],
  triceps:      ['triceps'],
  quads:        ['quadriceps'],
  hamstrings:   ['hamstring'],
  glutes:       ['gluteal'],
  calves:       ['calves'],
  core:         ['abs', 'obliques'],
};

// ─── Constantes visuales ─────────────────────────────────────────────────────

const DEFAULT_FILL = 'rgba(255,255,255,0.07)';

// ─── Componente ──────────────────────────────────────────────────────────────

export function MuscleMap({ view, colors, size = 180, gender = 'male' }: Props) {
  // Construye el array data para la librería.
  // Si varios MuscleKey mapean al mismo slug, el último color gana (Map preserva
  // la inserción y las sobreescrituras por slug se hacen al final).
  const slugColorMap = new Map<Slug, string>();

  for (const [key, color] of Object.entries(colors) as [MuscleKey, string][]) {
    if (!color) continue;
    for (const slug of MUSCLE_SLUGS[key]) {
      slugColorMap.set(slug, color);
    }
  }

  const data: ExtendedBodyPart[] = Array.from(slugColorMap.entries()).map(
    ([slug, color]) => ({ slug, color }),
  );

  // scale: la silueta base de la librería mide ~200 px de ancho a scale=1.
  // Ajustamos para que el ancho renderizado sea aproximadamente `size` px.
  const scale = size / 200;

  return (
    <Body
      data={data}
      side={view}
      gender={gender}
      scale={scale}
      defaultFill={DEFAULT_FILL}
      border="none"
    />
  );
}
