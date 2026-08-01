import type { StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  icon?: IconName;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Chip({
  label,
  onPress,
  selected = false,
  disabled = false,
  icon,
  accessibilityLabel = label,
  accessibilityHint,
  haptic = true,
  style,
  testID,
}: ChipProps) {
  const foreground = selected ? colors.primary.DEFAULT : colors.text.secondary;

  const handlePress = () => {
    if (haptic) {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress?.();
  };

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      onPress={handlePress}
      disabled={disabled}
      haptic={false}
      hitSlop={spacing.xs}
      pressScale={0.96}
      testID={testID}
      style={[
        styles.base,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={spacing.lg} color={foreground} filled={selected} /> : null}
      <Text
        variant="caption"
        tone={selected ? 'brand' : 'secondary'}
        weight={selected ? 'bold' : 'semibold'}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = {
  base: {
    minHeight: spacing['2xl'] + spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
  },
  selected: {
    borderColor: colors.primary.glow,
    backgroundColor: colors.primary.muted,
  },
  disabled: {
    opacity: 0.45,
  },
} satisfies Record<string, ViewStyle>;
