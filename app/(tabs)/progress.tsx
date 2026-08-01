import { useMemo, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Stat } from '@/components/ui/Stat';
import { WeightChart } from '@/components/WeightChart';
import { WeightDetailModal } from '@/components/WeightDetailModal';
import { colors, radius, spacing } from '@/theme/tokens';
import { useAppStore, type Unit } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import {
  formatWeight,
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
import { ProgressInsightsSection } from '@/components/progress/ProgressInsightsSection';
import { MonthlyTrainingCalendar } from '@/components/progress/MonthlyTrainingCalendar';
import { MuscleMilestoneMap } from '@/components/progress/MuscleMilestoneMap';
import { StaticPullToRefresh } from '@/components/feed/StaticPullToRefresh';

const GMO_BODY_WEIGHT = require('../../assets/brand/gmo-body-weight.webp');

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const streakWeeks = useAppStore((s) => s.streakWeeks);
  const daysThisWeek = useAppStore((s) => s.daysThisWeek);

  const [bodyPeriod, setBodyPeriod] = useState<BodyPeriod>('90d');
  const [showDetailModal, setShowDetailModal] = useState(false);

  const history = useWorkoutsStore((s) => s.history);

  const bodyMeasurementsQuery = useBodyMeasurements();
  const bodyTimelineQuery = useBodyTimeline(bodyPeriod);

  const refreshing =
    bodyMeasurementsQuery.isRefetching ||
    bodyTimelineQuery.isRefetching;
  const onRefresh = () => {
    bodyMeasurementsQuery.refetch();
    bodyTimelineQuery.refetch();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      <ScreenHeader
        title="Progreso"
        showBack={false}
        border
        style={{ backgroundColor: colors.bg.base }}
      />

      <StaticPullToRefresh
        refreshing={refreshing}
        onRefresh={onRefresh}
        label="Actualizando progreso"
      >
        {(pullProps) => (
      <ScrollView
        {...pullProps}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: spacing.md,
        }}
      >
        <MonthlyTrainingCalendar
          history={history}
          streakWeeks={streakWeeks}
          daysThisWeek={daysThisWeek}
          weeklyGoalDays={profile?.weeklyGoalDays ?? 4}
        />

        <ProgressInsightsSection
          history={history}
          unit={profile?.unit ?? 'kg'}
        />

        <MuscleMilestoneMap
          history={history}
          gender={profile?.sex ?? 'male'}
          unit={profile?.unit ?? 'kg'}
        />

        <BodySection
          measurements={bodyMeasurementsQuery.data ?? []}
          timeline={bodyTimelineQuery.data ?? []}
          measurementsLoading={
            bodyMeasurementsQuery.isLoading && bodyMeasurementsQuery.data === undefined
          }
          timelineLoading={
            bodyTimelineQuery.isLoading && bodyTimelineQuery.data === undefined
          }
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

      </ScrollView>
        )}
      </StaticPullToRefresh>
    </SafeAreaView>
  );
}

// =====================================================
// COMPOSICIÓN CORPORAL
// =====================================================

const BODY_PERIODS = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'Todo' },
] as const satisfies readonly { value: BodyPeriod; label: string }[];

function BodySection({
  measurements,
  timeline,
  measurementsLoading,
  timelineLoading,
  unit,
  bodyPeriod,
  onBodyPeriodChange,
  onAdd,
  onOpenDetail,
}: {
  measurements: BodyMeasurement[];
  timeline: BodyTimelinePoint[];
  measurementsLoading: boolean;
  timelineLoading: boolean;
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
        <Text variant="heading">Peso corporal</Text>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Abrir detalle del peso corporal"
          accessibilityHint="Muestra todas tus mediciones y su evolución"
          onPress={onOpenDetail}
          hitSlop={8}
          pressScale={0.9}
          haptic={false}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.sm,
              backgroundColor: colors.bg.elevated,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="chart" size={18} color={colors.text.secondary} />
          </View>
        </PressableScale>
      </View>

      <SegmentedControl
        options={BODY_PERIODS}
        value={bodyPeriod}
        onValueChange={onBodyPeriodChange}
        accessibilityLabel="Rango del peso corporal"
        haptic={false}
      />

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Registrar peso corporal"
        accessibilityHint="Abre el registro de una nueva medición de peso"
        onPress={onAdd}
        pressScale={0.98}
        style={{
          minHeight: 96,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderEmber,
          backgroundColor: colors.bg.elevated,
        }}
      >
        <Image
          source={GMO_BODY_WEIGHT}
          contentFit="contain"
          accessible={false}
          style={{ width: 92, height: 82 }}
        />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="heading" weight="black">Registrar peso</Text>
          <Text variant="caption" tone="secondary">
            Añade una medición a tu historial corporal.
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.accent.DEFAULT} />
      </PressableScale>

      {measurementsLoading ? (
        <SkeletonGroup
          accessibilityLabel="Cargando mediciones de peso corporal"
        >
          <Card variant="section" padding="lg" style={{ gap: spacing.md }}>
            <Skeleton width="38%" height={12} />
            <Skeleton width="56%" height={38} />
            <Skeleton width="30%" height={12} />
          </Card>
        </SkeletonGroup>
      ) : null}

      {!measurementsLoading && latest && (
        <Card variant="section" padding="lg">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text variant="label" tone="secondary">Última medición</Text>
              <Text variant="metric" numeric style={{ marginTop: spacing.xs }}>
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
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceVeil,
              }}
            >
              <Icon name="scale" size={22} color={colors.text.secondary} />
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
                <Stat
                  label="Grasa"
                  value={`${latest.bodyFatPct.toFixed(1)}%`}
                  size="sm"
                  style={{ flex: 1 }}
                />
              )}
              {latest.musclePct !== undefined && (
                <Stat
                  label="Músculo"
                  value={`${latest.musclePct.toFixed(1)}%`}
                  size="sm"
                  style={{ flex: 1 }}
                />
              )}
              {latest.waterPct !== undefined && (
                <Stat
                  label="Agua"
                  value={`${latest.waterPct.toFixed(1)}%`}
                  size="sm"
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}
        </Card>
      )}

      {timelineLoading ? (
        <SkeletonGroup accessibilityLabel="Cargando evolución del peso corporal">
          <Card variant="section" padding="lg" style={{ gap: spacing.md }}>
            <Skeleton width="52%" height={12} />
            <Skeleton height={176} />
          </Card>
        </SkeletonGroup>
      ) : (
        <WeightTimelineCard data={timeline} unit={unit} />
      )}

      {!measurementsLoading && recent.length > 0 && (
        <Card variant="section" padding="lg">
          <Text variant="label" tone="secondary" style={{ marginBottom: spacing.md }}>
            Últimas mediciones
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
  const accessibleDetails = [
    formatWeight(measurement.weightKg, unit),
    formatDate(measurement.recordedAt),
    measurement.bodyFatPct !== undefined
      ? `${measurement.bodyFatPct.toFixed(1)} por ciento de grasa`
      : null,
    measurement.musclePct !== undefined
      ? `${measurement.musclePct.toFixed(1)} por ciento de músculo`
      : null,
  ]
    .filter(Boolean)
    .join(', ');

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
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibleDetails}
      accessibilityHint="Abre opciones para borrar esta medición"
      onPress={handleLongPress}
      pressScale={0.99}
      haptic={false}
      style={{
        paddingVertical: spacing.sm,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.border,
      }}
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
    </PressableScale>
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
    <Card variant="section" padding="lg">
      <Text variant="label" tone="secondary">Evolución del peso · {unit}</Text>
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
