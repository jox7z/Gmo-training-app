import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { WorkoutMetric } from '@/components/workout/WorkoutMetric';
import type { PreviousSetValue } from '@/lib/workoutCompare';
import { formatWeight } from '@/lib/units';
import type { Unit } from '@/store/app';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  value: PreviousSetValue | null;
  unit: Unit;
}

export function PreviousSetCompact({ value, unit }: Props) {
  return (
    <View
      style={{
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <Text variant="caption" tone="muted">
          Anterior
        </Text>
        {value?.usedFallback ? (
          <Text variant="caption" tone="muted">
            Última disponible
          </Text>
        ) : null}
      </View>
      {value ? (
        <View style={{ flexDirection: 'row', gap: spacing['2xl'], marginTop: spacing.sm }}>
          <WorkoutMetric
            label="Peso"
            value={formatWeight(value.weightKg, unit)}
            compact
            style={{ flex: 1 }}
          />
          <WorkoutMetric
            label="Reps"
            value={value.reps}
            compact
            style={{ flex: 1 }}
          />
        </View>
      ) : (
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
          Sin registro comparable
        </Text>
      )}
    </View>
  );
}
