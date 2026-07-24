import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, RefreshControl, useWindowDimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BarChart, type barDataItem } from 'react-native-gifted-charts';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { WeightChart } from '@/components/WeightChart';
import { WeightDetailModal } from '@/components/WeightDetailModal';
import { TimeSeriesChart, type TimeSeriesPoint } from '@/components/TimeSeriesChart';
import { ExerciseDetailSheet } from '@/components/ExerciseDetailSheet';
import { WeeklyMuscleHeatmapCard } from '@/components/WeeklyMuscleHeatmapCard';
import { colors, radius, spacing, RANKS, rankFromPoints, nextRank, podiumColor, type RankId } from '@/theme/tokens';
import { RANK_IMAGES } from '@/theme/rankImages';
import { useAppStore, type Unit } from '@/store/app';
import { StreakRing } from '@/components/StreakRing';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkoutsStore } from '@/store/workouts';
import { listTrainedExercises, buildExerciseTimeline } from '@/lib/exerciseProgress';
import { weekStreakFromHistory, daysThisWeekFromHistory } from '@/lib/achievements';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { EmptyProgressIllustration } from '@/components/illustrations';
import { ErrorState } from '@/components/ui/ErrorState';
import { useQueryState } from '@/lib/queryState';
import { goToTab, TAB_INDEX } from '@/lib/tabsNav';

const PERIODS: { value: ProgressPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'Todo' },
];

