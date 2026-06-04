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
 * Reacción única: bíceps (muscle). El icono se renderiza con BicepIcon
 * en FeedItem, no con emoji.
 */
export const REACTIONS: ReactionConfig[] = [
  { key: 'muscle', emoji: '💪', icon: 'muscle', color: '#ff8000', label: 'Bíceps', shortLabel: 'Bíceps' },
];

export const REACTION_BY_KEY: Record<ReactionKind, ReactionConfig> = REACTIONS.reduce(
  (acc, r) => {
    acc[r.key] = r;
    return acc;
  },
  {} as Record<ReactionKind, ReactionConfig>,
);

export const DEFAULT_REACTION: ReactionKind = 'muscle';

export function totalReactions(counts: Record<ReactionKind, number>): number {
  // Suma TODOS los tipos del record (incluye reacciones históricas de otros
  // tipos), no solo las de REACTIONS, para no subcontar posts antiguos.
  return (Object.values(counts) as number[]).reduce((sum, v) => sum + (v ?? 0), 0);
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
