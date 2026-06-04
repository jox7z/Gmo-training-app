import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, RefreshControl, useWindowDimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Rect, Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { WeightChart } from '@/components/WeightChart';
import { WeightDetailModal } from '@/components/WeightDetailModal';
import { TimeSeriesChart, type TimeSeriesPoint } from '@/components/TimeSeriesChart';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { colors, radius, spacing, RANKS, rankFromPoints, nextRank, type RankId } from '@/theme/tokens';
import { useAppStore, type Unit } from '@/store/app';
import { StreakRing } from '@/components/StreakRing';
import { useWorkoutsStore } from '@/store/workouts';
import { listTrainedExercises, buildExerciseTimeline, type ExercisePeriod } from '@/lib/exerciseProgress';
import { exerciseImage } from '@/data/exerciseImages';
import { Image } from 'expo-image';
import { toDisplay } from '@/lib/units';
import { useLeaderboard, type LeaderboardEntry } from '@/lib/queries/social';
import { Avatar } from '@/components/Avatar';
import { useProgressSummary, useProgressTimeline } from '@/lib/queries/progress';
import {
  formatDuration,
  formatWeight,
  type ProgressPeriod,
  type ProgressSummary,
} from '@/lib/progress';
import {
  useBodyMeasurements,
  useBodyTimeline,
  useDeleteMeasurement,
  type BodyMeasurement,
  type BodyTimelinePoint,
  type BodyPeriod,
} from '@/lib/queries/body';
import { useToast } from '@/components/ui/Toast';

