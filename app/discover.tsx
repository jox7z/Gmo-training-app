import { useCallback } from 'react';
import { View, Pressable, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing, RANKS, RankId } from '@/theme/tokens';
import { useDiscover, useFollow, useUnfollow } from '@/lib/queries/feed';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { FeedErrorState } from '@/components/feed/FeedEmptyState';
import { useToast } from '@/components/ui/Toast';
import type { DiscoverAthlete } from '@/lib/repos/social';

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

function AthleteCard({
  athlete,
  busy,
  onToggle,
}: {
  athlete: DiscoverAthlete;
  busy: boolean;
  onToggle: () => void;
}) {
  const info = rankInfo(athlete.currentRank);
  const initial = (athlete.displayName || athlete.username || '?').trim()[0]?.toUpperCase() ?? '?';
  return (
    <Card padding="lg" style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg.elevated,
          borderWidth: 2,
          borderColor: info.color,
        }}
      >
        <Text weight="black">{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {athlete.displayName}
          </Text>
          <Badge label={info.label} tone="muted" />
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          @{athlete.username} · {athlete.rankPoints} pts
        </Text>
      </View>
      <Button
        title={athlete.isFollowing ? 'Siguiendo' : 'Seguir'}
        variant={athlete.isFollowing ? 'secondary' : 'primary'}
        size="sm"
        onPress={onToggle}
        loading={busy}
      />
    </Card>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const query = useDiscover(25);
  const follow = useFollow();
  const unfollow = useUnfollow();

  const onRefresh = useCallback(() => {
    query.refetch();
  }, [query]);

  const handleToggle = useCallback(
    (a: DiscoverAthlete) => {
      const action = a.isFollowing ? unfollow : follow;
      action.mutate(a.id, {
        onError: (err) =>
          toast.show({
            message: err?.message ?? `No se pudo ${a.isFollowing ? 'dejar de seguir' : 'seguir'}`,
            tone: 'danger',
          }),
      });
    },
    [follow, unfollow, toast],
  );

  const isInitialLoading = query.isLoading && !query.data;
  const hasError = !!query.error && !query.data;
  const data = query.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="chevron-left" size={18} color={colors.text.primary} />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">Descubrir</Text>
          <Text variant="heading">Atletas para seguir</Text>
        </View>
      </View>

      {isInitialLoading ? (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <FeedSkeleton count={5} />
        </View>
      ) : hasError ? (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <FeedErrorState message={query.error?.message} onRetry={() => query.refetch()} />
        </View>
      ) : (
        <FlatList<DiscoverAthlete>
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AthleteCard
              athlete={item}
              busy={
                (follow.isPending && follow.variables === item.id) ||
                (unfollow.isPending && unfollow.variables === item.id)
              }
              onToggle={() => handleToggle(item)}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
          }}
          ListEmptyComponent={
            <Card padding="xl" style={{ alignItems: 'center', marginTop: spacing.lg }}>
              <Icon name="users" size={32} color={colors.text.muted} />
              <Text variant="heading" style={{ marginTop: spacing.md }}>
                Aún no hay sugerencias
              </Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
                Vuelve más tarde cuando haya más atletas activos.
              </Text>
            </Card>
          }
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary.DEFAULT}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
