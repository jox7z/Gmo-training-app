import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Pressable, FlatList, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { FollowButton } from '@/components/FollowButton';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { colors, radius, spacing, RANKS, RankId } from '@/theme/tokens';
import { useAppStore } from '@/store/app';
import {
  useFollowers,
  useFollowing,
} from '@/lib/queries/feed';
import { useSearchUsers } from '@/lib/queries/search';
import type { FollowProfile } from '@/lib/repos/social';

type ConnectionType = 'followers' | 'following';

// Referencia estable para el estado de carga (evita un nuevo `[]` por render).
const EMPTY_LIST: FollowProfile[] = [];

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

export default function Connections() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ username?: string; type?: string }>();
  const type: ConnectionType = params.type === 'following' ? 'following' : 'followers';
  const me = useAppStore((s) => s.profile);

  // Resolver username → userId. Si no llega `username`, asume el perfil
  // del propio usuario (compatible con la entrada antigua sin params).
  const targetUsername = (params.username ?? me?.username ?? '').toLowerCase();
  const isSelf = !!me && targetUsername === me.username.toLowerCase();

  const searchQuery = useSearchUsers(targetUsername);
  const resolvedId = useMemo(() => {
    if (isSelf) return me?.id;
    return (searchQuery.data ?? []).find((u) => u.username.toLowerCase() === targetUsername)?.id;
  }, [isSelf, me?.id, searchQuery.data, targetUsername]);

  const followersQuery = useFollowers(type === 'followers' ? resolvedId : undefined);
  const followingQuery = useFollowing(type === 'following' ? resolvedId : undefined);
  const query = type === 'followers' ? followersQuery : followingQuery;
  const refetch = query.refetch;

  // Membresía congelada por destino: dejar de seguir no elimina la fila. La key
  // evita mostrar seguidores de otro perfil cuando expo-router cambia params
  // dentro del mismo montaje.
  const listKey = `${type}:${resolvedId ?? 'pending'}`;
  const [frozen, setFrozen] = useState<{
    key: string;
    rows: FollowProfile[];
  } | null>(null);

  useEffect(() => {
    if (frozen?.key !== listKey && !query.isFetching && query.data) {
      setFrozen({ key: listKey, rows: query.data });
    }
  }, [frozen?.key, listKey, query.data, query.isFetching]);

  const frozenRows = frozen?.key === listKey ? frozen.rows : null;
  const data = frozenRows ?? query.data ?? EMPTY_LIST;

  const handleFollowChange = useCallback((userId: string, next: boolean) => {
    setFrozen((prev) =>
      prev?.key === listKey
        ? {
            ...prev,
            rows: prev.rows.map((user) =>
              user.id === userId ? { ...user, isFollowing: next } : user,
            ),
          }
        : prev,
    );
  }, [listKey]);

  const handleRefresh = useCallback(() => {
    void refetch().then((result) => {
      if (result.isSuccess && result.data) {
        setFrozen({ key: listKey, rows: result.data });
      }
    });
  }, [listKey, refetch]);

  const title = type === 'followers' ? 'Seguidores' : 'Siguiendo';
  const subtitle = isSelf ? 'Tu cuenta' : `@${targetUsername}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

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
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.full,
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
          <Text variant="caption" tone="muted">{subtitle}</Text>
          <Text variant="heading">{title}</Text>
        </View>
        {data.length > 0 && (
          <Text variant="caption" tone="muted" numeric>{data.length}</Text>
        )}
      </View>

      {searchQuery.isLoading && !isSelf ? (
        <ConnectionsSkeleton label={`Cargando ${title.toLowerCase()}`} />
      ) : !resolvedId ? (
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
          <Card padding="xl" style={{ alignItems: 'center' }}>
            <Icon name="users" size={32} color={colors.text.muted} />
            <Text variant="heading" style={{ marginTop: spacing.md }}>
              Usuario no encontrado
            </Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
              No pudimos resolver @{targetUsername}.
            </Text>
          </Card>
        </View>
      ) : query.isLoading && data.length === 0 ? (
        <ConnectionsSkeleton label={`Cargando ${title.toLowerCase()}`} />
      ) : (
        <FlatList<FollowProfile>
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConnectionRow
              user={item}
              currentUserId={me?.id ?? null}
              onPress={() =>
                router.push({ pathname: '/profile/[username]', params: { username: item.username } })
              }
              onFollowChange={handleFollowChange}
            />
          )}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            gap: spacing.sm,
          }}
          ListEmptyComponent={
            <Card padding="xl" style={{ alignItems: 'center' }}>
              <Icon name="users" size={32} color={colors.text.muted} />
              <Text variant="heading" style={{ marginTop: spacing.md }}>
                {type === 'followers' ? 'Aún no tienes seguidores' : 'Aún no sigues a nadie'}
              </Text>
              <Text
                variant="caption"
                tone="secondary"
                style={{ marginTop: spacing.xs, textAlign: 'center' }}
              >
                {type === 'followers'
                  ? 'Comparte tu perfil para empezar a ganar seguidores.'
                  : 'Descubre atletas para llenar tu feed.'}
              </Text>
            </Card>
          }
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary.DEFAULT}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function ConnectionsSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup
      accessibilityLabel={label}
      style={{ flex: 1, padding: spacing.lg, gap: spacing.sm }}
    >
      {[0, 1, 2, 3].map((i) => (
        <Card
          key={i}
          padding="md"
          style={{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <Skeleton width={44} height={44} borderRadius={radius.full} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton width="58%" height={14} />
            <Skeleton width="42%" height={10} />
          </View>
          <Skeleton width={72} height={32} />
        </Card>
      ))}
    </SkeletonGroup>
  );
}

function ConnectionRow({
  user,
  currentUserId,
  onPress,
  onFollowChange,
}: {
  user: FollowProfile;
  currentUserId: string | null;
  onPress: () => void;
  onFollowChange: (userId: string, next: boolean) => void;
}) {
  const info = rankInfo(user.currentRank);
  const isMe = currentUserId === user.id;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.8 }]}
    >
      <Card padding="md" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={user.displayName} size={44} borderColor={info.color} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {user.displayName}
            </Text>
            <Badge label={info.label} tone="muted" />
          </View>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            @{user.username} · {user.rankPoints.toLocaleString()} pts
          </Text>
        </View>
        {!isMe && (
          <FollowButton
            userId={user.id}
            isFollowing={user.isFollowing}
            size="sm"
            onChange={(next) => onFollowChange(user.id, next)}
            onChangeFailed={(restored) => onFollowChange(user.id, restored)}
          />
        )}
      </Card>
    </Pressable>
  );
}
