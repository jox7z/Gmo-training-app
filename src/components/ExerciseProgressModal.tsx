/**
 * ExerciseProgressModal — gráfica de progreso por ejercicio.
 *
 * Modelado sobre WeightDetailModal.tsx: misma hoja (AppBottomSheet), período
 * y stats. Añade selector de ejercicio y toggle Peso / Reps. El gesto de
 * arrastre sobre el contenido está deshabilitado para no pelear con el
 * long-press del tooltip del chart. El picker de ejercicio es un segundo
 * BottomSheetModal apilado (stacking nativo de gorhom v5), restringido a
 * ejercicios entrenados vía `onlyIds`.
 */

import { useState, useMemo, useEffect } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { ExercisePickerSheet } from '@/components/ExercisePickerSheet';
import { exerciseImage } from '@/data/exerciseImages';
import { colors, radius, spacing } from '@/theme/tokens';
import { toDisplay, formatWeight } from '@/lib/units';
import type { Unit } from '@/store/app';
import {
  buildExerciseTimeline,
  listTrainedExercises,
  type ExercisePeriod,
} from '@/lib/exerciseProgress';
import { detectPRs } from '@/lib/workoutCompare';
import { useWorkoutsStore } from '@/store/workouts';
import { useAppStore } from '@/store/app';

const PERIODS: { value: ExercisePeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'Todo' },
];

type MetricToggle = 'weight' | 'reps';

interface Props {
  visible: boolean;
  onClose: () => void;
  unit: Unit;
  initialExerciseId?: string;
  initialPeriod?: ExercisePeriod;
}

