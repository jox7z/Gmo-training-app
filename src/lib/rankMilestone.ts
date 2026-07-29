import {
  RANKS,
  rankFromPoints,
  type RankId,
  type RankInfo,
} from '@/theme/tokens';

export interface RankMilestone {
  fromRank: RankInfo;
  toRank: RankInfo;
}

const RANK_BY_ID = new Map<RankId, RankInfo>(
  RANKS.map((rank) => [rank.id, rank]),
);

/**
 * Normaliza identificadores provenientes de metadata social.
 *
 * `legend` fue el identificador legacy del rango máximo y hoy equivale a
 * `olympus`. Cualquier otro valor desconocido se rechaza.
 */
export function normalizeRankId(value: unknown): RankId | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  const candidate = normalized === 'legend' ? 'olympus' : normalized;

  return RANK_BY_ID.has(candidate as RankId) ? (candidate as RankId) : null;
}

/**
 * Normaliza el rango visible de perfiles remotos. Cuando existen puntos
 * válidos, los umbrales del cliente son la fuente autoritativa; esto evita que
 * valores legacy como `legend` o un job remoto desfasado rompan el emblema.
 */
export function resolveUserRank(
  value: unknown,
  rankPoints?: unknown,
): RankId {
  if (
    typeof rankPoints === 'number' &&
    Number.isFinite(rankPoints) &&
    rankPoints >= 0
  ) {
    return rankFromPoints(rankPoints).id;
  }
  return normalizeRankId(value) ?? 'rookie';
}

/**
 * Lee un hito desde metadata camelCase o snake_case y devuelve únicamente
 * promociones reales. No usa el rango actual del perfil como fallback porque
 * convertiría metadata incompleta, no-op o downgrades en celebraciones falsas.
 */
export function resolveRankMilestone(metadata: unknown): RankMilestone | null {
  if (!isRecord(metadata)) return null;

  const fromRankId = readMetadataRank(metadata, 'fromRank', 'from_rank');
  const toRankId = readMetadataRank(metadata, 'toRank', 'to_rank');
  if (!fromRankId || !toRankId) return null;

  const fromRank = RANK_BY_ID.get(fromRankId);
  const toRank = RANK_BY_ID.get(toRankId);
  if (!fromRank || !toRank) return null;

  const fromIndex = RANKS.findIndex((rank) => rank.id === fromRank.id);
  const toIndex = RANKS.findIndex((rank) => rank.id === toRank.id);
  if (toIndex <= fromIndex) return null;

  return { fromRank, toRank };
}

function readMetadataRank(
  metadata: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
): RankId | null {
  const hasCamel = metadata[camelKey] !== undefined && metadata[camelKey] !== null;
  const hasSnake = metadata[snakeKey] !== undefined && metadata[snakeKey] !== null;
  if (!hasCamel && !hasSnake) return null;

  const camelRank = hasCamel ? normalizeRankId(metadata[camelKey]) : null;
  const snakeRank = hasSnake ? normalizeRankId(metadata[snakeKey]) : null;

  if (hasCamel && hasSnake) {
    return camelRank && camelRank === snakeRank ? camelRank : null;
  }

  return camelRank ?? snakeRank;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
