import { Pressable, View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontSize, radius, spacing, depth } from '@/theme/tokens';
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
  /** Sustituye el nombre accesible cuando el título no basta por sí solo. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
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
  accessibilityLabel,
  accessibilityHint,
  testID,
}: Props) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;
  const chunky = !flat && size !== 'sm' && variantStyle.edgeColor != null;

  // Semántica común a las dos ramas de render (3D chunky y plana).
  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel ?? title,
    accessibilityHint,
    accessibilityState: { disabled: Boolean(isDisabled), busy: Boolean(loading) },
    testID,
  };

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
        {...a11y}
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
      {...a11y}
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyle.container,
        variantStyle.container,
        fullWidth && { alignSelf: 'stretch' },
        pressed && !isDisabled && { transform: [{ scale: 0.97 }], opacity: 0.92 },
        isDisabled && { opacity: 0.45 },
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
      borderColor: colors.borderStrong,
    },
    textColor: colors.text.primary,
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

// Alturas mínimas táctiles: `sm` 40 px (los contenedores le añaden hitSlop),
// `md`/`lg` por encima de 48 px.
const sizeStyles: Record<Size, { container: ViewStyle; fontSize: number }> = {
  sm: {
    container: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 40 },
    fontSize: fontSize.sm + 1,
  },
  md: {
    container: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl - spacing.xs,
      minHeight: 52,
    },
    fontSize: fontSize.base + 1,
  },
  lg: {
    container: {
      paddingVertical: spacing.xl - spacing.xs,
      paddingHorizontal: spacing.xl,
      minHeight: 60,
    },
    fontSize: fontSize.md + 1,
  },
};
