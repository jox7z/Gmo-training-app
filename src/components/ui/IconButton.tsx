import type {
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import { PressableScale } from './PressableScale';

type IconButtonVariant = 'ghost' | 'surface' | 'primary';
type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  name: IconName;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  selected?: boolean;
  disabled?: boolean;
  filled?: boolean;
  iconColor?: string;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const sizeMap: Record<IconButtonSize, { button: number; icon: number }> = {
  sm: {
    button: spacing['2xl'] + spacing.md,
    icon: spacing.lg,
  },
  md: {
    button: spacing['3xl'],
    icon: spacing.lg + spacing.xs,
  },
  lg: {
    button: spacing['3xl'] + spacing.sm,
    icon: spacing.xl,
  },
};

export function IconButton({
  name,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  variant = 'ghost',
  size = 'md',
  selected = false,
  disabled = false,
  filled = false,
  iconColor,
  haptic = true,
  style,
  testID,
}: IconButtonProps) {
  const dimensions = sizeMap[size];
  const foreground =
    iconColor ??
    (variant === 'primary'
      ? colors.text.primary
      : selected
        ? colors.primary.DEFAULT
        : colors.text.secondary);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      onPress={onPress}
      disabled={disabled}
      haptic={haptic ? Haptics.ImpactFeedbackStyle.Light : false}
      hitSlop={spacing.sm}
      pressScale={0.96}
      testID={testID}
      style={[
        styles.base,
        {
          width: dimensions.button,
          height: dimensions.button,
        },
        variant === 'surface' && styles.surface,
        variant === 'primary' && styles.primary,
        selected && variant !== 'primary' && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon
        name={name}
        size={dimensions.icon}
        color={foreground}
        filled={filled || selected}
      />
    </PressableScale>
  );
}

const styles = {
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  surface: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primary: {
    backgroundColor: colors.primary.DEFAULT,
  },
  selected: {
    backgroundColor: colors.primary.muted,
    borderWidth: 1,
    borderColor: colors.primary.glow,
  },
  disabled: {
    opacity: 0.45,
  },
} satisfies Record<string, ViewStyle>;
