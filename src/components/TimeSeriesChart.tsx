/**
 * TimeSeriesChart — primitivo SVG interactivo para series temporales.
 *
 * Mantiene la API original y añade ejes X mínimos, selección táctil de puntos
 * y navegación accesible con las acciones incrementar/decrementar.
 */

import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

export interface TimeSeriesPoint {
  id?: string;
  ms: number;
  value: number;
}

interface Props {
  data: TimeSeriesPoint[];
  /** Width of the chart area. Defaults to screen width minus outer margins. */
  chartWidth?: number;
  chartHeight?: number;
  /** Label formatter for Y-axis values (min/max and tooltip). */
  formatLabel?: (v: number) => string;
  /** Label formatter for dates on the X axis and tooltip. */
  formatXLabel?: (ms: number) => string;
  /** Accessible description for each selectable point. */
  formatPointAccessibilityLabel?: (point: TimeSeriesPoint, index: number) => string;
  /** Opens or reveals the recorded session represented by a point. */
  onPointPress?: (point: TimeSeriesPoint, index: number) => void;
  accessibilityLabel?: string;
  /** Message shown when there are fewer than 2 points. */
  emptyMessage?: string;
}

export function TimeSeriesChart({
  data,
  chartWidth: propWidth,
  chartHeight = 160,
  formatLabel = (v) => v.toFixed(1),
  formatXLabel = defaultDateLabel,
  formatPointAccessibilityLabel,
  onPointPress,
  accessibilityLabel = 'Gráfico de evolución',
  emptyMessage = 'Registra al menos 2 sesiones para ver la evolución.',
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const chartWidth = propWidth ?? screenWidth - spacing.lg * 4;

  const leftPad = spacing['2xl'] + spacing.md;
  const rightPad = spacing.xs;
  const topPad = spacing.md;
  const bottomPad = spacing.xl;
  const plotBottom = chartHeight - bottomPad;
  const innerW = Math.max(1, chartWidth - leftPad - rightPad);
  const innerH = Math.max(1, plotBottom - topPad);

  const sorted = useMemo(
    () =>
      data
        .filter((point) => Number.isFinite(point.ms) && Number.isFinite(point.value))
        .sort((a, b) => a.ms - b.ms),
    [data],
  );

  const range = useMemo(() => {
    if (sorted.length === 0) return { min: 0, max: 1 };
    const values = sorted.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      const pad = Math.max(Math.abs(min) * 0.05, 1);
      return { min: min - pad, max: max + pad };
    }
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
        <Icon name="chart" size={spacing['2xl'] - spacing.xs} color={colors.text.muted} />
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
    return leftPad + ratio * innerW;
  };

  const yFor = (value: number): number => {
    const ratio = (value - range.min) / (range.max - range.min);
    return plotBottom - ratio * innerH;
  };

  const points = sorted.map((point) => ({
    x: xFor(point.ms),
    y: yFor(point.value),
    raw: point,
  }));
  const pathD = points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(' ');
  const safeSelectedIndex =
    selectedIndex !== null && selectedIndex < points.length ? selectedIndex : null;
  const selected = safeSelectedIndex === null ? null : points[safeSelectedIndex];
  const selectedAccessibleLabel =
    selected && safeSelectedIndex !== null
      ? pointAccessibilityLabel(
          selected.raw,
          safeSelectedIndex,
          formatLabel,
          formatXLabel,
          formatPointAccessibilityLabel,
        )
      : undefined;

  const moveSelection = (direction: -1 | 1) => {
    setSelectedIndex((current) => {
      const start = current ?? (direction === 1 ? -1 : points.length);
      return Math.max(0, Math.min(points.length - 1, start + direction));
    });
  };

  const tooltipWidth = Math.min(
    chartWidth - spacing.md * 2,
    spacing['4xl'] * 2,
  );
  const tooltipLeft = selected
    ? Math.max(
        spacing.xs,
        Math.min(chartWidth - tooltipWidth - spacing.xs, selected.x - tooltipWidth / 2),
      )
    : 0;
  const tooltipTop = selected
    ? Math.max(spacing.xs, selected.y - spacing['3xl'])
    : 0;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        onPointPress
          ? 'Usa aumentar o disminuir para recorrer los puntos y activar para abrir la sesión.'
          : 'Usa las acciones aumentar o disminuir para recorrer los puntos.'
      }
      accessibilityValue={{ text: selectedAccessibleLabel ?? `${points.length} puntos registrados` }}
      accessibilityActions={[
        { name: 'increment', label: 'Punto siguiente' },
        { name: 'decrement', label: 'Punto anterior' },
        ...(onPointPress ? [{ name: 'activate' as const, label: 'Abrir sesión' }] : []),
      ]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'increment') moveSelection(1);
        if (nativeEvent.actionName === 'decrement') moveSelection(-1);
        if (
          nativeEvent.actionName === 'activate' &&
          safeSelectedIndex !== null
        ) {
          onPointPress?.(points[safeSelectedIndex].raw, safeSelectedIndex);
        }
      }}
      style={{
        width: chartWidth,
        height: chartHeight,
        position: 'relative',
      }}
    >
      <Svg width={chartWidth} height={chartHeight}>
        <SvgText
          x={0}
          y={topPad}
          fontSize={fontSize.xs}
          fill={colors.text.muted}
        >
          {formatLabel(range.max)}
        </SvgText>
        <SvgText
          x={0}
          y={plotBottom}
          fontSize={fontSize.xs}
          fill={colors.text.muted}
        >
          {formatLabel(range.min)}
        </SvgText>

        <Line
          x1={leftPad}
          x2={chartWidth - rightPad}
          y1={plotBottom}
          y2={plotBottom}
          stroke={colors.border}
          strokeWidth={1}
        />
        <SvgText
          x={leftPad}
          y={chartHeight - spacing.xs}
          fontSize={fontSize.xs}
          fill={colors.text.muted}
          textAnchor="start"
        >
          {formatXLabel(sorted[0].ms)}
        </SvgText>
        <SvgText
          x={chartWidth - rightPad}
          y={chartHeight - spacing.xs}
          fontSize={fontSize.xs}
          fill={colors.text.muted}
          textAnchor="end"
        >
          {formatXLabel(sorted[sorted.length - 1].ms)}
        </SvgText>

        <Path
          d={pathD}
          stroke={colors.primary.DEFAULT}
          strokeWidth={2}
          fill="none"
        />
        {points.map((point, index) => (
          <Circle
            key={`${point.raw.ms}-${index}`}
            cx={point.x}
            cy={point.y}
            r={safeSelectedIndex === index ? spacing.xs + 1 : spacing.xs - 1}
            fill={safeSelectedIndex === index ? colors.accent.DEFAULT : colors.primary.DEFAULT}
            stroke={safeSelectedIndex === index ? colors.text.primary : colors.primary.DEFAULT}
            strokeWidth={safeSelectedIndex === index ? 2 : 0}
          />
        ))}
        {selected ? (
          <Line
            x1={selected.x}
            x2={selected.x}
            y1={topPad}
            y2={plotBottom}
            stroke={colors.borderStrong}
            strokeWidth={1}
            strokeDasharray={`${spacing.xs} ${spacing.xs}`}
          />
        ) : null}
      </Svg>

      {points.map((point, index) => (
        <PressableScale
          key={`touch-${point.raw.ms}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={pointAccessibilityLabel(
            point.raw,
            index,
            formatLabel,
            formatXLabel,
            formatPointAccessibilityLabel,
          )}
          accessibilityState={{ selected: safeSelectedIndex === index }}
          accessibilityHint={onPointPress ? 'Abre el registro de esta sesión.' : undefined}
          onPress={(event) => {
            event.stopPropagation();
            setSelectedIndex(index);
            onPointPress?.(point.raw, index);
          }}
          haptic={false}
          pressScale={0.9}
          hitSlop={spacing.xs}
          style={{
            position: 'absolute',
            left: point.x - spacing.lg,
            top: point.y - spacing.lg,
            width: spacing['2xl'],
            height: spacing['2xl'],
            borderRadius: radius.full,
          }}
        />
      ))}

      {selected ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: tooltipLeft,
            top: tooltipTop,
            width: tooltipWidth,
            alignItems: 'center',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.bg.elevated,
          }}
        >
          <Text variant="caption" weight="bold" numeric numberOfLines={1}>
            {formatLabel(selected.raw.value)}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {formatXLabel(selected.raw.ms)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function defaultDateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

function pointAccessibilityLabel(
  point: TimeSeriesPoint,
  index: number,
  formatLabel: (value: number) => string,
  formatXLabel: (ms: number) => string,
  customFormatter?: (point: TimeSeriesPoint, index: number) => string,
): string {
  return (
    customFormatter?.(point, index) ??
    `${formatLabel(point.value)}, ${formatXLabel(point.ms)}`
  );
}
