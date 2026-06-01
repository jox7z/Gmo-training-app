import { colors } from '@/theme/tokens';
import type { IconName } from '@/components/Icon';
import type { ReactionKind } from '@/lib/repos/posts';

export interface ReactionConfig {
  key: ReactionKind;
  /** Emoji nativo. Es lo que se muestra en el picker, summary y action button. */
  emoji: string;
  /** Icono SVG (fallback / consistency con resto de la UI). */
  icon: IconName;
  color: string;
  label: string;
  /** Etiqueta corta para el botón principal cuando está activa. */
  shortLabel: string;
}

/**
 * Orden visual de las reacciones en el picker (de izquierda a derecha).
 * `props` es la reacción por defecto (tap corto en el botón principal).
 */
export const REACTIONS: ReactionConfig[] = [
  { key: 'props',   emoji: '👊', icon: 'props',   color: colors.primary.DEFAULT, label: 'Props',    shortLabel: 'Props' },
  { key: 'respect', emoji: '🤝', icon: 'respect', color: colors.info.DEFAULT,    label: 'Respect',  shortLabel: 'Respect' },
  { key: 'fire',    emoji: '🔥', icon: 'fire',    color: colors.accent.DEFAULT,  label: 'Fuego',    shortLabel: 'Fuego' },
  { key: 'muscle',  emoji: '💪', icon: 'muscle',  color: '#E11D48',              label: 'Bestia',   shortLabel: 'Bestia' },
  { key: 'heart',   emoji: '❤️', icon: 'heart',   color: colors.danger,          label: 'Me gusta', shortLabel: 'Like' },
];

export const REACTION_BY_KEY: Record<ReactionKind, ReactionConfig> = REACTIONS.reduce(
  (acc, r) => {
    acc[r.key] = r;
    return acc;
  },
  {} as Record<ReactionKind, ReactionConfig>,
);

export const DEFAULT_REACTION: ReactionKind = 'props';

export function totalReactions(counts: Record<ReactionKind, number>): number {
  return REACTIONS.reduce((sum, r) => sum + (counts[r.key] ?? 0), 0);
}

export function activeReaction(
  mine: Record<ReactionKind, boolean>,
): ReactionConfig | null {
  for (const r of REACTIONS) {
    if (mine[r.key]) return r;
  }
  return null;
}

export function topReactions(
  counts: Record<ReactionKind, number>,
  max = 3,
): ReactionConfig[] {
  return REACTIONS
    .filter((r) => (counts[r.key] ?? 0) > 0)
    .sort((a, b) => (counts[b.key] ?? 0) - (counts[a.key] ?? 0))
    .slice(0, max);
}
