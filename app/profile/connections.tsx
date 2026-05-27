import { useMemo } from 'react';
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
import { Loader } from '@/components/ui/Loader';
import { colors, spacing, RANKS, RankId } from '@/theme/tokens';
import { useAppStore } from '@/store/app';
import {
  useFollowers,
  useFollowing,
} from '@/lib/queries/feed';
import { useSearchUsers } from '@/lib/queries/search';
import type { FollowProfile } from '@/lib/repos/social';

type ConnectionType = 'followers' | 'following';

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
  const data = useMemo(() => query.data ?? [], [query.data]);

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
          <Text variant="caption" tone="muted">{subtitle}</Text>
          <Text variant="heading">{title}</Text>
        </View>
        {data.length > 0 && (
          <Text variant="caption" tone="muted" numeric>{data.length}</Text>
        )}
      </View>

      {searchQuery.isLoading && !isSelf ? (
        <Loader />
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
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.sm }}>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} padding="lg" style={{ height: 72 }} />
          ))}
        </View>
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
              onRefresh={() => query.refetch()}
              tintColor={colors.primary.DEFAULT}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function ConnectionRow({
  user,
  currentUserId,
  onPress,
}: {
  user: FollowProfile;
  currentUserId: string | null;
  onPress: () => void;
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
          />
        )}
      </Card>
    </Pressable>
  );
}