const PERIODS: { value: ProgressPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'Todo' },
];

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const streakWeeks = useAppStore((s) => s.streakWeeks);
  const daysThisWeek = useAppStore((s) => s.daysThisWeek);

  const [period, setPeriod] = useState<ProgressPeriod>('30d');
  const [bodyPeriod, setBodyPeriod] = useState<BodyPeriod>('90d');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseMetric, setExerciseMetric] = useState<'weight' | 'reps'>('weight');

  const history = useWorkoutsStore((s) => s.history);
  const pinnedExerciseId = useAppStore((s) => s.pinnedExerciseId);
  const trainedExercises = useMemo(() => listTrainedExercises(history), [history]);
  const effectivePinnedId = pinnedExerciseId ?? trainedExercises[0]?.exerciseId;
  const pinnedName = trainedExercises.find((e) => e.exerciseId === effectivePinnedId)?.name ?? '';

  const pinnedTimeline = useMemo(
    () => (effectivePinnedId ? buildExerciseTimeline(history, effectivePinnedId, '90d') : []),
    [history, effectivePinnedId],
  );
  const pinnedChartData = useMemo(
    () =>
      pinnedTimeline.map((p) => ({
        ms: new Date(p.date).getTime(),
        value:
          exerciseMetric === 'weight'
            ? toDisplay(p.topWeightKg, profile?.unit ?? 'kg')
            : p.repsAtTop,
      })),
    [pinnedTimeline, exerciseMetric, profile?.unit],
  );

  const summaryQuery = useProgressSummary(period);
  const timelineQuery = useProgressTimeline(period);
  const bodyMeasurementsQuery = useBodyMeasurements();
  const bodyTimelineQuery = useBodyTimeline(bodyPeriod);

  const currentRank = rankFromPoints(profile?.rankPoints ?? 0);
  const leaderboardQuery = useLeaderboard(currentRank.id);

  const summary: ProgressSummary | undefined = summaryQuery.data;

  const refreshing =
    summaryQuery.isRefetching ||
    timelineQuery.isRefetching ||
    bodyMeasurementsQuery.isRefetching ||
    bodyTimelineQuery.isRefetching ||
    leaderboardQuery.isRefetching;
  const onRefresh = () => {
    summaryQuery.refetch();
    timelineQuery.refetch();
    bodyMeasurementsQuery.refetch();
    bodyTimelineQuery.refetch();
    leaderboardQuery.refetch();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Sticky header */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg.base,
        }}
      >
        <Text variant="title">Progreso</Text>
        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing.md,
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
                <Text weight="bold" tone={active ? 'primary' : 'secondary'} style={{ fontSize: 13 }}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: spacing.md,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.DEFAULT} />
        }
      >
        {!summary ? (
          <ProgressSkeleton />
        ) : summary.totalWorkouts === 0 ? (
          <EmptyState />
        ) : (
          <>
            <AveragesCard summary={summary} />
            <Card padding="lg" style={{ alignItems: 'center' }}>
              <StreakRing
                weeks={streakWeeks}
                daysThisWeek={daysThisWeek}
                weeklyGoal={profile?.weeklyGoalDays ?? 4}
              />
            </Card>
            <TimelineCard
              data={timelineQuery.data ?? []}
              loading={timelineQuery.isLoading && !timelineQuery.data}
            />
          </>
        )}

        {/* Exercise progress card — only when there is history */}
        {trainedExercises.length > 0 && effectivePinnedId ? (
          <ExerciseProgressCard
            exerciseId={effectivePinnedId}
            name={pinnedName}
            chartData={pinnedChartData}
            metric={exerciseMetric}
            unit={profile?.unit ?? 'kg'}
            onMetricChange={setExerciseMetric}
            onOpen={() => setShowExerciseModal(true)}
          />
        ) : null}

        <BodySection
          measurements={bodyMeasurementsQuery.data ?? []}
          timeline={bodyTimelineQuery.data ?? []}
          unit={profile?.unit ?? 'kg'}
          bodyPeriod={bodyPeriod}
          onBodyPeriodChange={setBodyPeriod}
          onAdd={() => router.push('/body/new')}
          onOpenDetail={() => setShowDetailModal(true)}
        />

        <WeightDetailModal
          visible={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          unit={profile?.unit ?? 'kg'}
          initialPeriod={bodyPeriod}
        />

        <ExerciseProgressModal
          visible={showExerciseModal}
          onClose={() => setShowExerciseModal(false)}
          unit={profile?.unit ?? 'kg'}
          initialExerciseId={effectivePinnedId}
        />

        <RanksSection currentPoints={profile?.rankPoints ?? 0} />

        <LeaderboardSection
          rankId={currentRank.id}
          entries={leaderboardQuery.data ?? []}
          loading={leaderboardQuery.isLoading}
          isError={leaderboardQuery.isError}
          currentUserId={profile?.id}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function AveragesCard({ summary }: { summary: ProgressSummary }) {
  return (
    <Card padding="lg">
      <Text variant="label" tone="secondary">PROMEDIOS POR SERIE</Text>
      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">Duración serie</Text>
          <Text variant="heading" weight="bold" numeric style={{ marginTop: 2 }}>
            {formatDuration(summary.avgSetDuration)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">Descanso entre series</Text>
          <Text variant="heading" weight="bold" numeric style={{ marginTop: 2 }}>
            {formatDuration(summary.avgRestAfter)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function TimelineCard({
  data,
  loading,
}: {
  data: { day: string; activeSeconds: number }[];
  loading: boolean;
}) {
  const { width } = useWindowDimensions();
  // 2x spacing.lg de padding externo del scroll + 2x spacing.lg padding interno de la Card
  const chartWidth = width - spacing.lg * 4;
  const chartHeight = 160;
  const axisPad = 24;
  const innerW = chartWidth - axisPad;
  const innerH = chartHeight - 20;

  const maxMinutes = useMemo(() => {
    const max = data.reduce((m, p) => Math.max(m, p.activeSeconds / 60), 0);
    return max > 0 ? Math.ceil(max / 5) * 5 : 5;
  }, [data]);

  const barW = data.length > 0 ? innerW / data.length : 0;

  return (
    <Card padding="lg">
      <Text variant="label" tone="secondary">EVOLUCIÓN · TIEMPO ACTIVO POR DÍA (min)</Text>
      <View style={{ marginTop: spacing.md }}>
        {loading && data.length === 0 ? (
          <View style={{ height: chartHeight, justifyContent: 'center', alignItems: 'center' }}>
            <Text variant="caption" tone="muted">Cargando timeline…</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={{ height: chartHeight, justifyContent: 'center', alignItems: 'center' }}>
            <Text variant="caption" tone="muted">Sin datos para este período</Text>
          </View>
        ) : (
          <Svg width={chartWidth} height={chartHeight}>
            {/* Y axis label top */}
            <SvgText x={0} y={12} fontSize={10} fill={colors.text.muted}>
              {maxMinutes}m
            </SvgText>
            {/* Baseline */}
            <Line
              x1={axisPad}
              x2={chartWidth}
              y1={chartHeight - 16}
              y2={chartHeight - 16}
              stroke={colors.border}
              strokeWidth={1}
            />
            {/* Bars */}
            {data.map((p, i) => {
              const minutes = p.activeSeconds / 60;
              const h = maxMinutes > 0 ? (minutes / maxMinutes) * innerH : 0;
              const x = axisPad + i * barW + barW * 0.15;
              const y = chartHeight - 16 - h;
              const w = barW * 0.7;
              return (
                <Rect
                  key={p.day}
                  x={x}
                  y={y}
                  width={w}
                  height={Math.max(0, h)}
                  rx={2}
                  fill={h > 0 ? colors.primary.DEFAULT : colors.bg.elevated}
                />
              );
            })}
          </Svg>
        )}
      </View>
      {data.length > 0 && (
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          {data[0]?.day} → {data[data.length - 1]?.day}
        </Text>
      )}
    </Card>
  );
}

function EmptyState() {
  return (
    <Card padding="xl" style={{ alignItems: 'center', marginTop: spacing.lg }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary.muted,
          borderWidth: 1,
          borderColor: colors.primary.DEFAULT,
          marginBottom: spacing.md,
        }}
      >
        <Icon name="chart" size={28} color={colors.primary.DEFAULT} />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>
        Aún no tienes entrenamientos
      </Text>
      <Text
        variant="caption"
        tone="secondary"
        style={{ textAlign: 'center', marginTop: spacing.xs }}
      >
        Empieza tu primer workout para ver tu progreso aquí.
      </Text>
    </Card>
  );
}

function ProgressSkeleton() {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padding="lg" style={{ width: '47%', flexGrow: 1, height: 110 }} />
        ))}
      </View>
      <Card padding="lg" style={{ height: 100 }} />
      <Card padding="lg" style={{ height: 130 }} />
      <Card padding="lg" style={{ height: 220 }} />
    </View>
  );
}

