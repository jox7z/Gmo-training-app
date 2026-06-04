/**
 * TimeSeriesChart — primitivo SVG de línea para series temporales.
 *
 * Acepta puntos { ms: number; value: number }[] con X proporcional a la
 * fecha (ms epoch) e Y autoescalada. Con menos de 2 puntos muestra un
 * estado vacío.
 */

import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/ui/Text';

export interface TimeSeriesPoint {
  ms: number;
  value: number;
}

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

export function TimeSeriesChart({
  data,
  chartWidth: propWidth,
  chartHeight = 160,
  formatLabel = (v) => v.toFixed(1),
  emptyMessage = 'Registra al menos 2 sesiones para ver la evolución.',
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = propWidth ?? screenWidth - spacing.lg * 4;

  const axisPad = 38;
  const innerW = chartWidth - axisPad;
  const innerH = chartHeight - 28;

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.ms - b.ms),
    [data],
  );

  const range = useMemo(() => {
    if (sorted.length === 0) return { min: 0, max: 1 };
    const values = sorted.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return { min: min - 1, max: max + 1 };
    const pad = (max - min) * 0.15;
    return { min: min - pad, max: max + pad };
  }, [sorted]);

  const msRange = useMemo(() => {
    if (sorted.length < 2) return { minMs: 0, maxMs: 1 };
    const minMs = sorted[0].ms;
    const maxMs = sorted[sorted.length - 1].ms;
    return { minMs, maxMs: minMs === maxMs ? minMs + 1 : maxMs };
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

  const xFor = (ms: number): number => {
    const ratio = (ms - msRange.minMs) / (msRange.maxMs - msRange.minMs);
    return axisPad + ratio * innerW;
  };

  const yFor = (v: number): number => {
    const t = (v - range.min) / (range.max - range.min);
    return chartHeight - 16 - t * innerH;
  };

  const points = sorted.map((p) => ({ x: xFor(p.ms), y: yFor(p.value), raw: p }));

  const pathD = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {/* Y-axis labels */}
      <SvgText x={0} y={14} fontSize={10} fill={colors.text.muted}>
        {formatLabel(range.max)}
      </SvgText>
      <SvgText x={0} y={chartHeight - 18} fontSize={10} fill={colors.text.muted}>
        {formatLabel(range.min)}
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
      {/* Line */}
      <Path d={pathD} stroke={colors.primary.DEFAULT} strokeWidth={2} fill="none" />
      {/* Dots */}
      {points.map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={3} fill={colors.primary.DEFAULT} />
      ))}
    </Svg>
  );
}
