import { View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius, spacing, shadow } from '@/theme/tokens';

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
        // `raised` y no `elevated`: con la rampa Ember, bg.elevated queda por
        // debajo de bg.card, así que un "elevated" con ese relleno se leería
        // más hundido que el Card por defecto.
        return { backgroundColor: colors.bg.raised, ...shadow.card };
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
          borderColor: colors.accent.DEFAULT,
          borderRadius: radius['2xl'],
        };
      case 'glow':
        return {
          backgroundColor: colors.bg.card,
          borderWidth: 1,
          borderColor: glowColor ?? colors.primary.DEFAULT,
          shadowColor: glowColor ?? colors.primary.DEFAULT,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 14,
          elevation: 10,
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
