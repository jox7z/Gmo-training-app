/**
 * WeightDetailModal — ventana extendida del chart de peso.
 *
 * Muestra el gráfico a tamaño completo con filtro de período
 * (7d / 30d / 90d / Todo) y estadísticas detalladas del rango.
 */

import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { WeightChart } from '@/components/WeightChart';
import { colors, radius, spacing } from '@/theme/tokens';
import { useBodyTimeline, type BodyPeriod } from '@/lib/queries/body';
import { toDisplay } from '@/lib/units';
import type { Unit } from '@/store/app';

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
  const { data: rawData = [], isLoading } = useBodyTimeline(period);

  // Los datos llegan en orden ascendente desde el RPC (0018).
  const data = rawData;

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const weights = data.map((p) => toDisplay(p.weightKg, unit));
    const first = weights[0];
    const last = weights[weights.length - 1];
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    const delta = last - first;
    const deltaPct = first !== 0 ? (delta / first) * 100 : 0;

    // Datos avanzados: mostrar si al menos un punto los tiene.
    const hasFat = data.some((p) => p.bodyFatPct !== undefined);
    const hasMuscle = data.some((p) => p.musclePct !== undefined);
    const hasWater = data.some((p) => p.waterPct !== undefined);

    const latestFat = hasFat
      ? [...data].reverse().find((p) => p.bodyFatPct !== undefined)?.bodyFatPct
      : undefined;
    const latestMuscle = hasMuscle
      ? [...data].reverse().find((p) => p.musclePct !== undefined)?.musclePct
      : undefined;
    const latestWater = hasWater
      ? [...data].reverse().find((p) => p.waterPct !== undefined)?.waterPct
      : undefined;

    return {
      count: data.length,
      first,
      last,
      delta,
      deltaPct,
      min,
      max,
      avg,
      latestFat,
      latestMuscle,
      latestWater,
      dateFirst: data[0].recordedAt,
      dateLast: data[data.length - 1].recordedAt,
    };
  }, [data, unit]);

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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            gap: spacing.md,
          }}
        >
          <Text variant="heading" style={{ flex: 1 }}>
            Evolución del peso
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
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
              <Icon name="close" size={16} color={colors.text.primary} />
            </View>
          </Pressable>
        </View>

        {/* Filtro de período */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: spacing.lg,
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
                <Text
                  weight="bold"
                  tone={active ? 'primary' : 'secondary'}
                  style={{ fontSize: 13 }}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
        >
          {/* Chart grande */}
          <Card padding={0} style={{ padding: spacing.lg }}>
            <Text variant="label" tone="secondary" style={{ marginBottom: spacing.md }}>
              PESO ({unit})
            </Text>
            {isLoading ? (
              <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="caption" tone="muted">Cargando…</Text>
              </View>
            ) : (
              <WeightChart
                data={data}
                unit={unit}
                chartWidth={chartWidth - spacing.lg * 2}
                chartHeight={220}
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
                  value={`${stats.last.toFixed(1)} ${unit}`}
                  valueStyle={{ color: colors.text.primary }}
                />
                <StatCard
                  label="Inicial"
                  value={`${stats.first.toFixed(1)} ${unit}`}
                  valueStyle={{ color: colors.text.secondary }}
                />
                <StatCard
                  label="Delta"
                  value={`${stats.delta >= 0 ? '+' : ''}${stats.delta.toFixed(1)} ${unit}`}
                  sub={`${stats.deltaPct >= 0 ? '+' : ''}${stats.deltaPct.toFixed(1)}%`}
                  valueStyle={{ color: deltaColor }}
                />
              </View>

              {/* Fila secundaria: min / max / media */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <StatCard
                  label="Mínimo"
                  value={`${stats.min.toFixed(1)} ${unit}`}
                />
                <StatCard
                  label="Máximo"
                  value={`${stats.max.toFixed(1)} ${unit}`}
                />
                <StatCard
                  label="Media"
                  value={`${stats.avg.toFixed(1)} ${unit}`}
                />
              </View>

              {/* Mediciones totales */}
              <Card padding="md">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="muted">Mediciones en el período</Text>
                  <Text weight="bold" numeric>{stats.count}</Text>
                </View>
              </Card>

              {/* Composición corporal (si hay datos) */}
              {(stats.latestFat !== undefined ||
                stats.latestMuscle !== undefined ||
                stats.latestWater !== undefined) && (
                <Card padding="lg">
                  <Text
                    variant="label"
                    tone="secondary"
                    style={{ marginBottom: spacing.md }}
                  >
                    COMPOSICIÓN (ÚLTIMA MEDICIÓN CON DATOS)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    {stats.latestFat !== undefined && (
                      <MiniStat label="Grasa" value={`${stats.latestFat.toFixed(1)}%`} />
                    )}
                    {stats.latestMuscle !== undefined && (
                      <MiniStat label="Músculo" value={`${stats.latestMuscle.toFixed(1)}%`} />
                    )}
                    {stats.latestWater !== undefined && (
                      <MiniStat label="Agua" value={`${stats.latestWater.toFixed(1)}%`} />
                    )}
                  </View>
                </Card>
              )}

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
                  {[...data].reverse().map((p, i) => {
                    const w = toDisplay(p.weightKg, unit);
                    return (
                      <View
                        key={p.recordedAt}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: spacing.xs,
                          borderBottomWidth: i < data.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text variant="caption" tone="muted">
                          {formatDateEs(p.recordedAt)}
                        </Text>
                        <Text weight="bold" numeric>
                          {w.toFixed(1)} {unit}
                        </Text>
                      </View>
                    );
                  })}
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
                Sin datos para este período
              </Text>
            </Card>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text weight="bold" numeric style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}
