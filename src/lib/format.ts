/**
 * Shared formatting utilities.
 */

/**
 * Returns a human-readable relative time string in Spanish.
 * Mirrors the function previously defined inline in FeedItem.tsx.
 */
export function formatRelative(
  iso: string,
  dateFallback: 'spanish-short' | 'device' = 'spanish-short',
): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return 'ahora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD}d`;
  const diffW = Math.floor(diffD / 7);
  if (diffW < 4) return `hace ${diffW}sem`;
  const date = new Date(iso);
  return dateFallback === 'device'
    ? date.toLocaleDateString()
    : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/** Relative time for dense rows such as comments. */
export function formatRelativeCompact(iso: string): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return '';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return 'ahora';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

/** Factual elapsed duration used by compact workout ledgers and social cards. */
export function formatCompactDuration(value: number): string {
  const seconds = Math.max(0, Math.round(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export function formatDecimal(value: number): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim()
    .replace(/\s+/g, ' ');
}
