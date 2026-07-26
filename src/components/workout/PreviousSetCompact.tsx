import { View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Text } from '@/components/ui/Text';
import type { PreviousSetValue } from '@/lib/workoutCompare';
import { formatWeight } from '@/lib/units';
import type { Unit } from '@/store/app';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  value: PreviousSetValue | null;
  unit: Unit;
}

export function PreviousSetCompact({ value, unit }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg.elevated,
      }}
    >
      <View
        style={{
          width: spacing['2xl'],
          height: spacing['2xl'],
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.info.soft,
        }}
      >
        <Icon name="clock" size={16} color={colors.info.DEFAULT} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="label" tone="muted">
          Anterior
        </Text>
        <Text variant="caption" weight="semibold" tone={value ? 'secondary' : 'muted'} numeric>
          {value
            ? `${formatWeight(value.weightKg, unit)} × ${value.reps} reps`
            : 'Sin registro comparable'}
        </Text>
      </View>

      {value?.usedFallback && (
        <Text variant="caption" tone="muted">
          Última disponible
        </Text>
      )}
    </View>
  );
}
