/**
 * TimeSeriesChart — primitivo de línea para series temporales.
 *
 * Acepta puntos { ms: number; value: number }[] con Y autoescalada. Con menos
 * de 2 puntos muestra un estado vacío. Internamente usa react-native-gifted-charts
 * (LineChart) para tener ejes X, tooltips e interacción integrados.
 *
 * NOTA: gifted-charts espacia los puntos por índice (equidistantes), no de forma
 * proporcional al timestamp. Aceptamos esa divergencia respecto al SVG anterior a
 * cambio de un eje X con fechas, tooltip y curva con área.
 */

import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';
import { colors, radius, spacing } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/ui/Text';

export interface TimeSeriesPoint {
  ms: number;
  value: number;
}

// gifted no tipa campos extra en los items; añadimos `ms` para el tooltip.
type ChartItem = lineDataItem & { ms: number };

interface Props {
  data: TimeSeriesPoint[];
  /** Width of the chart area. Defaults to screen width minus outer margins. */
  chartWidth?: number;
  chartHeight?: number;
  /** Label formatter for Y-axis values (min/max). */
  formatLabel?: (v: number) => string;
  /** Message shown when there are fewer than 2 points. */
  emptyMessage?: string;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDateShort(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

// Muestreo uniforme conservando primer y último punto (rango "Todo" trae cientos).
function decimate<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const out: T[] = [];
  const step = (arr.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

const MAX_POINTS = 60;
// gifted añade una franja de etiquetas X bajo la gráfica; la descontamos del
// alto para respetar el chartHeight total aproximado.
const X_LABEL_STRIP = 24;
const Y_AXIS_WIDTH = 38;

export function TimeSeriesChart({
  data,
  chartWidth: propWidth,
  chartHeight = 160,
  formatLabel = (v) => v.toFixed(1),
  emptyMessage = 'Registra al menos 2 sesiones para ver la evolución.',
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = propWidth ?? screenWidth - spacing.lg * 4;

  const sorted = useMemo(() => [...data].sort((a, b) => a.ms - b.ms), [data]);

  // Desplazamos el origen del eje Y al mínimo (con padding) para no aplastar la
  // curva contra el techo cuando los valores viven en un rango estrecho (p.ej.
  // 78–85 kg). gifted reañade el offset a las etiquetas del eje Y.
  const yAxisOffset = useMemo(() => {
    if (sorted.length === 0) return 0;
    const values = sorted.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return min - 1;
    return min - (max - min) * 0.15;
  }, [sorted]);

  const items = useMemo<ChartItem[]>(() => {
    const decimated = decimate(sorted, MAX_POINTS);
    const n = decimated.length;
    // Etiquetas X en ~4 índices repartidos.
    const labelIdx = new Set([0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1]);
    return decimated.map((p, i) => ({
      value: p.value,
      ms: p.ms,
      label: labelIdx.has(i) ? formatDateShort(p.ms) : undefined,
      labelTextStyle: { color: colors.text.muted, fontSize: 10 },
    }));
  }, [sorted]);

  if (sorted.length < 2) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <Icon name="chart" size={28} color={colors.text.muted} />
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.sm, textAlign: 'center' }}
        >
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height: chartHeight, overflow: 'hidden' }}>
      <LineChart
        data={items}
        width={chartWidth - Y_AXIS_WIDTH}
        height={chartHeight - X_LABEL_STRIP}
        adjustToWidth
        disableScroll
        initialSpacing={8}
        endSpacing={8}
        yAxisLabelWidth={Y_AXIS_WIDTH}
        noOfSections={3}
        yAxisOffset={yAxisOffset}
        formatYLabel={(v) => formatLabel(Number(v))}
        yAxisTextStyle={{ color: colors.text.muted, fontSize: 10 }}
        yAxisColor="transparent"
        xAxisColor={colors.border}
        rulesColor={colors.border}
        rulesType="dashed"
        curved
        color={colors.primary.DEFAULT}
        thickness={2}
        hideDataPoints={items.length > 30}
        dataPointsColor={colors.primary.DEFAULT}
        dataPointsRadius={3}
        areaChart
        startFillColor={colors.primary.DEFAULT}
        endFillColor={colors.primary.DEFAULT}
        startOpacity={0.12}
        endOpacity={0}
        pointerConfig={{
          // Los charts viven en ScrollViews: el pan sólo debe activarse con
          // long-press para no robar el scroll vertical.
          activatePointersOnLongPress: true,
          activatePointersDelay: 150,
          pointerColor: colors.primary.DEFAULT,
          pointerStripColor: colors.border,
          pointerStripUptoDataPoint: true,
          radius: 5,
          autoAdjustPointerLabelPosition: true,
          pointerLabelWidth: 110,
          pointerLabelHeight: 48,
          pointerLabelComponent: (pts: ChartItem[]) => {
            const pt = pts?.[0];
            if (!pt) return null;
            return (
              <View
                style={{
                  width: 110,
                  backgroundColor: colors.bg.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm,
                }}
              >
                <Text weight="bold" numeric>
                  {formatLabel(pt.value ?? 0)}
                </Text>
                <Text variant="caption" tone="muted">
                  {formatDateShort(pt.ms)}
                </Text>
              </View>
            );
          },
        }}
      />
    </View>
  );
}
