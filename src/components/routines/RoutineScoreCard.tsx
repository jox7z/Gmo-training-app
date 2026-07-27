/**
 * RoutineScoreCard — card del "Score de optimización" de una rutina.
 *
 * Presentación pura: recibe un `RoutineScore` ya calculado con
 * `computeRoutineScore(routine, profile)` y no consulta stores ni Supabase.
 * Se comparte entre la pestaña Rutina (`app/(tabs)/routines.tsx`, score de la
 * rutina guardada) y el editor (`app/routine/[id].tsx`, score en vivo del
 * borrador en memoria) para que ambos muestren exactamente lo mismo.
 */
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';
import { MUSCLE_LABELS, type RoutineScore } from '@/lib/optimizationScore';

interface Props {
  score: RoutineScore;
  /** Estilo del contenedor (márgenes propios de cada pantalla). */
  style?: StyleProp<ViewStyle>;
}

const BREAKDOWN_KEYS = ['coverage', 'balance', 'volume', 'frequency', 'separation'] as const;

/** Semáforo compartido por el círculo y las barras: >80 verde, >=50 ámbar, resto rojo. */
function toneFor(value: number): string {
  if (value > 80) return colors.success;
  if (value >= 50) return colors.warning;
  return colors.danger;
}

export function RoutineScoreCard({ score, style }: Props) {
  const scoreColor = toneFor(score.score);

  return (
    <Animated.View
      entering={FadeInDown.delay(50).springify().damping(18)}
      layout={LinearTransition.springify().damping(18)}
      style={[{ alignItems: 'center' }, style]}
    >
      <Text variant="heading" style={{ marginBottom: spacing.md, alignSelf: 'stretch' }}>Score de optimización</Text>
      <Card variant="raised" padding="lg" style={{ alignSelf: 'stretch' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor: scoreColor + '22',
              borderWidth: 2,
              borderColor: scoreColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '700', color: scoreColor, lineHeight: 26 }}>
              {score.score}
            </Text>
            <Text style={{ fontSize: 10, color: scoreColor, opacity: 0.8 }}>/100</Text>
          </View>
          <View style={{ flex: 1 }}>
            {score.breakdown.coverage > 0 ? (
              <>
                <Text variant="label" tone="muted">Grupos más débiles</Text>
                <Text weight="semibold" style={{ marginTop: 4 }}>
                  {score.weakGroups.map((g) => MUSCLE_LABELS[g] ?? g).join(' · ')}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  {BREAKDOWN_KEYS.map((key) => {
                    const val = score.breakdown[key];
                    const barColor = toneFor(val);
                    return (
                      <View key={key} style={{ flex: 1 }}>
                        <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.border }}>
                          <View style={{ height: 3, borderRadius: 2, backgroundColor: barColor, width: `${val}%` }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text variant="caption" tone="muted">
                Agrega ejercicios a tu rutina para ver el análisis
              </Text>
            )}
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}
