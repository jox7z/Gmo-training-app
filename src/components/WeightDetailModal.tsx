/**
 * WeightDetailModal — hoja extendida del chart de peso.
 *
 * Muestra el gráfico a tamaño completo con filtro de período
 * (7d / 30d / 90d / Todo) y estadísticas detalladas del rango.
 * Vive sobre AppBottomSheet; el gesto de arrastre sobre el contenido está
 * deshabilitado para no pelear con el long-press del tooltip del chart.
 */

import { useState, useMemo } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { WeightChart } from '@/components/WeightChart';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { colors, radius, spacing } from '@/theme/tokens';
import { useBodyTimeline, type BodyPeriod, type BodyTimelinePoint } from '@/lib/queries/body';
import { toDisplay } from '@/lib/units';
import type { Unit } from '@/store/app';

type Metric = 'weight' | 'muscle' | 'water' | 'fat';

const METRIC_OPTIONS: { value: Metric; label: string; unit: string }[] = [
  { value: 'weight', label: 'Peso (kg)', unit: 'kg' },
  { value: 'muscle', label: 'Músculo (%)', unit: '%' },
  { value: 'water', label: 'Agua (%)', unit: '%' },
  { value: 'fat', label: 'Grasa (%)', unit: '%' },
];

function getMetricValue(p: BodyTimelinePoint, metric: Metric, unit: Unit): number | undefined {
  switch (metric) {
    case 'weight': return toDisplay(p.weightKg, unit);
    case 'muscle': return p.musclePct;
    case 'water': return p.waterPct;
    case 'fat': return p.bodyFatPct;
  }
}

const METRIC_NAMES: Record<Metric, string> = {
  weight: 'peso',
  muscle: 'músculo',
  water: 'agua',
  fat: 'grasa',
};

const PERIODS: { value: BodyPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'Todo' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  unit: Unit;
  /** Período activo del padre; se usa como período inicial del modal. */
  initialPeriod?: BodyPeriod;
}

