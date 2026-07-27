/**
 * EmptyFeedIllustration — vector propio (react-native-svg) para el estado vacío
 * del feed social: pila de tarjetas con avatar + líneas de texto. Placeholder de
 * buena calidad, reemplazable por arte real sin tocar el consumidor (prop
 * `illustration` de EmptyState). Formas geométricas simples + paleta del tema.
 */
import Svg, { Rect, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

export function EmptyFeedIllustration({ size = 132 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Halo de fondo */}
      <Circle cx={60} cy={60} r={52} fill={colors.info.soft} />
      {/* Tarjeta trasera */}
      <Rect
        x={28}
        y={28}
        width={64}
        height={42}
        rx={10}
        fill={colors.bg.card}
        stroke={colors.border}
        strokeWidth={2}
        opacity={0.6}
      />
      {/* Tarjeta frontal */}
      <Rect
        x={20}
        y={46}
        width={80}
        height={48}
        rx={12}
        fill={colors.bg.elevated}
        stroke={colors.borderStrong}
        strokeWidth={2}
      />
      {/* Avatar */}
      <Circle cx={36} cy={62} r={9} fill={colors.info.DEFAULT} />
      {/* Líneas de texto */}
      <Rect x={50} y={57} width={40} height={5} rx={2.5} fill={colors.text.muted} />
      <Rect x={50} y={67} width={26} height={5} rx={2.5} fill={colors.border} />
      {/* Barra inferior (acciones) */}
      <Rect x={32} y={82} width={16} height={5} rx={2.5} fill={colors.info.DEFAULT} opacity={0.7} />
      <Rect x={54} y={82} width={16} height={5} rx={2.5} fill={colors.border} />
    </Svg>
  );
}
