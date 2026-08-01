import { useMemo } from 'react';
import Body, {
  type ExtendedBodyPart,
  type Slug,
} from 'react-native-body-highlighter';

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

export interface MuscleMapPressEvent {
  slug: Slug;
  /** Una silueta agrupa los tres deltoides bajo el mismo slug. */
  muscles: readonly MuscleKey[];
  side?: 'left' | 'right';
}

interface Props {
  view: 'front' | 'back';
  colors: Partial<Record<MuscleKey, string>>;
  /** Ancho aproximado en px; la altura conserva la proporción de la silueta. */
  size?: number;
  gender?: 'male' | 'female';
  /**
   * Peso visual por músculo cuando varios grupos comparten un slug.
   * Gana el valor mayor; los empates usan un orden fijo, nunca el orden del objeto.
   */
  colorPriority?: Partial<Record<MuscleKey, number>>;
  selectedMuscles?: readonly MuscleKey[];
  onBodyPartPress?: (event: MuscleMapPressEvent) => void;
}

export const MUSCLE_SLUGS: Readonly<Record<MuscleKey, readonly Slug[]>> = {
  chest: ['chest'],
  back: ['trapezius', 'upper-back', 'lower-back'],
  front_delt: ['deltoids'],
  lateral_delt: ['deltoids'],
  rear_delt: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  core: ['abs', 'obliques'],
};

const MUSCLE_ORDER = Object.keys(MUSCLE_SLUGS) as MuscleKey[];
const DEFAULT_FILL = 'rgba(255,255,255,0.07)';

const MUSCLES_BY_SLUG = MUSCLE_ORDER.reduce(
  (result, muscle) => {
    for (const slug of MUSCLE_SLUGS[muscle]) {
      result[slug] = [...(result[slug] ?? []), muscle];
    }
    return result;
  },
  {} as Partial<Record<Slug, MuscleKey[]>>,
);

export function MuscleMap({
  view,
  colors,
  size = 180,
  gender = 'male',
  colorPriority,
  selectedMuscles = [],
  onBodyPartPress,
}: Props) {
  const data = useMemo(() => {
    const candidatesBySlug = new Map<
      Slug,
      { muscle: MuscleKey; color: string; priority: number; order: number }[]
    >();

    MUSCLE_ORDER.forEach((muscle, order) => {
      const color = colors[muscle];
      if (!color) return;

      for (const slug of MUSCLE_SLUGS[muscle]) {
        const candidates = candidatesBySlug.get(slug) ?? [];
        candidates.push({
          muscle,
          color,
          priority: colorPriority?.[muscle] ?? 0,
          order,
        });
        candidatesBySlug.set(slug, candidates);
      }
    });

    return Array.from(candidatesBySlug.entries()).map(([slug, candidates]) => {
      const selected = [...candidates].sort(
        (a, b) => b.priority - a.priority || b.order - a.order,
      )[0];
      const isSelected = (MUSCLES_BY_SLUG[slug] ?? []).some((muscle) =>
        selectedMuscles.includes(muscle),
      );

      return {
        slug,
        color: selected.color,
        styles: isSelected
          ? { fill: selected.color, stroke: '#FFFFFF', strokeWidth: 1.5 }
          : undefined,
      } satisfies ExtendedBodyPart;
    });
  }, [colorPriority, colors, selectedMuscles]);

  const handleBodyPartPress = onBodyPartPress
    ? (part: ExtendedBodyPart, side?: 'left' | 'right') => {
        if (!part.slug) return;
        const muscles = MUSCLES_BY_SLUG[part.slug];
        if (!muscles?.length) return;
        onBodyPartPress({ slug: part.slug, muscles, side });
      }
    : undefined;

  return (
    <Body
      data={data}
      side={view}
      gender={gender}
      scale={size / 200}
      defaultFill={DEFAULT_FILL}
      border="none"
      onBodyPartPress={handleBodyPartPress}
    />
  );
}
