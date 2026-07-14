import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { colors, fontSize, fontWeight, letterSpacing } from '@/theme/tokens';

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'caption'
  | 'label'
  | 'metric'
  | 'metricLg'
  | 'overline'
  | 'timer';
type Tone = 'primary' | 'secondary' | 'muted' | 'accent' | 'brand' | 'info' | 'danger' | 'success';

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: keyof typeof fontWeight;
  numeric?: boolean;
  tracking?: keyof typeof letterSpacing;
}

type VariantStyle = {
  size: number;
  weight: keyof typeof fontWeight;
  letterSpacing?: number;
  lineHeight?: number;
  uppercase?: boolean;
  tabular?: boolean;
};

// lineHeight se define SOLO en variants display-class: añadirlo a body/caption/label/
// heading haría reflow en toda la app.
const variantStyles: Record<Variant, VariantStyle> = {
  display: { size: fontSize['4xl'], weight: 'black', lineHeight: 53 },
  title: { size: fontSize['2xl'], weight: 'bold' },
  heading: { size: fontSize.lg, weight: 'semibold' },
  body: { size: fontSize.base, weight: 'regular' },
  caption: { size: fontSize.sm, weight: 'regular' },
  label: { size: fontSize.xs, weight: 'semibold', letterSpacing: letterSpacing.wide, uppercase: true },
  metric: { size: fontSize['3xl'], weight: 'black', lineHeight: 44 },
  metricLg: { size: fontSize['6xl'], weight: 'black', lineHeight: 78 },
  overline: {
    size: fontSize.sm,
    weight: 'bold',
    letterSpacing: letterSpacing.widest,
    uppercase: true,
  },
  timer: {
    size: fontSize.timer,
    weight: 'black',
    letterSpacing: letterSpacing.tightest,
    lineHeight: 68,
    tabular: true,
  },
};

const toneColors: Record<Tone, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  muted: colors.text.muted,
  accent: colors.accent.DEFAULT,
  brand: colors.primary.DEFAULT,
  info: colors.info.DEFAULT,
  danger: colors.danger,
  success: colors.success,
};

export function Text({ variant = 'body', tone = 'primary', weight, numeric, tracking, style, ...rest }: Props) {
  const v = variantStyles[variant];
  const base: TextStyle = {
    color: toneColors[tone],
    fontSize: v.size,
    fontWeight: fontWeight[weight ?? v.weight],
    // `tracking` gana sobre el default del variant cuando se pasa.
    letterSpacing: tracking != null ? letterSpacing[tracking] : v.letterSpacing ?? 0,
    textTransform: v.uppercase ? 'uppercase' : 'none',
    fontVariant: numeric || v.tabular ? ['tabular-nums'] : undefined,
  };
  // Un lineHeight fijo + autosize corta glifos cuando la fuente se encoge
  // (el line-box no acompaña): con adjustsFontSizeToFit se omite el del variant.
  if (v.lineHeight != null && !rest.adjustsFontSizeToFit) base.lineHeight = v.lineHeight;
  return <RNText {...rest} style={[base, style]} />;
}
