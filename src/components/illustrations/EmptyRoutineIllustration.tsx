/**
 * EmptyRoutineIllustration — vector propio (react-native-svg) para el estado
 * vacío de rutinas: mancuerna/barra estilizada. Placeholder de buena calidad,
 * reemplazable por arte real sin tocar el consumidor (prop `illustration` de
 * EmptyState). Formas geométricas simples + paleta del tema.
 */
import Svg, { Rect, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

export function EmptyRoutineIllustration({ size = 132 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Halo de fondo */}
      <Circle cx={60} cy={60} r={52} fill={colors.primary.muted} />
      {/* Barra central */}
      <Rect x={40} y={55} width={40} height={10} rx={5} fill={colors.text.secondary} />
      {/* Discos izquierda */}
      <Rect x={28} y={44} width={12} height={32} rx={4} fill={colors.primary.DEFAULT} />
      <Rect x={19} y={50} width={9} height={20} rx={3} fill={colors.primary.dark} />
      {/* Discos derecha */}
      <Rect x={80} y={44} width={12} height={32} rx={4} fill={colors.primary.DEFAULT} />
      <Rect x={92} y={50} width={9} height={20} rx={3} fill={colors.primary.dark} />
    </Svg>
  );
}
