import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type {
  RoutineQualityBreakdown,
  RoutineQualityScore,
} from '@/lib/routineQualityScore';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  result: RoutineQualityScore;
  style?: StyleProp<ViewStyle>;
}

const BREAKDOWN: readonly {
  key: keyof RoutineQualityBreakdown;
  label: string;
  color: string;
  weight: number;
}[] = [
  { key: 'coverage', label: 'Cobertura', color: colors.primary.DEFAULT, weight: 35 },
  { key: 'volume', label: 'Volumen', color: colors.accent.DEFAULT, weight: 30 },
  { key: 'frequency', label: 'Frecuencia', color: colors.info.DEFAULT, weight: 20 },
  { key: 'structure', label: 'Estructura', color: colors.lime, weight: 15 },
];

const RING_SIZE = 168;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SEGMENT_GAP = 5;

export function RoutineQualityCard({ result, style }: Props) {
  const accent = scoreColor(result.score);
  const accessibilitySummary = BREAKDOWN.map(({ key, label }) => {
    const component = result.breakdown[key];
    return `${label} ${Math.round(component.score)} de 100`;
  }).join(', ');

  let elapsedLength = 0;
  const ringSegments = BREAKDOWN.map((item) => {
    const slotLength = RING_CIRCUMFERENCE * (item.weight / 100);
    const arcLength = Math.max(0, slotLength - SEGMENT_GAP);
    const score = result.breakdown[item.key].score;
    const normalized = Number.isFinite(score)
      ? Math.min(100, Math.max(0, score))
      : 0;
    const segment = {
      ...item,
      arcLength,
      dashOffset: -(elapsedLength + SEGMENT_GAP / 2),
      fillLength: arcLength * (normalized / 100),
    };
    elapsedLength += slotLength;
    return segment;
  });

  return (
    <Card
      accessible
      variant="section"
      padding="lg"
      style={style}
      accessibilityLabel={`GMO Rating ${result.score} de 100, nivel ${result.label}. ${accessibilitySummary}. Estimación de la planificación; no predice resultados.`}
    >
      <View style={styles.header}>
        <Text variant="label" tone="accent">GMO RATING</Text>
        <Text variant="heading" weight="bold">{result.label}</Text>
      </View>

      <View style={styles.ring}>
        <Svg
          accessible={false}
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        >
          {ringSegments.map((segment) => (
            <Circle
              key={`${segment.key}-track`}
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={segment.color}
              strokeOpacity={0.18}
              strokeWidth={RING_STROKE}
              strokeDasharray={[
                segment.arcLength,
                RING_CIRCUMFERENCE - segment.arcLength,
              ]}
              strokeDashoffset={segment.dashOffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          ))}
          {ringSegments.map((segment) => (
            <Circle
              key={`${segment.key}-value`}
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={RING_STROKE}
              strokeDasharray={[
                segment.fillLength,
                RING_CIRCUMFERENCE - segment.fillLength,
              ]}
              strokeDashoffset={segment.dashOffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          ))}
        </Svg>
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          style={styles.ringValue}
        >
          <View style={styles.scoreLine}>
            <Text weight="black" numeric style={[styles.scoreValue, { color: accent }]}>
              {result.score}
            </Text>
            <Text variant="caption" tone="muted" numeric>/100</Text>
          </View>
          <Text variant="caption" weight="bold" style={{ color: accent }}>
            {result.label}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        {BREAKDOWN.map(({ key, label, color }) => {
          const component = result.breakdown[key];
          return (
            <View key={key} style={[styles.legendItem, { borderTopColor: color }]}>
              <Text variant="caption" weight="semibold">{label}</Text>
              <Text variant="heading" weight="black" numeric>
                {Math.round(component.score)}
                <Text variant="caption" tone="muted">/100</Text>
              </Text>
            </View>
          );
        })}
      </View>

      <Text variant="caption" tone="muted" style={styles.disclaimer}>
        Estimación de la planificación; no predice resultados.
      </Text>
    </Card>
  );
}

function scoreColor(score: number): string {
  if (score < 40) return colors.danger;
  if (score < 60) return colors.warning;
  if (score < 80) return colors.lime;
  return colors.success;
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  ring: {
    alignItems: 'center',
    alignSelf: 'center',
    height: RING_SIZE,
    justifyContent: 'center',
    marginTop: spacing.lg,
    width: RING_SIZE,
  },
  ringValue: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scoreLine: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scoreValue: {
    fontSize: 48,
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  legendItem: {
    backgroundColor: colors.surfaceVeil,
    borderTopWidth: 2,
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 120,
    padding: spacing.md,
  },
  disclaimer: { marginTop: spacing.lg },
});
