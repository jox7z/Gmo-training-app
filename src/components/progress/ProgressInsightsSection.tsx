import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';

import { Icon } from '@/components/Icon';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { WorkoutResultsModal } from '@/components/WorkoutResultsModal';
import { ExerciseProgressPicker } from '@/components/progress/ExerciseProgressPicker';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { exerciseById } from '@/data/exercises';
import {
  buildExercisePerformance,
  buildPerformanceTimeline,
  performanceMetricValue,
  resolvePerformanceMetric,
  type ExercisePerformance,
  type PerformanceMetric,
  type PerformanceRange,
} from '@/lib/progressInsights';
import { toDisplay } from '@/lib/units';
import type { Unit } from '@/store/app';
import type { Workout } from '@/store/workouts';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  history: Workout[];
  unit: Unit;
}

const METRIC_OPTIONS: readonly { value: PerformanceMetric; label: string }[] = [
  { value: 'weight', label: 'Carga' },
  { value: 'reps', label: 'Reps' },
  { value: 'duration', label: 'Tiempo' },
];

const RANGE_OPTIONS = [
  { value: '30d', label: '30 d' },
  { value: '90d', label: '90 d' },
  { value: 'all', label: 'Todo' },
] as const;

const GMO_EXERCISE_PROGRESS = require('../../../assets/brand/gmo-exercise-progress.webp');

export function ProgressInsightsSection({ history, unit }: Props) {
  const router = useRouter();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [metricOverride, setMetricOverride] = useState<PerformanceMetric | null>(null);
  const [range, setRange] = useState<PerformanceRange>('90d');
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const performance = useMemo(() => buildExercisePerformance(history), [history]);
  const selectedExercise =
    performance.find((item) => item.exerciseId === selectedExerciseId) ??
    performance[0];
  const hasExerciseDetails = selectedExercise
    ? exerciseById(selectedExercise.exerciseId) !== undefined
    : false;
  const activeMetric = selectedExercise
    ? resolvePerformanceMetric(selectedExercise, metricOverride)
    : (metricOverride ?? 'reps');
  const timeline = useMemo(
    () =>
      selectedExercise
        ? buildPerformanceTimeline(selectedExercise, activeMetric, range)
        : [],
    [activeMetric, range, selectedExercise],
  );
  const chartData = useMemo(
    () =>
      timeline.map((point) => ({
        id: point.workoutId,
        ms: point.ms,
        value: point.value,
      })),
    [timeline],
  );
  const metricOptions = useMemo(
    () =>
      METRIC_OPTIONS.map((option) => ({
        ...option,
        disabled:
          !selectedExercise ||
          !selectedExercise.sessions.some(
            (session) => performanceMetricValue(session, option.value) !== null,
          ),
      })),
    [selectedExercise],
  );

  const selectExercise = (item: ExercisePerformance) => {
    setSelectedExerciseId(item.exerciseId);
    setMetricOverride(null);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="heading">Progreso por ejercicio</Text>
      </View>

      {selectedExercise ? (
        <>
          <ExerciseProgressPicker
            items={performance}
            selectedId={selectedExercise.exerciseId}
            onSelect={selectExercise}
          />

          <Card variant="section" padding="lg">
            <View style={styles.chartHeader}>
              <View style={styles.chartHeadingCopy}>
                <Text variant="headline" numberOfLines={1}>{selectedExercise.name}</Text>
                <Text variant="caption" tone="muted">
                  {metricLabel(activeMetric)}
                </Text>
              </View>
              <Image
                source={GMO_EXERCISE_PROGRESS}
                style={styles.chartMascot}
                contentFit="contain"
                accessible={false}
              />
            </View>

            <View style={styles.controls}>
              <SegmentedControl
                options={metricOptions}
                value={activeMetric}
                onValueChange={setMetricOverride}
                accessibilityLabel="Dato real de rendimiento"
                haptic={false}
              />
              <SegmentedControl
                options={RANGE_OPTIONS}
                value={range}
                onValueChange={setRange}
                accessibilityLabel="Rango de tiempo"
                haptic={false}
              />
            </View>

            <View style={styles.chart}>
              <TimeSeriesChart
                data={chartData}
                chartHeight={spacing['4xl'] * 3}
                formatLabel={(value) => formatMetricValue(value, activeMetric, unit)}
                accessibilityLabel={`Evolución de ${selectedExercise.name}, ${metricLabel(activeMetric)}`}
                formatPointAccessibilityLabel={(point) =>
                  `${selectedExercise.name}, ${metricLabel(activeMetric)}, ${formatMetricValue(point.value, activeMetric, unit)}, ${formatChartDate(point.ms)}`
                }
                onPointPress={(point) => {
                  const workout = history.find((item) => item.id === point.id);
                  if (workout) setSelectedWorkout(workout);
                }}
                emptyMessage="Necesitas al menos 2 sesiones con este dato."
              />
            </View>

            {hasExerciseDetails ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Abrir historial completo de ${selectedExercise.name}`}
                accessibilityHint="Muestra información, sesiones y récords del ejercicio"
                onPress={() =>
                  router.push(`/exercise/${selectedExercise.exerciseId}` as Href)
                }
                haptic={false}
                pressScale={0.98}
                style={styles.detailsLink}
              >
                <Text variant="caption" tone="brand" weight="bold">
                  Ver detalle del ejercicio
                </Text>
                <Icon name="chevron-right" size={spacing.md} color={colors.primary.DEFAULT} />
              </PressableScale>
            ) : null}
          </Card>
        </>
      ) : (
        <Card variant="section" padding="xl" style={styles.emptyPerformance}>
          <Icon name="chart" size={spacing['2xl']} color={colors.text.muted} />
          <Text variant="caption" tone="muted" style={styles.emptyPerformanceText}>
            Completa una serie para empezar a registrar tu rendimiento.
          </Text>
        </Card>
      )}

      <WorkoutResultsModal
        visible={selectedWorkout !== null}
        workout={selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
      />
    </View>
  );
}

function metricLabel(metric: PerformanceMetric): string {
  if (metric === 'weight') return 'Mayor carga completada';
  if (metric === 'reps') return 'Repeticiones totales';
  return 'Tiempo activo de las series';
}

function formatMetricValue(
  value: number,
  metric: PerformanceMetric,
  unit: Unit,
): string {
  if (metric === 'duration') return formatSeconds(value);
  if (metric === 'reps') return `${Math.round(value)} reps`;
  const converted = formatNumber(toDisplay(value, unit));
  return `${converted} ${unit}`;
}

function formatSeconds(value: number): string {
  const seconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

function formatChartDate(ms: number): string {
  return new Date(ms).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chartHeadingCopy: {
    flex: 1,
  },
  chartMascot: {
    width: spacing['4xl'],
    height: spacing['4xl'],
    flexShrink: 0,
  },
  controls: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  chart: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  detailsLink: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyPerformance: {
    alignItems: 'center',
    minHeight: spacing['4xl'] * 2,
    justifyContent: 'center',
  },
  emptyPerformanceText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
