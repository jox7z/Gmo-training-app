import { Text as RNText, TextProps } from 'react-native';
import { colors, fontSize, fontWeight } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label' | 'metric' | 'metricLg';
type Tone = 'primary' | 'secondary' | 'muted' | 'accent' | 'brand' | 'info' | 'danger' | 'success';

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: keyof typeof fontWeight;
  numeric?: boolean;
}

const variantStyles: Record<Variant, { size: number; weight: keyof typeof fontWeight }> = {
  display: { size: fontSize['4xl'], weight: 'black' },
  title: { size: fontSize['2xl'], weight: 'bold' },
  heading: { size: fontSize.lg, weight: 'semibold' },
  body: { size: fontSize.base, weight: 'regular' },
  caption: { size: fontSize.sm, weight: 'regular' },
  label: { size: fontSize.xs, weight: 'semibold' },
  metric: { size: fontSize['3xl'], weight: 'black' },
  metricLg: { size: fontSize['6xl'], weight: 'black' },
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

export function Text({ variant = 'body', tone = 'primary', weight, numeric, style, ...rest }: Props) {
  const v = variantStyles[variant];
  return (
    <RNText
      {...rest}
      style={[
        {
          color: toneColors[tone],
          fontSize: v.size,
          fontWeight: fontWeight[weight ?? v.weight],
          letterSpacing: variant === 'label' ? 1.2 : 0,
          textTransform: variant === 'label' ? 'uppercase' : 'none',
          fontVariant: numeric ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
    />
  );
}