const EXERCISE_METRIC_OPTIONS: { value: 'weight' | 'reps'; label: string }[] = [
  { value: 'weight', label: 'Peso' },
  { value: 'reps', label: 'Reps' },
];

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);

  const [period, setPeriod] = useState<ProgressPeriod>('30d');
  const [bodyPeriod, setBodyPeriod] = useState<BodyPeriod>('90d');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseMetric, setExerciseMetric] = useState<'weight' | 'reps'>('weight');

  const history = useWorkoutsStore((s) => s.history);
  const streakWeeks = useMemo(() => weekStreakFromHistory(history), [history]);
  const daysThisWeek = useMemo(() => daysThisWeekFromHistory(history), [history]);
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
        <SegmentedControl
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          style={{ marginTop: spacing.md }}
        />
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
        {summaryQuery.isLoading ? (
          <ProgressSkeleton />
        ) : summaryQuery.isError && !summary ? (
          <ErrorState
            title="No se pudo cargar tu progreso"
            onRetry={() => summaryQuery.refetch()}
          />
        ) : !summary || summary.totalWorkouts === 0 ? (
          <EmptyState
            icon="dumbbell"
            tone="primary"
            illustration={<EmptyProgressIllustration />}
            title="Aún no tienes entrenamientos"
            subtitle="Empieza tu primer workout para ver tu progreso aquí."
            action={{ label: 'Empezar entreno', onPress: () => goToTab(TAB_INDEX.routines) }}
          />
        ) : (
          <>
            <AveragesCard summary={summary} />
            <Card variant="raised" padding="lg" style={{ alignItems: 'center' }}>
              <StreakRing
                weeks={streakWeeks}
                daysThisWeek={daysThisWeek}
                weeklyGoal={profile?.weeklyGoalDays ?? 4}
              />
            </Card>
            <TimelineCard
              data={timelineQuery.data ?? []}
              loading={timelineQuery.isLoading && !timelineQuery.data}
              isError={timelineQuery.isError}
              onRetry={() => timelineQuery.refetch()}
            />
            <WeeklyMuscleHeatmapCard history={history} sex={profile?.sex} />
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

        <ExerciseDetailSheet
          visible={showExerciseModal}
          onClose={() => setShowExerciseModal(false)}
          unit={profile?.unit ?? 'kg'}
          initialExerciseId={effectivePinnedId}
          initialTab="history"
          showSelector
        />

        <RanksSection currentPoints={profile?.rankPoints ?? 0} />

        <LeaderboardSection
          rankId={currentRank.id}
          entries={leaderboardQuery.data ?? []}
          loading={leaderboardQuery.isLoading}
          isError={leaderboardQuery.isError}
          onRetry={() => leaderboardQuery.refetch()}
          currentUserId={profile?.id}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function AveragesCard({ summary }: { summary: ProgressSummary }) {
  return (
    <Card variant="raised" padding="lg">
      <Text variant="label" tone="secondary">PROMEDIOS POR SERIE</Text>
      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">Duración serie</Text>
          <Text variant="metric" numeric numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2 }}>
            {formatDuration(summary.avgSetDuration)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">Descanso entre series</Text>
          <Text variant="metric" numeric numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2 }}>
            {formatDuration(summary.avgRestAfter)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// Iniciales de día de la semana indexadas por Date.getDay() (0=domingo).
const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// `day` llega como "YYYY-MM-DD" del RPC; parseamos a fecha local para no
// desfasar el día de la semana por zona horaria.
function dayParts(day: string): { d: number; m: number; wd: number } {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return { d: d ?? 1, m: (m ?? 1) - 1, wd: dt.getDay() };
}

// Item de barra con campo extra `dateLabel` para el tooltip (gifted no lo tipa).
type TimelineBar = barDataItem & { dateLabel: string };

function TimelineCard({
  data,
  loading,
  isError,
  onRetry,
}: {
  data: { day: string; activeSeconds: number }[];
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const state = useQueryState({ isLoading: loading, isError, isEmpty: data.length === 0 });
  const { width } = useWindowDimensions();
  // 2x spacing.lg de padding externo del scroll + 2x spacing.lg padding interno de la Card
  const chartWidth = width - spacing.lg * 4;
  const chartHeight = 160;

  const maxMinutes = useMemo(() => {
    const max = data.reduce((m, p) => Math.max(m, p.activeSeconds / 60), 0);
    return max > 0 ? Math.ceil(max / 5) * 5 : 5;
  }, [data]);

  // Con muchos días las iniciales se solapan: mostramos una de cada `stride`
  // (7d → todas; 30d/90d → repartidas) para mantener el eje legible.
  const bars = useMemo<TimelineBar[]>(() => {
    const stride = Math.max(1, Math.ceil(data.length / 14));
    return data.map((p, i) => {
      const minutes = p.activeSeconds / 60;
      const { d, m, wd } = dayParts(p.day);
      return {
        value: minutes,
        label: i % stride === 0 ? DIAS_SEMANA[wd] ?? '' : '',
        frontColor: minutes > 0 ? colors.primary.DEFAULT : colors.bg.elevated,
        dateLabel: `${d} ${MESES_CORTOS[m]}`,
      };
    });
  }, [data]);

  // Ancho de barra ajustado al espacio disponible; gifted reparte el resto como
  // separación vía adjustToWidth.
  const barWidth = data.length > 0 ? Math.max(2, Math.floor((chartWidth / data.length) * 0.6)) : 0;

  return (
    <Card variant="raised" padding="lg">
      <Text variant="label" tone="secondary">EVOLUCIÓN · TIEMPO ACTIVO POR DÍA (min)</Text>
      <View style={{ marginTop: spacing.md }}>
        {state === 'loading' ? (
          <View style={{ height: chartHeight, justifyContent: 'center', alignItems: 'center' }}>
            <Text variant="caption" tone="muted">Cargando timeline…</Text>
          </View>
        ) : state === 'error' ? (
          <ErrorState title="No se pudo cargar el timeline." onRetry={onRetry} />
        ) : state === 'empty' ? (
          <View style={{ height: chartHeight, justifyContent: 'center', alignItems: 'center' }}>
            <Text variant="caption" tone="muted">Sin datos para este período</Text>
          </View>
        ) : (
          <View>
            <Text variant="caption" tone="muted" style={{ textAlign: 'right', marginBottom: spacing.xs }}>
              máx {maxMinutes} min
            </Text>
            <BarChart
              data={bars}
              width={chartWidth}
              height={120}
              barWidth={barWidth}
              minHeight={2}
              barBorderRadius={2}
              frontColor={colors.primary.DEFAULT}
              maxValue={maxMinutes}
              initialSpacing={spacing.xs}
              adjustToWidth
              disableScroll
              hideRules
              yAxisThickness={0}
              hideYAxisText
              yAxisLabelWidth={0}
              xAxisColor={colors.border}
              xAxisThickness={1}
              xAxisLabelTextStyle={{ color: colors.text.muted, fontSize: 10 }}
              renderTooltip={(item: TimelineBar) => (
                <View
                  style={{
                    width: 96,
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    marginBottom: spacing.xs,
                  }}
                >
                  <Text weight="bold" numeric>
                    {Math.round(item.value ?? 0)} min
                  </Text>
                  <Text variant="caption" tone="muted">
                    {item.dateLabel}
                  </Text>
                </View>
              )}
            />
          </View>
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

function ProgressSkeleton() {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padding="lg" style={{ width: '47%', flexGrow: 1, height: 110, gap: spacing.sm }}>
            <Skeleton width="55%" height={10} />
            <Skeleton width="75%" height={26} />
          </Card>
        ))}
      </View>
      <Card padding="lg" style={{ height: 100, gap: spacing.sm }}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="100%" height={40} />
      </Card>
      <Card padding="lg" style={{ height: 130, gap: spacing.sm }}>
        <Skeleton width="45%" height={12} />
        <Skeleton width="100%" height={60} />
      </Card>
      <Card padding="lg" style={{ height: 220, gap: spacing.sm }}>
        <Skeleton width="50%" height={12} />
        <Skeleton width="100%" height={150} />
      </Card>
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
        <PressableScale onPress={onOpenDetail} hitSlop={8} pressScale={0.9} haptic={false}>
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
        </PressableScale>
      </View>

      {/* Filtro de período para el chart de peso */}
      <SegmentedControl options={BODY_PERIODS} value={bodyPeriod} onChange={onBodyPeriodChange} />

      <Button
        title="Registrar peso de hoy"
        leftIcon={<Icon name="scale" size={18} color={colors.text.primary} />}
        onPress={onAdd}
        fullWidth
      />

      {latest && (
        <Card variant="raised" padding="lg">
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
    <Card variant="raised" padding="lg">
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
        <PressableScale onPress={onOpen} hitSlop={8} pressScale={0.9} haptic={false}>
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
        </PressableScale>
      </View>

      <PressableScale onPress={onOpen} pressScale={0.98} haptic={false}>
        <Card variant="raised" padding="lg">
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
            <SegmentedControl
              options={EXERCISE_METRIC_OPTIONS}
              value={metric}
              onChange={onMetricChange}
              fill={false}
            />
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
      </PressableScale>
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
      <Card variant="raised" padding="lg">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden' }}>
            <LinearGradient
              colors={current.gradient}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text weight="black" style={{ color: colors.bg.base, fontSize: 18 }}>
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
                    width: 56,
                    height: 56,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: isCurrent ? rank.color : 'transparent',
                    shadowOpacity: isCurrent ? 0.6 : 0,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: isCurrent ? 8 : 0,
                  }}
                >
                  <Image
                    source={RANK_IMAGES[rank.id]}
                    style={{ width: 52, height: 52 }}
                    contentFit="contain"
                    accessibilityLabel={`Rango ${rank.label}`}
                  />
                  {!isAchieved && (
                    <View
                      style={{
                        position: 'absolute',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="lock" size={16} color={colors.text.primary} />
                    </View>
                  )}
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
  onRetry,
  currentUserId,
}: {
  rankId: RankId;
  entries: LeaderboardEntry[];
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  currentUserId?: string;
}) {
  const rankInfo = RANKS.find((r) => r.id === rankId) ?? RANKS[0];
  const state = useQueryState({ isLoading: loading, isError, isEmpty: entries.length === 0 });

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

      <Card variant="raised" padding="md">
        {state === 'loading' ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text variant="caption" tone="muted">Cargando leaderboard…</Text>
          </View>
        ) : state === 'error' ? (
          <ErrorState title="No se pudo cargar el leaderboard." onRetry={onRetry} />
        ) : state === 'empty' ? (
          <EmptyState icon="trophy" title="Sin datos para este rango" />
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
  const posColor = podiumColor(position);

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
