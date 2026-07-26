import { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
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

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);

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
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
          Rendimiento real y peso corporal
        </Text>
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
        <ProgressInsightsSection
          history={history}
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
        <View>
          <Text variant="heading">Peso corporal</Text>
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
            Seguimiento de tus mediciones
          </Text>
        </View>
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
              width: 36,
              height: 36,
              borderRadius: radius.sm,
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

      <SegmentedControl
        options={BODY_PERIODS}
        value={bodyPeriod}
        onValueChange={onBodyPeriodChange}
        accessibilityLabel="Rango del peso corporal"
        haptic={false}
      />

      <Button
        title="Registrar peso de hoy"
        leftIcon={<Icon name="scale" size={18} color="#fff" />}
        onPress={onAdd}
        fullWidth
      />

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
                borderRadius: radius.sm,
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
