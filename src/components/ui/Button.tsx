import { Pressable, View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, shadow } from '@/theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
  haptic?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  leftIcon,
  style,
  haptic = true,
}: Props) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress?.();
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyle.container,
        variantStyle.container,
        fullWidth && { alignSelf: 'stretch' },
        pressed && !isDisabled && { transform: [{ scale: 0.97 }], opacity: 0.92 },
        isDisabled && { opacity: 0.45 },
        variant === 'primary' && shadow.glowPrimary,
        variant === 'accent' && shadow.glowAccent,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.textColor} />
      ) : (
        <View style={styles.row}>
          {leftIcon && <View style={{ marginRight: spacing.sm }}>{leftIcon}</View>}
          <Text
            style={{ color: variantStyle.textColor, fontSize: sizeStyle.fontSize }}
            weight="bold"
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});

const variantStyles: Record<Variant, { container: ViewStyle; textColor: string }> = {
  primary: {
    container: { backgroundColor: colors.primary.DEFAULT },
    textColor: '#FFFFFF',
  },
  accent: {
    container: { backgroundColor: colors.accent.DEFAULT },
    textColor: '#0B0B0B',
  },
  secondary: {
    container: {
      backgroundColor: colors.bg.elevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textColor: colors.text.primary,
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    textColor: colors.text.primary,
  },
  danger: {
    container: { backgroundColor: colors.danger },
    textColor: '#FFFFFF',
  },
};

const sizeStyles: Record<Size, { container: ViewStyle; fontSize: number }> = {
  sm: { container: { paddingVertical: 10, paddingHorizontal: 16 }, fontSize: 14 },
  md: { container: { paddingVertical: 14, paddingHorizontal: 20 }, fontSize: 16 },
  lg: { container: { paddingVertical: 18, paddingHorizontal: 24 }, fontSize: 18 },
};
