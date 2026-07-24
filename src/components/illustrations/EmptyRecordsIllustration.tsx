/**
 * EmptyRecordsIllustration — vector propio (react-native-svg) para el estado
 * vacío de récords: trofeo. Placeholder de buena calidad, reemplazable por arte
 * real sin tocar el consumidor (prop `illustration` de EmptyState). Formas
 * geométricas simples + paleta de medalla del tema.
 */
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';

export function EmptyRecordsIllustration({ size = 132 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Halo de fondo */}
      <Circle cx={60} cy={60} r={52} fill={colors.medal.goldSoft} />
      {/* Copa */}
      <Path
        d="M40 34 H80 V44 C80 56 72 64 60 64 C48 64 40 56 40 44 Z"
        fill={colors.medal.gold}
      />
      {/* Asas */}
      <Path
        d="M40 38 C30 38 30 54 42 54"
        stroke={colors.medal.gold}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M80 38 C90 38 90 54 78 54"
        stroke={colors.medal.gold}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      {/* Medallón */}
      <Circle cx={60} cy={45} r={6} fill={colors.bg.base} opacity={0.18} />
      {/* Tallo */}
      <Rect x={56} y={64} width={8} height={10} fill={colors.medal.bronze} />
      {/* Base */}
      <Rect x={46} y={74} width={28} height={6} rx={3} fill={colors.medal.bronze} />
      <Rect x={50} y={80} width={20} height={6} rx={3} fill={colors.medal.bronze} opacity={0.7} />
    </Svg>
  );
}
