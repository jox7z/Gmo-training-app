/**
 * EmptyProgressIllustration — vector propio (react-native-svg) para el estado
 * vacío de progreso: barras ascendentes + línea de tendencia. Placeholder de
 * buena calidad, reemplazable por arte real sin tocar el consumidor (prop
 * `illustration` de EmptyState). Formas geométricas simples + paleta del tema.
 */
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';

export function EmptyProgressIllustration({ size = 132 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Halo de fondo */}
      <Circle cx={60} cy={60} r={52} fill={colors.primary.muted} />
      {/* Eje base */}
      <Rect x={28} y={84} width={64} height={3} rx={1.5} fill={colors.border} />
      {/* Barras ascendentes */}
      <Rect x={34} y={64} width={12} height={20} rx={3} fill={colors.primary.DEFAULT} opacity={0.5} />
      <Rect x={54} y={52} width={12} height={32} rx={3} fill={colors.primary.DEFAULT} opacity={0.75} />
      <Rect x={74} y={40} width={12} height={44} rx={3} fill={colors.primary.DEFAULT} />
      {/* Línea de tendencia */}
      <Path
        d="M34 60 L60 48 L80 34"
        stroke={colors.accent.DEFAULT}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={80} cy={34} r={4} fill={colors.accent.DEFAULT} />
    </Svg>
  );
}
