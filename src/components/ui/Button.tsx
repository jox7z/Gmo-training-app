import { Pressable, View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, shadow, depth } from '@/theme/tokens';
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
  /** Forces the flat (non-3D) render, e.g. for fixed-height rows. */
  flat?: boolean;
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
  flat,
}: Props) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;
  const chunky = !flat && size !== 'sm' && variantStyle.edgeColor != null;

  const handlePress = () => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress?.();
  };

  const content = (
    <>
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
    </>
  );

  if (chunky) {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        style={[
          { paddingBottom: depth.edge },
          fullWidth && { alignSelf: 'stretch' },
          isDisabled && { opacity: 0.45 },
          style,
        ]}
      >
        {({ pressed }) => (
          <>
            <View
              style={[styles.edge, { backgroundColor: variantStyle.edgeColor }]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.face,
                sizeStyle.container,
                variantStyle.container,
                pressed && !isDisabled && { transform: [{ translateY: depth.edge }] },
              ]}
            >
              {content}
            </View>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
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
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edge: {
    position: 'absolute',
    top: depth.edge,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xl,
  },
  face: {
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});

const variantStyles: Record<
  Variant,
  { container: ViewStyle; textColor: string; edgeColor?: string }
> = {
  primary: {
    container: { backgroundColor: colors.primary.DEFAULT },
    textColor: colors.text.primary,
    edgeColor: colors.primary.dark,
  },
  accent: {
    container: { backgroundColor: colors.accent.DEFAULT },
    textColor: colors.bg.base,
    edgeColor: colors.accent.dark,
  },
  secondary: {
    container: {
      backgroundColor: colors.bg.elevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textColor: colors.text.primary,
    edgeColor: colors.bg.cardEdge,
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    textColor: colors.text.primary,
  },
  danger: {
    container: { backgroundColor: colors.danger },
    textColor: colors.text.primary,
    edgeColor: colors.dangerDark,
  },
};

const sizeStyles: Record<Size, { container: ViewStyle; fontSize: number }> = {
  sm: { container: { paddingVertical: 10, paddingHorizontal: 16 }, fontSize: 14 },
  md: { container: { paddingVertical: 16, paddingHorizontal: 20 }, fontSize: 16 },
  lg: { container: { paddingVertical: 20, paddingHorizontal: 24 }, fontSize: 18 },
};
