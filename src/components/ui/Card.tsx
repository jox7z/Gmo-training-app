import { View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius, spacing, shadow } from '@/theme/tokens';

interface Props extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'glow';
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
  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case 'elevated':
        return { backgroundColor: colors.bg.elevated, ...shadow.card };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'glow':
        return {
          backgroundColor: colors.bg.elevated,
          borderWidth: 1,
          borderColor: glowColor ?? colors.primary.DEFAULT,
          shadowColor: glowColor ?? colors.primary.DEFAULT,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 14,
          elevation: 10,
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
        },
        variantStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}
