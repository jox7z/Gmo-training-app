/**
 * WeightChart — línea SVG reutilizable para evolución de peso.
 *
 * Los puntos se posicionan en X según la fecha real (proporcional al
 * rango temporal), no por índice. Esto garantiza que huecos entre
 * mediciones sean visualmente correctos y que la dirección de la línea
 * sea siempre cronológica (77 kg → 40 kg baja hacia abajo).
 *
 * Acepta datos ya ordenados ascendentemente por fecha (como devuelve
 * body_timeline desde 0018).
 */

import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/ui/Text';
import { toDisplay } from '@/lib/units';
import type { Unit } from '@/store/app';
import type { BodyTimelinePoint } from '@/lib/queries/body';

interface Props {
  data: BodyTimelinePoint[];
  unit: Unit;
  /** Ancho del área del chart. Si no se pasa, usa el ancho de pantalla menos márgenes. */
  chartWidth?: number;
  chartHeight?: number;
}

/** Parsea YYYY-MM-DD (o ISO completo) como timestamp numérico. */
function parseDateMs(s: string): number {
  // YYYY-MM-DD → new Date lo interpreta en UTC, lo que es correcto ya que
  // solo usamos diferencias relativas para calcular la posición X.
  return new Date(s).getTime();
}

export function WeightChart({ data, unit, chartWidth: propWidth, chartHeight = 160 }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  // Si no se especifica ancho, usamos el de pantalla menos márgenes externos.
  const chartWidth = propWidth ?? screenWidth - spacing.lg * 4;

  const axisPad = 38; // espacio para etiquetas de eje Y
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

  const dateRange = useMemo(() => {
    if (sorted.length < 2) return { minMs: 0, maxMs: 1 };
    const minMs = parseDateMs(sorted[0].recordedAt);
    const maxMs = parseDateMs(sorted[sorted.length - 1].recordedAt);
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
          Registra al menos 2 mediciones para ver tu evolución.
        </Text>
      </View>
    );
  }

  const xFor = (dateStr: string): number => {
    const ms = parseDateMs(dateStr);
    const ratio = (ms - dateRange.minMs) / (dateRange.maxMs - dateRange.minMs);
    return axisPad + ratio * innerW;
  };

  const yFor = (w: number): number => {
    const t = (w - range.min) / (range.max - range.min);
    // Peso mayor → posición Y más arriba (menor Y en SVG)
    return chartHeight - 16 - t * innerH;
  };

  const points = sorted.map((p) => ({
    x: xFor(p.recordedAt),
    y: yFor(toDisplay(p.weightKg, unit)),
    raw: p,
  }));

  const pathD = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {/* Etiquetas eje Y */}
      <SvgText x={0} y={14} fontSize={10} fill={colors.text.muted}>
        {range.max.toFixed(1)}
      </SvgText>
      <SvgText x={0} y={chartHeight - 18} fontSize={10} fill={colors.text.muted}>
        {range.min.toFixed(1)}
      </SvgText>
      {/* Línea base */}
      <Line
        x1={axisPad}
        x2={chartWidth}
        y1={chartHeight - 16}
        y2={chartHeight - 16}
        stroke={colors.border}
        strokeWidth={1}
      />
      {/* Línea del peso */}
      <Path d={pathD} stroke={colors.primary.DEFAULT} strokeWidth={2} fill="none" />
      {/* Puntos */}
      {points.map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={3} fill={colors.primary.DEFAULT} />
      ))}
    </Svg>
  );
}
