import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { Text } from './ui/Text';

interface Props {
  weeks: number;
  daysThisWeek: number;
  weeklyGoal: number;
  size?: number;
}

export function StreakRing({ weeks, daysThisWeek, weeklyGoal, size = 180 }: Props) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(daysThisWeek / weeklyGoal, 1);
  const offset = circumference * (1 - progress);
  const goalMet = daysThisWeek >= weeklyGoal;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="streakGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.accent.DEFAULT} />
            <Stop offset="1" stopColor={colors.primary.DEFAULT} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.bg.card}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#streakGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text variant="label" tone="muted">
          Racha
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text variant="metric" tone={goalMet ? 'accent' : 'primary'} numeric>
            {weeks}
          </Text>
          <Text variant="heading" tone="secondary" style={{ marginLeft: 4 }}>
            sem
          </Text>
        </View>
        <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
          {daysThisWeek}/{weeklyGoal} días esta semana
        </Text>
      </View>
    </View>
  );
}
