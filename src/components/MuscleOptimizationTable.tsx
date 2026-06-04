import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, radius } from '@/theme/tokens';
import {
  MuscleAssessment,
  MuscleStatus,
  OPTIMAL_MAX_SETS,
  UPPER_MUSCLES,
  LOWER_MUSCLES,
  MUSCLE_LABELS,
} from '@/lib/optimizationScore';

interface Props {
  items: MuscleAssessment[];
  grouped?: boolean;
}

export const STATUS_COLOR: Record<MuscleStatus, string> = {
  optimal: colors.success,
  low: colors.warning,
  high: colors.accent.DEFAULT,
  untrained: colors.text.muted,
};

const STATUS_LABEL: Record<MuscleStatus, string> = {
  optimal: 'Óptimo',
  low: 'Bajo',
  high: 'Exceso',
  untrained: 'Sin entrenar',
};

const STATUS_TONE: Record<MuscleStatus, 'success' | 'muted' | 'accent' | 'danger'> = {
  optimal: 'success',
  low: 'muted',
  high: 'accent',
  untrained: 'muted',
};

function MuscleRow({ item }: { item: MuscleAssessment }) {
  const barColor = STATUS_COLOR[item.status];
  const fillPct = Math.min(100, (item.weeklySets / OPTIMAL_MAX_SETS) * 100);

  return (
    <View style={{ paddingVertical: spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text weight="semibold" style={{ fontSize: 14 }}>
            {item.label}
          </Text>
          <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {item.weeklySets} series · {item.frequency}×/sem
          </Text>
        </View>
        <Badge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 4,
          borderRadius: radius.sm,
          backgroundColor: colors.border,
          marginTop: spacing.sm,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 4,
            borderRadius: radius.sm,
            backgroundColor: barColor,
            width: `${fillPct}%` as any,
          }}
        />
      </View>

      <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
        {item.hint}
      </Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View
      style={{
        paddingVertical: spacing.xs,
        marginTop: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: spacing.xs,
      }}
    >
      <Text variant="label" tone="muted">
        {title}
      </Text>
    </View>
  );
}

export function MuscleOptimizationTable({ items, grouped = false }: Props) {
  if (items.length === 0) {
    return (
      <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
        <Text variant="caption" tone="muted">
          Agrega ejercicios a tu rutina para ver el análisis por músculo.
        </Text>
      </View>
    );
  }

  if (!grouped) {
    return (
      <View>
        {items.map((item, i) => (
          <View key={item.muscle}>
            {i > 0 && (
              <View style={{ height: 1, backgroundColor: colors.border }} />
            )}
            <MuscleRow item={item} />
          </View>
        ))}
      </View>
    );
  }

  // Grouped: tren superior / tren inferior
  const upperMuscleSlugs = UPPER_MUSCLES as readonly string[];
  const lowerMuscleSlugs = LOWER_MUSCLES as readonly string[];

  const upper = items.filter((it) => upperMuscleSlugs.includes(it.muscle));
  const lower = items.filter((it) => lowerMuscleSlugs.includes(it.muscle));
  const other = items.filter(
    (it) => !upperMuscleSlugs.includes(it.muscle) && !lowerMuscleSlugs.includes(it.muscle),
  );

  return (
    <View>
      {upper.length > 0 && (
        <>
          <SectionHeader title="Tren superior" />
          {upper.map((item, i) => (
            <View key={item.muscle}>
              {i > 0 && <View style={{ height: 1, backgroundColor: colors.border }} />}
              <MuscleRow item={item} />
            </View>
          ))}
        </>
      )}

      {lower.length > 0 && (
        <>
          <SectionHeader title="Tren inferior" />
          {lower.map((item, i) => (
            <View key={item.muscle}>
              {i > 0 && <View style={{ height: 1, backgroundColor: colors.border }} />}
              <MuscleRow item={item} />
            </View>
          ))}
        </>
      )}

      {other.length > 0 && (
        <>
          <SectionHeader title="Otros" />
          {other.map((item, i) => (
            <View key={item.muscle}>
              {i > 0 && <View style={{ height: 1, backgroundColor: colors.border }} />}
              <MuscleRow item={item} />
            </View>
          ))}
        </>
      )}
    </View>
  );
}
