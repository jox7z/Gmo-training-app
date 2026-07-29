import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/Avatar';
import { RankEmblem } from '@/components/RankEmblem';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radius, spacing, RANKS, type RankId } from '@/theme/tokens';
import type { GlobalRankEntry } from '@/lib/repos/social';

interface Props {
  /** Ya ordenado por el RPC: la posición es el índice + 1. */
  entries: GlobalRankEntry[];
  /** Entrada del usuario actual cuando no está en el podio. */
  myEntry?: { entry: GlobalRankEntry; position: number };
  onOpen: (username: string) => void;
}

/** Colores del metal por posición: el podio no inventa tonos nuevos. */
const MEDAL = [
  colors.metal.gold.DEFAULT,
  colors.metal.silver.DEFAULT,
  colors.metal.bronze.DEFAULT,
] as const;

/** Alturas del pedestal: 1º al centro y más alto. */
const PEDESTAL = [72, 52, 40] as const;

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

/**
 * Podio compacto del top 3 global. Solo presenta lo que devuelve
 * `global_leaderboard`; no deriva posiciones ni puntos.
 */
export function RankPodium({ entries, myEntry, onOpen }: Props) {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;

  // Orden visual: 2º · 1º · 3º. `position` conserva la real.
  const columns = [top[1], top[0], top[2]]
    .map((entry, i) => (entry ? { entry, position: [2, 1, 3][i] } : null))
    .filter((c): c is { entry: GlobalRankEntry; position: number } => c !== null);

  return (
    <Card variant="section" padding="lg" style={{ gap: spacing.lg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: spacing.sm,
        }}
      >
        {columns.map(({ entry, position }) => (
          <PodiumColumn
            key={entry.id}
            entry={entry}
            position={position}
            onPress={() => onOpen(entry.username)}
          />
        ))}
      </View>

      {myEntry ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Tu posición: ${myEntry.position}`}
          accessibilityHint={`${myEntry.entry.rankPoints.toLocaleString()} puntos. Abre tu perfil`}
          onPress={() => onOpen(myEntry.entry.username)}
          pressScale={0.98}
          haptic={false}
        >
          <View
            style={{
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.primary.glow,
              backgroundColor: colors.primary.muted,
            }}
          >
            <Text weight="black" numeric tone="brand" style={{ minWidth: spacing.xl }}>
              {myEntry.position}
            </Text>
            <Avatar
              uri={myEntry.entry.avatarUrl}
              name={myEntry.entry.displayName}
              size={32}
              borderColor={rankInfo(myEntry.entry.currentRank).color}
            />
            <Text variant="caption" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
              Tu posición
            </Text>
            <Text variant="caption" weight="bold" numeric tone="brand">
              {myEntry.entry.rankPoints.toLocaleString()} pts
            </Text>
          </View>
        </PressableScale>
      ) : null}
    </Card>
  );
}

function PodiumColumn({
  entry,
  position,
  onPress,
}: {
  entry: GlobalRankEntry;
  position: number;
  onPress: () => void;
}) {
  const info = rankInfo(entry.currentRank);
  const medal = MEDAL[position - 1] ?? colors.text.muted;
  const pedestal = PEDESTAL[position - 1] ?? PEDESTAL[2];
  const isFirst = position === 1;
  const avatarSize = isFirst ? 56 : 46;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Posición ${position}: ${entry.displayName}`}
      accessibilityHint={`${entry.rankPoints.toLocaleString()} puntos, rango ${info.label}. Abre su perfil`}
      accessibilityState={{ selected: entry.isMe }}
      onPress={onPress}
      pressScale={0.96}
      haptic={false}
      style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}
    >
      <RankEmblem
        rankId={entry.currentRank}
        size={isFirst ? 34 : 26}
        accessible={false}
      />

      <Avatar
        uri={entry.avatarUrl}
        name={entry.displayName}
        size={avatarSize}
        borderColor={info.color}
      />

      <Text variant="caption" weight="bold" numberOfLines={1} style={{ textAlign: 'center' }}>
        {entry.displayName}
        {entry.isMe ? ' (tú)' : ''}
      </Text>
      <Text variant="label" tone="muted" numeric numberOfLines={1}>
        {entry.rankPoints.toLocaleString()}
      </Text>

      <View
        style={{
          alignSelf: 'stretch',
          height: pedestal,
          alignItems: 'center',
          justifyContent: 'center',
          borderTopLeftRadius: radius.sm,
          borderTopRightRadius: radius.sm,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: medal,
          backgroundColor: colors.bg.elevated,
        }}
      >
        <Text weight="black" numeric style={{ color: medal, fontSize: isFirst ? 26 : 20 }}>
          {position}
        </Text>
      </View>
    </PressableScale>
  );
}
