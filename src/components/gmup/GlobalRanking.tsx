import { View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Avatar } from '@/components/Avatar';
import { SocialErrorState } from '@/components/social/SocialErrorState';
import { colors, fontSize, spacing, RANKS, type RankId } from '@/theme/tokens';
import { useGlobalLeaderboard, type GlobalRankEntry } from '@/lib/queries/social';

interface Props {
  /** Espacio extra al final: la barra de pestañas de GMUP tapa el último ítem. */
  bottomInset?: number;
}

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

/**
 * Ranking global por puntos.
 *
 * Vivía dentro de `app/discover.tsx`; ahora es la vista "Ranking" del hub
 * GMUP y ya no forma parte del buscador.
 */
export function GlobalRanking({ bottomInset = 0 }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const leaderboardQuery = useGlobalLeaderboard(50);
  const entries = leaderboardQuery.data ?? [];
  const hasEntries = entries.length > 0;
  const showBlockingError = leaderboardQuery.isError && !hasEntries;
  const showStaleError = leaderboardQuery.isError && hasEntries;

  return (
    <FlatList<GlobalRankEntry>
      data={entries}
      keyExtractor={(e) => e.id}
      renderItem={({ item, index }) => (
        <RankingRow
          entry={item}
          position={index + 1}
          onOpen={() =>
            router.push({ pathname: '/profile/[username]', params: { username: item.username } })
          }
        />
      )}
      ListHeaderComponent={
        hasEntries || showStaleError ? (
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {hasEntries && (
              <Text variant="label" tone="secondary">
                TOP ATLETAS · POR PUNTOS
              </Text>
            )}
            {showStaleError && (
              <SocialErrorState
                compact
                title="No pudimos actualizar el ranking"
                subtitle="Las posiciones mostradas son las últimas que guardamos."
                onRetry={() => void leaderboardQuery.refetch()}
                isRetrying={leaderboardQuery.isFetching}
              />
            )}
          </View>
        ) : null
      }
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.lg + bottomInset,
        gap: spacing.sm,
        flexGrow: 1,
        // Columna social: ancho completo en móvil, 600 px centrados en tablet.
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
      }}
      ListEmptyComponent={
        leaderboardQuery.isLoading ? (
          <SkeletonRows rows={6} accessibilityLabel="Cargando ranking" />
        ) : showBlockingError ? (
          <SocialErrorState
            title="No pudimos cargar el ranking"
            subtitle="Parece que hay un problema de conexión. Inténtalo de nuevo para ver las posiciones."
            onRetry={() => void leaderboardQuery.refetch()}
            isRetrying={leaderboardQuery.isFetching}
          />
        ) : (
          <EmptyState
            icon="trophy"
            title="Sin ranking todavía"
            description="Cuando los atletas acumulen puntos aparecerán aquí en el top global."
          />
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

function RankingRow({
  entry,
  position,
  onOpen,
}: {
  entry: GlobalRankEntry;
  position: number;
  onOpen: () => void;
}) {
  const info = rankInfo(entry.currentRank);
  const posColor =
    position === 1 ? colors.metal.gold.DEFAULT
    : position === 2 ? colors.metal.silver.DEFAULT
    : position === 3 ? colors.metal.bronze.DEFAULT
    : colors.text.muted;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Posición ${position}: ${entry.displayName}`}
      accessibilityHint={`${entry.rankPoints.toLocaleString()} puntos. Abre su perfil`}
      accessibilityState={{ selected: entry.isMe }}
      onPress={onOpen}
      pressScale={0.98}
      haptic={false}
    >
      <Card
        padding="md"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: entry.isMe ? colors.primary.muted : undefined,
        }}
      >
        <Text
          weight="black"
          numeric
          style={{ width: fontSize['2xl'], textAlign: 'center', color: posColor }}
        >
          {position}
        </Text>
        <Avatar uri={entry.avatarUrl} name={entry.displayName} size={42} borderColor={info.color} />
        <View style={{ flex: 1 }}>
          <Text weight="bold" numberOfLines={1}>
            {entry.displayName}{entry.isMe ? ' (tú)' : ''}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>@{entry.username}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text weight="bold" numeric style={{ color: info.color }}>
            {entry.rankPoints.toLocaleString()}
          </Text>
          <Text variant="label" tone="muted" style={{ fontSize: fontSize.xs }}>
            {info.label}
          </Text>
        </View>
      </Card>
    </PressableScale>
  );
}
