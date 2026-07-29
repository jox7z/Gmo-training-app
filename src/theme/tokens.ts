/**
 * tokens.ts — sistema visual "Ember".
 *
 * Dirección: el negro es el protagonista y el ember (rojo→naranja) es un acento
 * de temperatura, no un neón. Todo el brillo está deliberadamente contenido:
 * la estructura la dan la rampa de superficies, los bordes de un píxel y los
 * gradientes de borde, no los halos.
 *
 * Los tiempos y curvas viven en `motion.ts`. Ningún componente debe declarar
 * color, radio, elevación ni muelle propio.
 */

/**
 * Rampa ember. 500 es la marca (rojo incandescente), 300 el acento cálido y
 * 900 la "ceniza", usable como tinte de superficie.
 */
const ember = {
  100: '#FFD9C2',
  200: '#FFB185',
  300: '#FF8A4C',
  400: '#FF6A33',
  500: '#F5432B',
  600: '#D62F1E',
  700: '#A82115',
  800: '#6E150E',
  900: '#2A0806',
} as const;

export const colors = {
  bg: {
    /** Negro real: aprovecha OLED y hace que todo lo demás flote. */
    base: '#000000',
    /** Pozos hundidos: interior de inputs, celdas rehundidas. */
    sunken: '#050505',
    elevated: '#0E0D0E',
    card: '#141314',
    cardEdge: '#080708',
    /** Capa superior: sheets, menús, popovers. */
    raised: '#1B1A1B',
    /** Relleno de raíles: skeletons, pistas de anillos y barras de progreso. */
    track: '#181617',
    overlay: 'rgba(0,0,0,0.72)',
  },
  ember,
  /** Texto/icono sobre un relleno ember sólido. */
  onEmber: '#0A0503',
  primary: {
    DEFAULT: ember[500],
    hover: ember[600],
    muted: 'rgba(245,67,43,0.14)',
    glow: 'rgba(245,67,43,0.22)',
    dark: ember[700],
  },
  accent: {
    DEFAULT: ember[300],
    soft: 'rgba(255,138,76,0.14)',
    glow: 'rgba(255,138,76,0.22)',
    dark: '#C2551F',
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
    /** Crema, no blanco puro: sobre negro descansa la vista y calienta la marca. */
    primary: '#F6F2EC',
    secondary: '#A6A09A',
    /**
     * Calibrado para pasar AA sobre `bg.card`: 4.78:1. Se usa a 11–13 px, que no
     * entran en la excepción de texto grande, así que no puede bajar de aquí.
     */
    muted: '#85807B',
  },
  border: '#201E1F',
  borderStrong: '#302D2E',
  /** Borde de acento para superficies destacadas (PR, rango, CTA). */
  borderEmber: 'rgba(255,138,76,0.28)',
  success: '#22C55E',
  successDark: '#15803D',
  successSoft: 'rgba(34,197,94,0.15)',
  lime: '#A3E635',
  /**
   * Rosa-carmesí, no rojo: el ember ya ocupa el rojo. Si `danger` compartiera
   * tono con la marca, un botón destructivo y un CTA serían indistinguibles.
   * El tono claro es el que se usa como texto de error (5.09:1 sobre `bg.card`);
   * `dangerDark` queda para rellenos.
   */
  danger: '#F43F5E',
  dangerDark: '#BE123C',
  dangerSoft: 'rgba(244,63,94,0.15)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.16)',
  /** Velo sutil sobre superficies elevadas (chips internos, marcos de icono). */
  surfaceVeil: 'rgba(255,255,255,0.04)',
  /** Aro de foco de teclado (react-native-web / navegación externa). */
  focusRing: 'rgba(255,138,76,0.65)',
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

/**
 * Escala de radios real. Sustituye a la regla anterior de "superficies casi
 * rectas" (2–4 px): la geometría redondeada es parte del cambio de identidad.
 * `pill` es para cápsulas de ancho variable; `full` sigue reservado a círculos
 * reales (avatares, puntos, anillos, indicadores).
 */
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  '3xl': 36,
  pill: 999,
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
  /** Velo ember casi imperceptible para fondos de héroe. */
  emberSoft: ['rgba(245,67,43,0.16)', 'rgba(245,67,43,0)'] as const,
  /** Filo incandescente: reglas de 1–2 px, rims y bordes de CTA. */
  emberEdge: [ember[300], ember[600]] as const,
  /** Ceniza: transición de superficie a negro. */
  ash: [ember[900], colors.bg.base] as const,
  /** Scrim vertical para imagen bajo texto. */
  heroVeil: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'] as const,
  rookie: ['#6B7280', '#9CA3AF'] as const,
  bronze: [colors.metal.bronze.dark, colors.metal.bronze.DEFAULT] as const,
  silver: [colors.metal.silver.dark, colors.metal.silver.light] as const,
  gold: [colors.metal.gold.dark, colors.metal.gold.DEFAULT] as const,
  platinum: ['#9CA3AF', '#E5E4E2'] as const,
  diamond: ['#0066FF', '#00D4FF'] as const,
  elite: [ember[700], ember[500]] as const,
  titan: ['#6D28D9', '#8B5CF6'] as const,
  olympus: [colors.primary.DEFAULT, colors.accent.DEFAULT] as const,
} as const;

/**
 * Escalones de elevación. Sobre negro una sombra apenas se ve, así que la
 * jerarquía la marca el relleno + el borde; la sombra solo despega las capas
 * flotantes (3 = sheets y modales).
 */
export const elevation = {
  0: { backgroundColor: colors.bg.base },
  1: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  2: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 8,
  },
  3: {
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.75,
    shadowRadius: 28,
    elevation: 16,
  },
} as const;

/**
 * Presets de cristal. Reservados al **cromo** de la app (tab bar, sheets,
 * cabeceras): el blur no se usa como decoración de tarjetas de contenido.
 * `overlay` es el scrim que va encima del blur; subirlo lo anula, así que
 * cualquier superficie de cristal debe pasar por estos valores y no inventarlos.
 */
export const glass = {
  tabBar: {
    intensity: 24,
    tint: 'dark',
    overlay: 'rgba(6,6,8,0.58)',
    hairline: 'rgba(255,255,255,0.08)',
  },
  sheet: {
    intensity: 32,
    tint: 'dark',
    overlay: 'rgba(8,8,10,0.72)',
    hairline: 'rgba(255,255,255,0.10)',
  },
  header: {
    intensity: 20,
    tint: 'dark',
    overlay: 'rgba(0,0,0,0.45)',
    hairline: 'rgba(255,255,255,0.06)',
  },
  scrim: 'rgba(0,0,0,0.78)',
} as const;

export const shadow = {
  glowPrimary: {
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  glowAccent: {
    shadowColor: colors.accent.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 8,
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
