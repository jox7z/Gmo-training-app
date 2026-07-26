import { View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  haptic = true,
  style,
  testID,
}: SegmentedControlProps<T>) {
  const select = (nextValue: T) => {
    if (nextValue === value) return;
    if (haptic) {
      Haptics.selectionAsync().catch(() => {});
    }
    onValueChange(nextValue);
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.container, disabled && styles.disabledContainer, style]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const segmentDisabled = disabled || option.disabled === true;
        const foreground = selected ? colors.primary.DEFAULT : colors.text.secondary;

        return (
          <PressableScale
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityHint={option.accessibilityHint}
            accessibilityState={{ disabled: segmentDisabled, selected }}
            onPress={() => select(option.value)}
            disabled={segmentDisabled}
            haptic={false}
            pressScale={0.97}
            style={[
              styles.segment,
              selected && styles.selected,
              segmentDisabled && styles.disabledSegment,
            ]}
          >
            {option.icon ? (
              <Icon
                name={option.icon}
                size={spacing.lg}
                color={foreground}
                filled={selected}
              />
            ) : null}
            <Text
              variant="caption"
              tone={selected ? 'brand' : 'secondary'}
              weight={selected ? 'bold' : 'semibold'}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = {
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
  },
  segment: {
    minHeight: spacing['2xl'] + spacing.sm,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  selected: {
    backgroundColor: colors.primary.muted,
    borderWidth: 1,
    borderColor: colors.primary.glow,
  },
  disabledContainer: {
    opacity: 0.65,
  },
  disabledSegment: {
    opacity: 0.45,
  },
} satisfies Record<string, ViewStyle>;
