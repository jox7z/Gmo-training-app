import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { SocialLayout } from '@/components/social/SocialStreamColumn';
import { Text } from '@/components/ui/Text';
import { MUSCLE_GROUP_LABELS } from '@/data/exercises';
import type { WorkoutPostMetadata } from '@/lib/workoutPostMetadata';
import { toDisplay } from '@/lib/units';
import { useAppStore } from '@/store/app';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  title: string;
  subtitle?: string;
  metadata: WorkoutPostMetadata;
  layout?: SocialLayout;
}

export function WorkoutShareCard({ title, subtitle, metadata, layout = 'contained' }: Props) {
  const unit = useAppStore((state) => state.profile?.unit ?? 'kg');
  const stats = [
    metadata.durationSeconds !== undefined
      ? { label: 'Duración', value: formatDuration(metadata.durationSeconds) }
      : null,
    metadata.exerciseCount !== undefined &&
    metadata.workingSetCount === undefined &&
    metadata.totalReps === undefined
      ? { label: 'Ejercicios', value: formatNumber(metadata.exerciseCount) }
      : null,
    metadata.workingSetCount !== undefined
      ? { label: 'Series', value: formatNumber(metadata.workingSetCount) }
      : null,
    metadata.totalReps !== undefined
      ? { label: 'Reps', value: formatNumber(metadata.totalReps) }
      : null,
    metadata.volumeKg !== undefined && metadata.volumeKg > 0
      ? {
          label: 'Trabajo',
          value: `${formatNumber(toDisplay(metadata.volumeKg, unit))} ${unit}·rep`,
        }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const muscles = metadata.muscleGroups
    .slice(0, 3)
    .map((muscle) =>
      (MUSCLE_GROUP_LABELS as Record<string, string>)[muscle] ?? muscle,
    );

  return (
    <View>
      <View style={[styles.header, layout === 'stream' && styles.streamInset]}>
        <View style={styles.brandRail} />
        <View style={styles.headingCopy}>
          <Text variant="label" tone="brand">ENTRENAMIENTO</Text>
          <Text variant="heading" numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="muted" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.iconShell}>
          <Icon name="dumbbell" size={spacing.lg} color={colors.primary.DEFAULT} />
        </View>
      </View>

      {stats.length > 0 ? (
        <View style={styles.stats}>
          {stats.map((stat, index) => (
            <View
              key={stat.label}
              style={[styles.stat, index % 2 === 0 && styles.statDivider]}
            >
              <Text variant="caption" tone="muted">{stat.label}</Text>
              <Text weight="bold" numeric numberOfLines={1} style={styles.statValue}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {muscles.length > 0 ? (
        <View style={[styles.muscles, layout === 'stream' && styles.streamInset]}>
          {muscles.map((muscle) => (
            <View key={muscle} style={styles.muscleTag}>
              <View style={styles.muscleDot} />
              <Text variant="caption" weight="semibold">{muscle}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {metadata.exercises.length > 0 ? (
        <View style={[styles.exercises, layout === 'stream' && styles.streamInset]}>
          {metadata.exercises.slice(0, 4).map((exercise, index) => (
            <View key={exercise.exerciseId ?? `${exercise.name}-${index}`} style={styles.exerciseRow}>
              <Text variant="caption" tone="brand" weight="bold" numeric style={styles.exerciseIndex}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.exerciseName}>
                {exercise.name}
              </Text>
              {exercise.workingSetCount !== undefined ? (
                <Text variant="caption" tone="muted" numeric>
                  {exercise.workingSetCount}×
                </Text>
              ) : null}
            </View>
          ))}
          {metadata.exercises.length > 4 ? (
            <Text variant="caption" tone="muted" style={styles.moreExercises}>
              +{metadata.exercises.length - 4} ejercicios
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function formatDuration(value: number): string {
  const seconds = Math.max(0, Math.round(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  streamInset: {
    paddingHorizontal: spacing.lg,
  },
  brandRail: {
    width: spacing.xs,
    backgroundColor: colors.primary.DEFAULT,
  },
  headingCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  iconShell: {
    width: spacing['2xl'],
    height: spacing['2xl'],
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.muted,
    borderWidth: 1,
    borderColor: colors.primary.dark,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    width: '50%',
    minHeight: spacing['3xl'],
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
  },
  statDivider: {
    borderRightWidth: 1,
  },
  statValue: {
    marginTop: 2,
  },
  muscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  muscleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
  },
  muscleDot: {
    width: spacing.xs + 2,
    height: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primary.DEFAULT,
  },
  exercises: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  exerciseRow: {
    minHeight: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseIndex: {
    width: spacing.xl,
  },
  exerciseName: {
    flex: 1,
  },
  moreExercises: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xl + spacing.sm,
  },
});