function formatDateEs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function WeightDetailModal({ visible, onClose, unit, initialPeriod = '90d' }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [period, setPeriod] = useState<BodyPeriod>(initialPeriod);
  const [metric, setMetric] = useState<Metric>('weight');
  const [metricOpen, setMetricOpen] = useState(false);
  const { data: rawData = [], isLoading } = useBodyTimeline(period);

  // Los datos llegan en orden ascendente desde el RPC (0018).
  const data = rawData;

  // Puntos filtrados para la métrica seleccionada (excluir undefined)
  const metricPoints = useMemo(
    () =>
      data
        .map((p) => {
          const v = getMetricValue(p, metric, unit);
          if (v === undefined) return null;
          return { ms: new Date(p.recordedAt).getTime(), value: v, recordedAt: p.recordedAt };
        })
        .filter((x): x is { ms: number; value: number; recordedAt: string } => x !== null),
    [data, metric, unit],
  );

  const currentMetricOpt = METRIC_OPTIONS.find((o) => o.value === metric)!;

  const stats = useMemo(() => {
    if (metricPoints.length === 0) return null;
    const values = metricPoints.map((p) => p.value);
    const first = values[0];
    const last = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const delta = last - first;
    const deltaPct = first !== 0 ? (delta / first) * 100 : 0;

    return {
      count: metricPoints.length,
      first,
      last,
      delta,
      deltaPct,
      min,
      max,
      avg,
      dateFirst: metricPoints[0].recordedAt,
      dateLast: metricPoints[metricPoints.length - 1].recordedAt,
    };
  }, [metricPoints]);

  // El chart ocupa ancho de pantalla menos padding del modal (2 * lg).
  const chartWidth = screenWidth - spacing.lg * 2;

  const deltaColor =
    stats === null
      ? colors.text.muted
      : stats.delta < 0
      ? colors.success
      : stats.delta > 0
      ? colors.danger
      : colors.text.muted;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['80%']}
      enableContentPanningGesture={false}
      title="Evolución del peso"
    >
        {/* Filtro de período */}
        <SegmentedControl
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}
        />

        {/* Selector de métrica — desplegable */}
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginTop: spacing.sm,
            zIndex: 10,
          }}
        >
          <Pressable
            onPress={() => setMetricOpen((o) => !o)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: 10,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: metricOpen ? colors.primary.DEFAULT : colors.border,
              backgroundColor: pressed ? colors.bg.elevated : colors.bg.card,
            })}
          >
            <Icon name="chart" size={15} color={colors.text.secondary} />
            <Text variant="caption" weight="bold" style={{ flex: 1, color: colors.text.primary }}>
              {currentMetricOpt.label}
            </Text>
            <View style={{ transform: [{ rotate: metricOpen ? '-90deg' : '90deg' }] }}>
              <Icon name="chevron-right" size={16} color={colors.text.muted} />
            </View>
          </Pressable>

          {metricOpen && (
            <View
              style={{
                marginTop: spacing.xs,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.bg.card,
                overflow: 'hidden',
              }}
            >
              {METRIC_OPTIONS.map((opt, i) => {
                const active = metric === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      setMetric(opt.value);
                      setMetricOpen(false);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 11,
                      borderBottomWidth: i < METRIC_OPTIONS.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      backgroundColor: pressed
                        ? colors.bg.elevated
                        : active
                        ? colors.primary.muted
                        : 'transparent',
                    })}
                  >
                    <Text
                      variant="caption"
                      weight={active ? 'bold' : 'semibold'}
                      style={{ flex: 1, color: active ? colors.primary.DEFAULT : colors.text.secondary }}
                    >
                      {opt.label}
                    </Text>
                    {active && <Icon name="check" size={15} color={colors.primary.DEFAULT} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <BottomSheetScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
        >
          {/* Chart grande */}
          <Card padding={0} style={{ padding: spacing.lg }}>
            <Text variant="label" tone="secondary" style={{ marginBottom: spacing.md }}>
              {currentMetricOpt.label.toUpperCase()}
            </Text>
            {isLoading ? (
              <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="caption" tone="muted">Cargando…</Text>
              </View>
            ) : metric === 'weight' ? (
              <WeightChart
                data={data}
                unit={unit}
                chartWidth={chartWidth - spacing.lg * 2}
                chartHeight={220}
              />
            ) : (
              <TimeSeriesChart
                data={metricPoints}
                chartWidth={chartWidth - spacing.lg * 2}
                chartHeight={220}
                formatLabel={(v) => `${v.toFixed(1)}%`}
                emptyMessage={`Sin registros de ${METRIC_NAMES[metric]} para este período.`}
              />
            )}
            {stats && (
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: spacing.sm, textAlign: 'center' }}
              >
                {formatDateEs(stats.dateFirst)} → {formatDateEs(stats.dateLast)}
              </Text>
            )}
          </Card>

          {/* Estadísticas del período */}
          {stats ? (
            <>
              {/* Fila principal: actual / inicial / delta */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <StatCard
                  label="Actual"
                  value={`${stats.last.toFixed(1)} ${currentMetricOpt.unit}`}
                  valueStyle={{ color: colors.text.primary }}
                />
                <StatCard
                  label="Inicial"
                  value={`${stats.first.toFixed(1)} ${currentMetricOpt.unit}`}
                  valueStyle={{ color: colors.text.secondary }}
                />
                <StatCard
                  label="Delta"
                  value={`${stats.delta >= 0 ? '+' : ''}${stats.delta.toFixed(1)} ${currentMetricOpt.unit}`}
                  sub={`${stats.deltaPct >= 0 ? '+' : ''}${stats.deltaPct.toFixed(1)}%`}
                  valueStyle={{ color: deltaColor }}
                />
              </View>

              {/* Fila secundaria: min / max / media */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <StatCard
                  label="Mínimo"
                  value={`${stats.min.toFixed(1)} ${currentMetricOpt.unit}`}
                />
                <StatCard
                  label="Máximo"
                  value={`${stats.max.toFixed(1)} ${currentMetricOpt.unit}`}
                />
                <StatCard
                  label="Media"
                  value={`${stats.avg.toFixed(1)} ${currentMetricOpt.unit}`}
                />
              </View>

              {/* Mediciones totales */}
              <Card padding="md">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="muted">Mediciones en el período</Text>
                  <Text weight="bold" numeric>{stats.count}</Text>
                </View>
              </Card>

              {/* Lista de puntos */}
              <Card padding="lg">
                <Text
                  variant="label"
                  tone="secondary"
                  style={{ marginBottom: spacing.md }}
                >
                  MEDICIONES
                </Text>
                <View style={{ gap: spacing.sm }}>
                  {[...metricPoints].reverse().map((p, i) => (
                    <View
                      key={p.recordedAt}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: spacing.xs,
                        borderBottomWidth: i < metricPoints.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text variant="caption" tone="muted">
                        {formatDateEs(p.recordedAt)}
                      </Text>
                      <Text weight="bold" numeric>
                        {p.value.toFixed(1)} {currentMetricOpt.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : !isLoading ? (
            <Card padding="lg" style={{ alignItems: 'center' }}>
              <Icon name="chart" size={28} color={colors.text.muted} />
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: spacing.sm, textAlign: 'center' }}
              >
                Sin registros de {METRIC_NAMES[metric]} para este período
              </Text>
            </Card>
          ) : null}
        </BottomSheetScrollView>
    </AppBottomSheet>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueStyle,
}: {
  label: string;
  value: string;
  sub?: string;
  valueStyle?: object;
}) {
  return (
    <Card padding="md" style={{ flex: 1 }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text weight="bold" numeric style={[{ marginTop: 2, fontSize: 14 }, valueStyle]}>
        {value}
      </Text>
      {sub !== undefined && (
        <Text variant="caption" tone="muted" numeric style={{ fontSize: 11 }}>
          {sub}
        </Text>
      )}
    </Card>
  );
}