// =====================================================
// COMPOSICIÓN CORPORAL
// =====================================================

const BODY_PERIODS: { value: BodyPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'Todo' },
];

function BodySection({
  measurements,
  timeline,
  unit,
  bodyPeriod,
  onBodyPeriodChange,
  onAdd,
  onOpenDetail,
}: {
  measurements: BodyMeasurement[];
  timeline: BodyTimelinePoint[];
  unit: Unit;
  bodyPeriod: BodyPeriod;
  onBodyPeriodChange: (p: BodyPeriod) => void;
  onAdd: () => void;
  onOpenDetail: () => void;
}) {
  const latest = measurements[0];
  const recent = measurements.slice(0, 5);

  return (
    <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="heading">Peso y progreso</Text>
        <Pressable onPress={onOpenDetail} hitSlop={8}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.bg.elevated,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="chart" size={18} color={colors.primary.DEFAULT} />
          </View>
        </Pressable>
      </View>

      {/* Filtro de período para el chart de peso */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.bg.elevated,
          borderRadius: radius.lg,
          padding: 4,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {BODY_PERIODS.map((p) => {
          const active = bodyPeriod === p.value;
          return (
            <Pressable
              key={p.value}
              onPress={() => onBodyPeriodChange(p.value)}
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
                tone={active ? 'primary' : 'secondary'}
                style={{ fontSize: 12 }}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title="Registrar peso de hoy"
        leftIcon={<Icon name="scale" size={18} color="#fff" />}
        onPress={onAdd}
        fullWidth
      />

      {latest && (
        <Card padding="lg">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text variant="label" tone="secondary">ÚLTIMA MEDICIÓN</Text>
              <Text variant="metric" tone="brand" numeric style={{ marginTop: spacing.xs }}>
                {formatWeight(latest.weightKg, unit)}
              </Text>
              <Text variant="caption" tone="muted">
                {formatDate(latest.recordedAt)}
              </Text>
            </View>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary.muted,
              }}
            >
              <Icon name="scale" size={22} color={colors.primary.DEFAULT} />
            </View>
          </View>
          {(latest.bodyFatPct !== undefined ||
            latest.musclePct !== undefined ||
            latest.waterPct !== undefined) && (
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              {latest.bodyFatPct !== undefined && (
                <MiniStat label="Grasa" value={`${latest.bodyFatPct.toFixed(1)}%`} />
              )}
              {latest.musclePct !== undefined && (
                <MiniStat label="Músculo" value={`${latest.musclePct.toFixed(1)}%`} />
              )}
              {latest.waterPct !== undefined && (
                <MiniStat label="Agua" value={`${latest.waterPct.toFixed(1)}%`} />
              )}
            </View>
          )}
        </Card>
      )}

      <WeightTimelineCard data={timeline} unit={unit} />

      {recent.length > 0 && (
        <Card padding="lg">
          <Text variant="label" tone="secondary" style={{ marginBottom: spacing.md }}>
            ÚLTIMAS MEDICIONES
          </Text>
          <View style={{ gap: spacing.sm }}>
            {recent.map((m, i) => (
              <MeasurementRow key={m.id} measurement={m} unit={unit} showDivider={i < recent.length - 1} />
            ))}
          </View>
        </Card>
      )}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text weight="bold" numeric style={{ marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function MeasurementRow({
  measurement,
  unit,
  showDivider,
}: {
  measurement: BodyMeasurement;
  unit: Unit;
  showDivider: boolean;
}) {
  const toast = useToast();
  const remove = useDeleteMeasurement();

  const handleLongPress = () => {
    Alert.alert(
      'Medición',
      formatDate(measurement.recordedAt),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () =>
            remove.mutate(measurement.id, {
              onSuccess: () =>
                toast.show({ message: 'Medición eliminada', tone: 'success' }),
              onError: (err) =>
                toast.show({
                  message: err?.message ?? 'No se pudo eliminar',
                  tone: 'danger',
                }),
            }),
        },
      ],
    );
  };

  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        {
          paddingVertical: spacing.sm,
          borderBottomWidth: showDivider ? 1 : 0,
          borderBottomColor: colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text weight="bold" numeric>
            {formatWeight(measurement.weightKg, unit)}
          </Text>
          <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {formatDate(measurement.recordedAt)}
          </Text>
        </View>
        {(measurement.bodyFatPct !== undefined ||
          measurement.musclePct !== undefined ||
          measurement.waterPct !== undefined) && (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {measurement.bodyFatPct !== undefined && (
              <SmallTag label={`${measurement.bodyFatPct.toFixed(1)}% grasa`} />
            )}
            {measurement.musclePct !== undefined && (
              <SmallTag label={`${measurement.musclePct.toFixed(1)}% músc`} />
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function SmallTag({ label }: { label: string }) {
  return (
    <Text variant="caption" tone="secondary">
      {label}
    </Text>
  );
}

function WeightTimelineCard({ data, unit }: { data: BodyTimelinePoint[]; unit: Unit }) {
  // Los datos llegan ordenados ascendentemente desde el RPC (0018).
  // WeightChart los reordena internamente por fecha, por seguridad.
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)),
    [data],
  );

  return (
    <Card padding="lg">
      <Text variant="label" tone="secondary">EVOLUCIÓN DEL PESO ({unit})</Text>
      <View style={{ marginTop: spacing.md }}>
        <WeightChart data={data} unit={unit} />
      </View>
      {sorted.length >= 2 && (
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
          {formatDate(sorted[0].recordedAt)} → {formatDate(sorted[sorted.length - 1].recordedAt)}
        </Text>
      )}
    </Card>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// =====================================================
// PROGRESO POR EJERCICIO
// =====================================================

function ExerciseProgressCard({
  exerciseId,
  name,
  chartData,
  metric,
  unit,
  onMetricChange,
  onOpen,
}: {
  exerciseId?: string;
  name: string;
  chartData: TimeSeriesPoint[];
  metric: 'weight' | 'reps';
  unit: Unit;
  onMetricChange: (m: 'weight' | 'reps') => void;
  onOpen: () => void;
}) {
  const img = exerciseId ? exerciseImage(exerciseId) : undefined;
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.lg * 4;

  return (
    <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="heading">Progreso por ejercicio</Text>
        <Pressable onPress={onOpen} hitSlop={8}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.bg.elevated,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="chart" size={18} color={colors.primary.DEFAULT} />
          </View>
        </Pressable>
      </View>

      <Pressable onPress={onOpen}>
        <Card padding="lg">
          {/* Exercise name + metric toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            {img !== undefined && (
              <Image
                source={img}
                style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg.elevated }}
                contentFit="cover"
              />
            )}
            <Text weight="bold" style={{ flex: 1 }} numberOfLines={1}>
              {name}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.bg.elevated,
                borderRadius: radius.lg,
                padding: 3,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {(['weight', 'reps'] as ('weight' | 'reps')[]).map((m) => {
                const active = metric === m;
                return (
                  <Pressable
                    key={m}
                    onPress={(e) => { e.stopPropagation?.(); onMetricChange(m); }}
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 4,
                      borderRadius: radius.md,
                      backgroundColor: active ? colors.primary.DEFAULT : 'transparent',
                    }}
                  >
                    <Text
                      weight="bold"
                      style={{ fontSize: 11, color: active ? '#fff' : colors.text.secondary }}
                    >
                      {m === 'weight' ? 'Peso' : 'Reps'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TimeSeriesChart
            data={chartData}
            chartWidth={chartWidth}
            chartHeight={130}
            formatLabel={
              metric === 'weight'
                ? (v) => `${v.toFixed(1)}${unit}`
                : (v) => `${Math.round(v)}r`
            }
            emptyMessage="Registra 2 o más sesiones con este ejercicio."
          />
        </Card>
      </Pressable>
    </View>
  );
}

// =====================================================
// RANGOS Y LEADERBOARD
// =====================================================

function RanksSection({ currentPoints }: { currentPoints: number }) {
  const current = rankFromPoints(currentPoints);
  const next = nextRank(currentPoints);
  const progressToNext = next
    ? Math.min(1, (currentPoints - current.min) / (next.min - current.min))
    : 1;

  return (
    <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="heading">Rangos</Text>
        <Text variant="caption" tone="muted" numeric>{currentPoints.toLocaleString()} pts</Text>
      </View>

      {/* Current rank progress card */}
      <Card padding="lg">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden' }}>
            <LinearGradient
              colors={current.gradient}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text weight="black" style={{ color: '#0B0B0B', fontSize: 18 }}>
                {current.label.charAt(0)}
              </Text>
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text weight="bold" style={{ fontSize: 17 }}>{current.label}</Text>
            {next ? (
              <Text variant="caption" tone="muted">
                {currentPoints}/{next.min} pts → {next.label}
              </Text>
            ) : (
              <Text variant="caption" tone="accent">Rango máximo alcanzado</Text>
            )}
          </View>
        </View>
        {next && (
          <View
            style={{
              height: 6,
              backgroundColor: colors.bg.elevated,
              borderRadius: radius.full,
              marginTop: spacing.md,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={current.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: '100%',
                width: `${progressToNext * 100}%`,
                borderRadius: radius.full,
              }}
            />
          </View>
        )}
      </Card>

      {/* All ranks timeline — horizontal scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs, paddingRight: spacing.sm }}>
          {RANKS.map((rank) => {
            const isCurrent = rank.id === current.id;
            const isAchieved = currentPoints >= rank.min;
            return (
              <View
                key={rank.id}
                style={{
                  width: 72,
                  alignItems: 'center',
                  opacity: isAchieved ? 1 : 0.4,
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    overflow: 'hidden',
                    borderWidth: isCurrent ? 2.5 : 1,
                    borderColor: isCurrent ? rank.color : colors.border,
                  }}
                >
                  <LinearGradient
                    colors={rank.gradient}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {isAchieved ? (
                      <Text weight="black" style={{ color: '#0B0B0B', fontSize: 15 }}>
                        {rank.label.charAt(0)}
                      </Text>
                    ) : (
                      <Icon name="lock" size={14} color="#0B0B0B" />
                    )}
                  </LinearGradient>
                </View>
                <Text
                  variant="caption"
                  weight={isCurrent ? 'bold' : 'regular'}
                  style={{ marginTop: spacing.xs, textAlign: 'center', fontSize: 11 }}
                >
                  {rank.label}
                </Text>
                <Text
                  variant="caption"
                  tone={isCurrent ? 'accent' : 'muted'}
                  style={{ fontSize: 9, textAlign: 'center' }}
                >
                  {isCurrent ? 'ACTUAL' : isAchieved ? '✓' : `${rank.min >= 1000 ? `${rank.min / 1000}k` : rank.min}pts`}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function LeaderboardSection({
  rankId,
  entries,
  loading,
  isError,
  currentUserId,
}: {
  rankId: RankId;
  entries: LeaderboardEntry[];
  loading: boolean;
  isError: boolean;
  currentUserId?: string;
}) {
  const rankInfo = RANKS.find((r) => r.id === rankId) ?? RANKS[0];

  return (
    <View style={{ marginTop: spacing.xl, gap: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="heading">Leaderboard</Text>
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            borderRadius: radius.full,
            backgroundColor: `${rankInfo.color}22`,
            borderWidth: 1,
            borderColor: `${rankInfo.color}44`,
          }}
        >
          <Text variant="caption" weight="bold" style={{ color: rankInfo.color }}>
            {rankInfo.label}
          </Text>
        </View>
      </View>

      <Card padding="md">
        {loading ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text variant="caption" tone="muted">Cargando leaderboard…</Text>
          </View>
        ) : isError || entries.length === 0 ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Icon name="trophy" size={28} color={colors.text.muted} />
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              Sin datos para este rango
            </Text>
          </View>
        ) : (
          <View>
            {entries.map((entry, i) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                position={i + 1}
                isMe={entry.id === currentUserId}
                showDivider={i < entries.length - 1}
              />
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

function LeaderboardRow({
  entry,
  position,
  isMe,
  showDivider,
}: {
  entry: LeaderboardEntry;
  position: number;
  isMe: boolean;
  showDivider: boolean;
}) {
  const entryRankColor = RANKS.find((r) => r.id === entry.currentRank)?.color ?? colors.text.muted;
  const posColor =
    position === 1 ? '#FFD700'
    : position === 2 ? '#C0C0C0'
    : position === 3 ? '#CD7F32'
    : colors.text.muted;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.border,
        backgroundColor: isMe ? colors.primary.muted : 'transparent',
        borderRadius: isMe ? radius.md : 0,
      }}
    >
      <Text
        weight="bold"
        numeric
        style={{ width: 28, color: posColor, textAlign: 'center', fontSize: 13 }}
      >
        {position}
      </Text>
      <Avatar
        uri={entry.avatarUrl}
        name={entry.displayName}
        size={36}
        borderColor={entryRankColor}
      />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text weight="semibold" numberOfLines={1}>
          {entry.displayName}{isMe ? ' (tú)' : ''}
        </Text>
        <Text variant="caption" tone="muted">@{entry.username}</Text>
      </View>
      <Text variant="caption" weight="bold" numeric style={{ color: entryRankColor }}>
        {entry.rankPoints.toLocaleString()}
      </Text>
    </View>
  );
}
