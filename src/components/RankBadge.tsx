import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { rankFromPoints, nextRank, colors, radius, spacing } from '@/theme/tokens';
import { Text } from './ui/Text';

interface Props {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export function RankBadge({ points, size = 'md', showProgress = false }: Props) {
  const rank = rankFromPoints(points);
  const next = nextRank(points);
  const dim = size === 'lg' ? 64 : size === 'md' ? 44 : 28;
  const fontSize = size === 'lg' ? 14 : size === 'md' ? 11 : 9;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <LinearGradient
        colors={rank.gradient as unknown as [string, string]}
        style={{
          width: dim,
          height: dim,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: rank.color,
          shadowOpacity: 0.6,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }}
      >
        <Text style={{ fontSize, color: '#0B0B0B' }} weight="black">
          {rank.label[0]}
        </Text>
      </LinearGradient>
      {showProgress && (
        <View style={{ flex: 1 }}>
          <Text variant="heading" style={{ color: rank.color }}>
            {rank.label}
          </Text>
          {next ? (
            <>
              <View
                style={{
                  height: 6,
                  backgroundColor: colors.bg.card,
                  borderRadius: radius.full,
                  marginTop: 6,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, ((points - rank.min) / (next.min - rank.min)) * 100)}%`,
                    backgroundColor: rank.color,
                  }}
                />
              </View>
              <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
                {points} / {next.min} pts → {next.label}
              </Text>
            </>
          ) : (
            <Text variant="caption" tone="accent" style={{ marginTop: 4 }}>
              Rango máximo alcanzado · {points} pts
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
