import { View, type StyleProp, type ViewStyle } from 'react-native';
import { rankFromPoints, nextRank, colors, radius, spacing } from '@/theme/tokens';
import { RankEmblem } from './RankEmblem';
import { Text } from './ui/Text';

interface Props {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function RankBadge({ points, size = 'md', showProgress = false }: Props) {
  const rank = rankFromPoints(points);
  const dim = size === 'lg' ? 64 : size === 'md' ? 44 : 28;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <RankEmblem rankId={rank.id} size={dim} />
      {showProgress && <RankProgress points={points} showLabel style={{ flex: 1 }} />}
    </View>
  );
}

/**
 * RankProgress — avance real hacia el siguiente rango.
 *
 * Fuente única de la barra: la consumen `RankBadge` y el héroe del perfil.
 * Solo presenta `points` y los umbrales de `RANKS`; no deriva nada.
 */
export function RankProgress({
  points,
  showLabel = false,
  style,
}: {
  points: number;
  /** Muestra el nombre del rango sobre la barra. */
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const rank = rankFromPoints(points);
  const next = nextRank(points);
  const ratio = next
    ? Math.min(100, Math.max(0, ((points - rank.min) / (next.min - rank.min)) * 100))
    : 100;

  return (
    <View style={[{ gap: spacing.xs }, style]}>
      {showLabel ? (
        <Text variant="heading" style={{ color: rank.color }}>
          {rank.label}
        </Text>
      ) : null}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={
          next
            ? `Rango ${rank.label}. ${points} de ${next.min} puntos para ${next.label}`
            : `Rango máximo ${rank.label} con ${points} puntos`
        }
        accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio) }}
        style={{
          height: spacing.sm,
          backgroundColor: colors.bg.track,
          borderRadius: radius.sm,
          overflow: 'hidden',
        }}
      >
        <View style={{ height: '100%', width: `${ratio}%`, backgroundColor: rank.color }} />
      </View>
      {next ? (
        <Text variant="caption" tone="muted" numeric>
          {points} / {next.min} pts → {next.label}
        </Text>
      ) : (
        <Text variant="caption" tone="accent" numeric>
          Rango máximo alcanzado · {points} pts
        </Text>
      )}
    </View>
  );
}
