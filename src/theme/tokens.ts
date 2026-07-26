export const colors = {
  bg: {
    base: '#000000',
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
  metal: {
    bronze: {
      DEFAULT: '#CD7F32',
      dark: '#A05A23',
    },
    silver: {
      DEFAULT: '#C0C0C0',
      dark: '#8E8E93',
      light: '#D1D1D6',
    },
    gold: {
      DEFAULT: '#FFD700',
      dark: '#B8860B',
    },
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
  // Superficies deliberadamente rectas. `full` queda reservado para
  // avatares, estados, anillos y controles que sí son círculos reales.
  sm: 2,
  md: 3,
  lg: 4,
  xl: 4,
  '2xl': 4,
  '3xl': 4,
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
  extrabold: '800' as const,
  black: '900' as const,
};

export const typography = {
  display: {
    fontSize: fontSize['4xl'],
    lineHeight: 54,
    letterSpacing: -1.2,
    fontWeight: fontWeight.black,
    textTransform: 'none',
  },
  title: {
    fontSize: fontSize['2xl'],
    lineHeight: 36,
    letterSpacing: -0.75,
    fontWeight: fontWeight.bold,
    textTransform: 'none',
  },
  headline: {
    fontSize: fontSize.xl,
    lineHeight: 30,
    letterSpacing: -0.3,
    fontWeight: fontWeight.extrabold,
    textTransform: 'none',
  },
  heading: {
    fontSize: fontSize.lg,
    lineHeight: 26,
    letterSpacing: -0.2,
    fontWeight: fontWeight.semibold,
    textTransform: 'none',
  },
  subheading: {
    fontSize: fontSize.md,
    lineHeight: 24,
    letterSpacing: 0.3,
    fontWeight: fontWeight.semibold,
    textTransform: 'none',
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: 22,
    letterSpacing: 0,
    fontWeight: fontWeight.regular,
    textTransform: 'none',
  },
  caption: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    letterSpacing: 0.1,
    fontWeight: fontWeight.regular,
    textTransform: 'none',
  },
  label: {
    fontSize: fontSize.xs,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  eyebrow: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    letterSpacing: 4,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  metric: {
    fontSize: fontSize['3xl'],
    lineHeight: 44,
    letterSpacing: -0.5,
    fontWeight: fontWeight.black,
    textTransform: 'none',
  },
  timer: {
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -2,
    fontWeight: fontWeight.black,
    textTransform: 'none',
  },
  metricLg: {
    fontSize: fontSize['6xl'],
    lineHeight: 78,
    letterSpacing: -2,
    fontWeight: fontWeight.black,
    textTransform: 'none',
  },
} as const;

export type TypographyVariant = keyof typeof typography;

export const gradients = {
  brand: [colors.primary.DEFAULT, colors.accent.DEFAULT] as const,
  rookie: ['#6B7280', '#9CA3AF'] as const,
  bronze: [colors.metal.bronze.dark, colors.metal.bronze.DEFAULT] as const,
  silver: [colors.metal.silver.dark, colors.metal.silver.light] as const,
  gold: [colors.metal.gold.dark, colors.metal.gold.DEFAULT] as const,
  platinum: ['#9CA3AF', '#E5E4E2'] as const,
  diamond: ['#0066FF', '#00D4FF'] as const,
  elite: [colors.dangerDark, colors.primary.DEFAULT] as const,
  titan: ['#6D28D9', '#8B5CF6'] as const,
  olympus: [colors.primary.DEFAULT, colors.accent.DEFAULT] as const,
} as const;

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
  { id: 'rookie',   label: 'Rookie',   min: 0,     color: gradients.rookie[1], gradient: gradients.rookie },
  { id: 'bronze',   label: 'Bronze',   min: 200,   color: colors.metal.bronze.DEFAULT, gradient: gradients.bronze },
  { id: 'silver',   label: 'Silver',   min: 500,   color: colors.metal.silver.DEFAULT, gradient: gradients.silver },
  { id: 'gold',     label: 'Gold',     min: 1000,  color: colors.metal.gold.DEFAULT, gradient: gradients.gold },
  { id: 'platinum', label: 'Platinum', min: 2000,  color: gradients.platinum[1], gradient: gradients.platinum },
  { id: 'diamond',  label: 'Diamond',  min: 4000,  color: gradients.diamond[1], gradient: gradients.diamond },
  { id: 'elite',    label: 'Elite',    min: 7000,  color: colors.primary.DEFAULT, gradient: gradients.elite },
  { id: 'titan',    label: 'Titan',    min: 12000, color: gradients.titan[1], gradient: gradients.titan },
  { id: 'olympus',  label: 'Olympus',  min: 20000, color: colors.accent.DEFAULT, gradient: gradients.olympus },
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
