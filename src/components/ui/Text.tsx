import { StyleSheet, Text as RNText, TextProps, type TextStyle } from 'react-native';
import {
  colors,
  fontWeight,
  typography,
  type TypographyVariant,
} from '@/theme/tokens';

type Tone = 'primary' | 'secondary' | 'muted' | 'accent' | 'brand' | 'info' | 'danger' | 'success';

interface Props extends TextProps {
  variant?: TypographyVariant;
  tone?: Tone;
  weight?: keyof typeof fontWeight;
  numeric?: boolean;
}

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
  const variantStyle = typography[variant];
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const overridesFontSizeWithoutLineHeight =
    flattenedStyle?.fontSize !== undefined && flattenedStyle.lineHeight === undefined;
  const resolvedVariantStyle = overridesFontSizeWithoutLineHeight
    ? { ...variantStyle, lineHeight: undefined }
    : variantStyle;

  return (
    <RNText
      {...rest}
      style={[
        {
          ...resolvedVariantStyle,
          color: toneColors[tone],
          fontWeight: weight ? fontWeight[weight] : variantStyle.fontWeight,
          fontVariant: numeric ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
    />
  );
}
