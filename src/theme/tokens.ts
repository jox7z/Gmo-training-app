export const colors = {
  bg: {
    base: '#0B0B0B',
    elevated: '#161616',
    card: '#1C1C1E',
    cardEdge: '#111113',
    overlay: 'rgba(0,0,0,0.7)',
  },
  primary: {
    DEFAULT: '#FF3B3B',
    hover: '#E62E2E',
    muted: 'rgba(255,59,59,0.18)',
    glow: 'rgba(255,59,59,0.35)',
    dark: '#C22A2A',
  },
  accent: {
    DEFAULT: '#FF7A00',
    soft: 'rgba(255,122,0,0.18)',
    glow: 'rgba(255,122,0,0.4)',
    dark: '#C45F00',
  },
  info: {
    DEFAULT: '#1E90FF',
    soft: 'rgba(30,144,255,0.18)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A1A1AA',
    muted: '#71717A',
  },
  border: '#27272A',
  borderStrong: '#3F3F46',
  success: '#22C55E',
  successDark: '#15803D',
  danger: '#EF4444',
  dangerDark: '#B91C1C',
  warning: '#F59E0B',
  // Colores de medalla (podios, PRs, rangos metálicos). Centralizados para no
  // repetir literales '#FFD700' por toda la app.
  medal: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    goldSoft: 'rgba(255,215,0,0.12)',
    goldBorder: 'rgba(255,215,0,0.45)',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  '3xl': 32,
  full: 9999,
} as const;

export const depth = { edge: 4, edgeLg: 5, pressTravel: 4 } as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 38,
  '4xl': 48,
  '5xl': 60,
  '6xl': 72,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

export const shadow = {
  glowPrimary: {
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  glowAccent: {
    shadowColor: colors.accent.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const RANKS = [
  { id: 'rookie',   label: 'Rookie',   min: 0,     color: '#9CA3AF', gradient: ['#6B7280', '#9CA3AF'] as [string, string] },
  { id: 'bronze',   label: 'Bronze',   min: 200,   color: colors.medal.bronze, gradient: ['#A05A23', '#CD7F32'] as [string, string] },
  { id: 'silver',   label: 'Silver',   min: 500,   color: colors.medal.silver, gradient: ['#8E8E93', '#D1D1D6'] as [string, string] },
  { id: 'gold',     label: 'Gold',     min: 1000,  color: colors.medal.gold, gradient: ['#B8860B', '#FFD700'] as [string, string] },
  { id: 'platinum', label: 'Platinum', min: 2000,  color: '#E5E4E2', gradient: ['#9CA3AF', '#E5E4E2'] as [string, string] },
  { id: 'diamond',  label: 'Diamond',  min: 4000,  color: '#00D4FF', gradient: ['#0066FF', '#00D4FF'] as [string, string] },
  { id: 'elite',    label: 'Elite',    min: 7000,  color: '#FF3B3B', gradient: ['#B91C1C', '#FF3B3B'] as [string, string] },
  { id: 'titan',    label: 'Titan',    min: 12000, color: '#8B5CF6', gradient: ['#6D28D9', '#8B5CF6'] as [string, string] },
  { id: 'olympus',  label: 'Olympus',  min: 20000, color: '#FF7A00', gradient: ['#FF3B3B', '#FF7A00'] as [string, string] },
] as const;

export type RankInfo = (typeof RANKS)[number];
export type RankId = RankInfo['id'];

export function rankFromPoints(points: number): RankInfo {
  let current: RankInfo = RANKS[0];
  for (const r of RANKS) {
    if (points >= r.min) current = r;
  }
  return current;
}

export function nextRank(points: number): RankInfo | null {
  for (const r of RANKS) {
    if (r.min > points) return r;
  }
  return null;
}

/**
 * Color de medalla según la posición en un podio/ranking (1=oro, 2=plata,
 * 3=bronce). Cualquier otra posición cae en el gris apagado por defecto,
 * que es el fallback histórico de todos los podios de la app.
 */
export function podiumColor(position: number): string {
  if (position === 1) return colors.medal.gold;
  if (position === 2) return colors.medal.silver;
  if (position === 3) return colors.medal.bronze;
  return colors.text.muted;
}
