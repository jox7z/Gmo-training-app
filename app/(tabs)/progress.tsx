import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, RefreshControl, useWindowDimensions, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Rect, Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing, RANKS, rankFromPoints, nextRank, type RankId } from '@/theme/tokens';
import { useAppStore, type Unit } from '@/store/app';
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
} from '@/lib/queries/body';
import { toDisplay } from '@/lib/units';
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

  const [period, setPeriod] = useState<ProgressPeriod>('30d');

  const summaryQuery = useProgressSummary(period);
  const timelineQuery = useProgressTimeline(period);
  const bodyMeasurementsQuery = useBodyMeasurements();
  const bodyTimelineQuery = useBodyTimeline('90d');

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
            <StatsGrid summary={summary} unit={profile?.unit ?? 'kg'} />
            <AveragesCard summary={summary} />
            <WorkoutsPerWeekCard
              workoutsPerWeek={summary.workoutsPerWeek}
              goal={profile?.weeklyGoalDays ?? 4}
            />
            <TimelineCard
              data={timelineQuery.data ?? []}
              loading={timelineQuery.isLoading && !timelineQuery.data}
            />
          </>
        )}

        <BodySection
          measurements={bodyMeasurementsQuery.data ?? []}
          timeline={bodyTimelineQuery.data ?? []}
          unit={profile?.unit ?? 'kg'}
          onAdd={() => router.push('/body/new')}
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

function StatsGrid({ summary, unit }: { summary: ProgressSummary; unit: 'kg' | 'lb' }) {
  const items = [
    { label: 'Tiempo activo', value: formatDuration(summary.totalActiveSeconds), icon: 'clock' as const, tone: colors.primary.DEFAULT },
    { label: 'Repeticiones', value: summary.totalReps.toLocaleString(), icon: 'muscle' as const, tone: colors.accent.DEFAULT },
    { label: 'Peso movido', value: formatWeight(summary.totalWeightKg, unit), icon: 'dumbbell' as const, tone: colors.info.DEFAULT },
    { label: 'Descanso total', value: formatDuration(summary.totalRestSeconds), icon: 'route' as const, tone: colors.warning },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {items.map((it) => (
        <Card
          key={it.label}
          padding="lg"
          style={{ width: '47%', flexGrow: 1 }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${it.tone}22`,
              marginBottom: spacing.sm,
            }}
          >
            <Icon name={it.icon} size={18} color={it.tone} />
          </View>
          <Text variant="caption" tone="muted">{it.label}</Text>
          <Text variant="heading" weight="bold" numeric style={{ marginTop: 2 }}>
            {it.value}
          </Text>
        </Card>
      ))}
    </View>
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

function WorkoutsPerWeekCard({ workoutsPerWeek, goal }: { workoutsPerWeek: number; goal: number }) {
  const pct = goal > 0 ? Math.min(1, workoutsPerWeek / goal) : 0;
  return (
    <Card padding="lg">
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text variant="label" tone="secondary">WORKOUTS POR SEMANA</Text>
        <Text variant="caption" tone="muted" numeric>
          meta {goal}/sem
        </Text>
      </View>
      <Text variant="metric" tone="brand" numeric style={{ marginTop: spacing.sm }}>
        {workoutsPerWeek.toFixed(1)}
      </Text>
      <View
        style={{
          height: 8,
          backgroundColor: colors.bg.elevated,
          borderRadius: radius.full,
          marginTop: spacing.md,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            backgroundColor: pct >= 1 ? colors.success : colors.primary.DEFAULT,
          }}
        />
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

function BodySection({
  measurements,
  timeline,
  unit,
  onAdd,
}: {
  measurements: BodyMeasurement[];
  timeline: BodyTimelinePoint[];
  unit: Unit;
  onAdd: () => void;
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
        <Text variant="heading">Composición corporal</Text>
      </View>

      <Button
        title="Registrar medición"
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
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.lg * 4;
  const chartHeight = 160;
  const axisPad = 32;
  const innerW = chartWidth - axisPad;
  const innerH = chartHeight - 28;

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)),
    [data],
  );

  const range = useMemo(() => {
    if (sorted.length === 0) return { min: 0, max: 1 };
    const weights = sorted.map((p) => toDisplay(p.weightKg, unit));
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    if (min === max) return { min: min - 1, max: max + 1 };
    const pad = (max - min) * 0.15;
    return { min: min - pad, max: max + pad };
  }, [sorted, unit]);

  if (sorted.length < 2) {
    return (
      <Card padding="lg">
        <Text variant="label" tone="secondary">EVOLUCIÓN DEL PESO</Text>
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <Icon name="chart" size={28} color={colors.text.muted} />
          <Text
            variant="caption"
            tone="muted"
            style={{ marginTop: spacing.sm, textAlign: 'center' }}
          >
            Registra al menos 2 mediciones para ver tu evolución.
          </Text>
        </View>
      </Card>
    );
  }

  const xFor = (i: number) =>
    axisPad + (sorted.length === 1 ? innerW / 2 : (i / (sorted.length - 1)) * innerW);
  const yFor = (w: number) => {
    const t = (w - range.min) / (range.max - range.min);
    return chartHeight - 16 - t * innerH;
  };

  const points = sorted.map((p, i) => ({
    x: xFor(i),
    y: yFor(toDisplay(p.weightKg, unit)),
    raw: p,
  }));
  const pathD = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  return (
    <Card padding="lg">
      <Text variant="label" tone="secondary">EVOLUCIÓN DEL PESO ({unit})</Text>
      <View style={{ marginTop: spacing.md }}>
        <Svg width={chartWidth} height={chartHeight}>
          <SvgText x={0} y={14} fontSize={10} fill={colors.text.muted}>
            {range.max.toFixed(1)}
          </SvgText>
          <SvgText x={0} y={chartHeight - 16} fontSize={10} fill={colors.text.muted}>
            {range.min.toFixed(1)}
          </SvgText>
          <Line
            x1={axisPad}
            x2={chartWidth}
            y1={chartHeight - 16}
            y2={chartHeight - 16}
            stroke={colors.border}
            strokeWidth={1}
          />
          <Path d={pathD} stroke={colors.primary.DEFAULT} strokeWidth={2} fill="none" />
          {points.map((pt, i) => (
            <Circle key={i} cx={pt.x} cy={pt.y} r={3} fill={colors.primary.DEFAULT} />
          ))}
        </Svg>
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
        {formatDate(sorted[0].recordedAt)} → {formatDate(sorted[sorted.length - 1].recordedAt)}
      </Text>
    </Card>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
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
