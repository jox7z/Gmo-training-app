import { View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'glow' | 'raised' | 'stream' | 'section';
  padding?: keyof typeof spacing | 0;
  glowColor?: string;
}

export function Card({
  variant = 'default',
  padding = 'lg',
  glowColor,
  style,
  children,
  ...rest
}: Props) {
  const hasOpenSides = variant === 'stream' || variant === 'section';
  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case 'elevated':
        return { backgroundColor: colors.bg.raised };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'raised':
        return {
          backgroundColor: colors.bg.card,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'glow':
        return {
          backgroundColor: colors.bg.card,
          borderWidth: 1,
          borderColor: glowColor ?? colors.primary.DEFAULT,
        };
      case 'stream':
        return {
          backgroundColor: colors.bg.card,
          borderRadius: 0,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
        };
      case 'section':
        return {
          backgroundColor: colors.bg.card,
          borderRadius: 0,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderColor: colors.border,
        };
      default:
        return { backgroundColor: colors.bg.card };
    }
  })();

  return (
    <View
      {...rest}
      style={[
        {
          borderRadius: radius.xl,
          padding: padding === 0 ? 0 : spacing[padding],
          overflow: variant === 'glow' || variant === 'raised' ? undefined : 'hidden',
        },
        variantStyle,
        style,
        hasOpenSides && {
          borderRadius: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
        },
      ]}
    >
      {children}
    </View>
  );
}