function formatDateEs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ExerciseProgressModal({
  visible,
  onClose,
  unit,
  initialExerciseId,
  initialPeriod = '90d',
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const history = useWorkoutsStore((s) => s.history);
  const setPinnedExercise = useAppStore((s) => s.setPinnedExercise);

  const exercises = useMemo(() => listTrainedExercises(history), [history]);
  const trainedIds = useMemo(() => exercises.map((e) => e.exerciseId), [exercises]);

  const [selectedId, setSelectedId] = useState<string | undefined>(
    initialExerciseId ?? exercises[0]?.exerciseId,
  );
  const [period, setPeriod] = useState<ExercisePeriod>(initialPeriod);
  const [metric, setMetric] = useState<MetricToggle>('weight');
  const [showPicker, setShowPicker] = useState(false);

  // History may hydrate after mount, leaving selectedId undefined; pick the
  // most-recent trained exercise once data is available.
  useEffect(() => {
    if (!selectedId && exercises.length > 0) {
      setSelectedId(exercises[0].exerciseId);
    }
  }, [exercises, selectedId]);

  const selectedName = exercises.find((e) => e.exerciseId === selectedId)?.name ?? selectedId ?? '';

  const timeline = useMemo(
    () => (selectedId ? buildExerciseTimeline(history, selectedId, period) : []),
    [history, selectedId, period],
  );

  const chartData = useMemo(() => {
    return timeline.map((p) => ({
      ms: new Date(p.date).getTime(),
      value: metric === 'weight' ? toDisplay(p.topWeightKg, unit) : p.repsAtTop,
    }));
  }, [timeline, metric, unit]);

  const stats = useMemo(() => {
    if (timeline.length === 0) return null;
    const values = metric === 'weight'
      ? timeline.map((p) => toDisplay(p.topWeightKg, unit))
      : timeline.map((p) => p.repsAtTop);
    const first = values[0];
    const last = values[values.length - 1];
    const max = Math.max(...values);
    const delta = last - first;
    return { first, last, max, delta, count: timeline.length };
  }, [timeline, metric, unit]);

  // PR detection: does current timeline's last session hold an all-time PR for this exercise?
  const allTimePrs = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const lastWorkout = history
      .filter((w) => w.exercises.some((e) => e.exerciseId === selectedId))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
    if (!lastWorkout) return new Set<string>();
    return detectPRs(history, lastWorkout);
  }, [history, selectedId]);

  const isPR = selectedId ? allTimePrs.has(selectedId) : false;

  const chartWidth = screenWidth - spacing.lg * 2;

  const deltaColor =
    stats === null
      ? colors.text.muted
      : stats.delta > 0
      ? colors.success
      : stats.delta < 0
      ? colors.danger
      : colors.text.muted;

  const formatLabel = metric === 'weight'
    ? (v: number) => `${v.toFixed(1)} ${unit}`
    : (v: number) => `${Math.round(v)} r`;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['80%']}
      enableContentPanningGesture={false}
      title={selectedName || 'Progreso'}
    >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
          showsVerticalScrollIndicator={false}
        >
          {/* Exercise selector — opens full-screen picker with images + filters */}
          {exercises.length > 0 && (
            <Pressable
              onPress={() => setShowPicker(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                marginHorizontal: spacing.lg,
                marginTop: spacing.md,
                padding: spacing.sm,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.bg.elevated : colors.bg.card,
              })}
            >
              {(() => {
                const img = selectedId ? exerciseImage(selectedId) : undefined;
                return (
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                      backgroundColor: colors.bg.elevated,
                    }}
                  >
                    {img !== undefined ? (
                      <Image source={img} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="dumbbell" size={20} color={colors.text.muted} />
                      </View>
                    )}
                  </View>
                );
              })()}
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="muted">Ejercicio</Text>
                <Text weight="bold" numberOfLines={1}>{selectedName}</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.text.muted} />
            </Pressable>
          )}

          {/* Fijar + toggles */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: spacing.lg,
              marginTop: spacing.md,
              gap: spacing.sm,
            }}
          >
            {/* Fijar button */}
            <Pressable
              onPress={() => { if (selectedId) { setPinnedExercise(selectedId); onClose(); } }}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                paddingVertical: 7,
                borderRadius: radius.full,
                backgroundColor: pressed ? colors.primary.muted : colors.bg.elevated,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              })}
            >
              <Icon name="map-pin" size={13} color={colors.text.secondary} />
              <Text variant="caption" weight="semibold" tone="secondary">
                Fijar
              </Text>
            </Pressable>

            {/* Metric toggle */}
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                backgroundColor: colors.bg.elevated,
                borderRadius: radius.lg,
                padding: 3,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {(['weight', 'reps'] as MetricToggle[]).map((m) => {
                const active = metric === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMetric(m)}
                    style={{
                      flex: 1,
                      paddingVertical: 6,
                      alignItems: 'center',
                      borderRadius: radius.md,
                      backgroundColor: active ? colors.primary.DEFAULT : 'transparent',
                    }}
                  >
                    <Text
                      weight="bold"
                      style={{ fontSize: 12, color: active ? '#fff' : colors.text.secondary }}
                    >
                      {m === 'weight' ? 'Peso' : 'Reps'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Period filter */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: spacing.lg,
              marginTop: spacing.sm,
              backgroundColor: colors.bg.elevated,
              borderRadius: radius.lg,
              padding: 4,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {PERIODS.map((p) => {
              const active = period === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => setPeriod(p.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    borderRadius: radius.md,
                    backgroundColor: active ? colors.primary.DEFAULT : 'transparent',
                  }}
                >
                  <Text
                    weight="bold"
                    style={{ fontSize: 13, color: active ? '#fff' : colors.text.secondary }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Chart */}
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
            <TimeSeriesChart
              data={chartData}
              chartWidth={chartWidth}
              chartHeight={200}
              formatLabel={formatLabel}
              emptyMessage="Registra al menos 2 sesiones con este ejercicio para ver la evolución."
            />
          </View>

          {/* Stats */}
          {stats && (
            <Card padding="lg" style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
                <StatCell
                  label={metric === 'weight' ? `Actual (${unit})` : 'Actual (reps)'}
                  value={metric === 'weight' ? stats.last.toFixed(1) : String(Math.round(stats.last))}
                />
                <StatCell
                  label={metric === 'weight' ? `Máx (${unit})` : 'Máx (reps)'}
                  value={metric === 'weight' ? stats.max.toFixed(1) : String(Math.round(stats.max))}
                />
                <StatCell
                  label="Delta"
                  value={`${stats.delta >= 0 ? '+' : ''}${metric === 'weight' ? stats.delta.toFixed(1) : Math.round(stats.delta)}`}
                  color={deltaColor}
                />
                <StatCell label="Sesiones" value={String(stats.count)} />
              </View>
              {isPR && (
                <View
                  style={{
                    marginTop: spacing.md,
                    paddingTop: spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.accent.soft,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 3,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: colors.accent.DEFAULT,
                    }}
                  >
                    <Text variant="caption" weight="bold" style={{ color: colors.accent.DEFAULT }}>
                      PR
                    </Text>
                  </View>
                  <Text variant="caption" tone="secondary">
                    Record personal en la última sesión
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Session list */}
          {timeline.length > 0 && (
            <Card padding="lg" style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
              <Text variant="label" tone="secondary" style={{ marginBottom: spacing.md }}>
                SESIONES
              </Text>
              <View style={{ gap: spacing.sm }}>
                {[...timeline].reverse().map((pt, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: spacing.xs,
                      borderBottomWidth: i < timeline.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text variant="caption" tone="muted">
                      {formatDateEs(pt.date)}
                    </Text>
                    <Text variant="caption" weight="semibold" numeric>
                      {pt.topWeightKg <= 0
                        ? `Peso corporal · ${pt.repsAtTop} reps`
                        : `${formatWeight(pt.topWeightKg, unit)} × ${pt.repsAtTop} reps`}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </BottomSheetScrollView>

        {/* Segundo sheet apilado sobre éste (stacking nativo de gorhom v5). */}
        <ExercisePickerSheet
          visible={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={(ex) => {
            setSelectedId(ex.id);
            setShowPicker(false);
          }}
          onlyIds={trainedIds}
          title="Elegir ejercicio"
        />
    </AppBottomSheet>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ minWidth: 70 }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text
        variant="heading"
        weight="bold"
        numeric
        style={{ marginTop: 2, color: color ?? colors.text.primary }}
      >
        {value}
      </Text>
    </View>
  );
}
