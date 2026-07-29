import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { WorkoutMetric } from '@/components/workout/WorkoutMetric';

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

interface Props {
  elapsed: number;
  /** Escala visual del anillo; no se presenta como objetivo. */
  target?: number;
  size?: number;
}

/**
 * Reloj factual de descanso. El anillo solo representa tiempo transcurrido;
 * no afirma recuperación ni prescribe una duración.
 */
export function RestRing({ elapsed, target = 180, size = 260 }: Props) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const offset = circumference * (1 - Math.min(elapsed / target, 1));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.bg.track}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progreso */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.text.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <WorkoutMetric
        label="Descanso"
        value={formatClock(elapsed)}
        align="center"
        prominent
      />
    </View>
  );
}
