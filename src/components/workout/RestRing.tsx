import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ventana de descanso "óptimo": el reloj se pone verde dentro de ella.
const GREEN_FROM = 120;
const GREEN_TO = 300;

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

interface Props {
  elapsed: number;
  /** Segundos para completar el anillo. */
  target?: number;
  size?: number;
}

/**
 * Anillo de descanso estilo Duolingo: progreso con gradiente accent→primary
 * que se vuelve verde al alcanzar la ventana de recuperación. El reloj vive
 * en el centro.
 */
export function RestRing({ elapsed, target = 180, size = 260 }: Props) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const recovered = elapsed >= GREEN_FROM;
  const clockGreen = elapsed >= GREEN_FROM && elapsed < GREEN_TO;

  // strokeDashoffset no soporta native driver → useNativeDriver: false.
  const offsetAnim = useRef(
    new Animated.Value(circumference * (1 - Math.min(elapsed / target, 1))),
  ).current;

  useEffect(() => {
    Animated.timing(offsetAnim, {
      toValue: circumference * (1 - Math.min(elapsed / target, 1)),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [elapsed, target, circumference, offsetAnim]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="restRingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.accent.DEFAULT} />
            <Stop offset="1" stopColor={colors.primary.DEFAULT} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.bg.elevated}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progreso */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={recovered ? colors.success : 'url(#restRingGrad)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offsetAnim}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={{ alignItems: 'center' }}>
        <Text
          tracking="tightest"
          style={{
            fontSize: 58,
            fontWeight: '900',
            color: clockGreen ? colors.success : colors.text.primary,
            fontVariant: ['tabular-nums'],
            lineHeight: 62,
          }}
        >
          {formatClock(elapsed)}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
          descanso
        </Text>
      </View>
    </View>
  );
}
