import { useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Image } from 'react-native';
import { openInstagram } from '@/lib/linking';
import { PressableScale } from '@/components/ui/PressableScale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FollowButton } from '@/components/FollowButton';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Loader } from '@/components/ui/Loader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors, radius, spacing, RANKS, RankId } from '@/theme/tokens';
import {
  useIsFollowing,
  useFollowers,
  useFollowing,
  useUserPosts,
  type Post,
} from '@/lib/queries/feed';
import { useSearchUsers } from '@/lib/queries/search';
import { useAppStore } from '@/store/app';
import { CommentSheet } from '@/components/feed/CommentSheet';

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

export default function PublicProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ username: string }>();
  const username = (params.username ?? '').toLowerCase();
  const me = useAppStore((s) => s.profile);

  // BUG-3: search_users excluye auth.uid(), así que el propio usuario
  // nunca aparece en resultados. Detectar isSelf antes de la query y
  // usar me.id directamente en ese caso.
  const isSelf = !!me && me.username.toLowerCase() === username;

  // Pasar query vacía cuando isSelf → enabled=false (length < 2), no RPC.
  const searchQuery = useSearchUsers(isSelf ? '' : username);
  const matched = useMemo(() => {
    return (searchQuery.data ?? []).find((u) => u.username.toLowerCase() === username) ?? null;
  }, [searchQuery.data, username]);

  const targetUserId = isSelf
    ? me!.id
    : (searchQuery.data ?? []).find((u) => u.username.toLowerCase() === username)?.id;

  // Una vez tenemos el userId, cargamos todo lo que pinta la pantalla.
  const userPostsQuery = useUserPosts(targetUserId);
  const followersQuery = useFollowers(targetUserId);
  const followingQuery = useFollowing(targetUserId);
  const isFollowingQuery = useIsFollowing(isSelf ? undefined : targetUserId);

  const [commentsPost, setCommentsPost] = useState<Post | null>(null);

  const userPosts: Post[] = useMemo(
    () => userPostsQuery.data?.pages.flatMap((p) => p.posts) ?? [],
    [userPostsQuery.data],
  );

  const onRefresh = () => {
    if (!isSelf) searchQuery.refetch();
    if (targetUserId) {
      userPostsQuery.refetch();
      followersQuery.refetch();
      followingQuery.refetch();
      if (!isSelf) isFollowingQuery.refetch();
    }
  };

  const onEndReached = () => {
    if (userPostsQuery.hasNextPage && !userPostsQuery.isFetchingNextPage) {
      userPostsQuery.fetchNextPage();
    }
  };

  // Loading state: solo cuando resolvemos por búsqueda (no para propio perfil).
  if (!isSelf && searchQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
        <StatusBar style="light" />
        <Header onBack={() => router.back()} title={`@${username}`} />
        <Loader />
      </SafeAreaView>
    );
  }

  // Error de red al resolver el perfil por búsqueda: no degradar a un falso
  // "perfil no encontrado" (patrón C0 P2 — mensaje claro + Reintentar).
  // Con data cacheada que ya resolvió el perfil, el error de refetch no debe
  // tapar el contenido válido.
  if (!isSelf && searchQuery.isError && !matched) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
        <StatusBar style="light" />
        <Header onBack={() => router.back()} title={`@${username}`} />
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
          <ErrorState onRetry={() => searchQuery.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  // No encontrado (nunca ocurre cuando isSelf porque targetUserId = me.id).
  if (!targetUserId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
        <StatusBar style="light" />
        <Header onBack={() => router.back()} title={`@${username}`} />
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
          <Card padding="xl" style={{ alignItems: 'center' }}>
            <Icon name="users" size={32} color={colors.text.muted} />
            <Text variant="heading" style={{ marginTop: spacing.md }}>
              Perfil no encontrado
            </Text>
            <Text
              variant="caption"
              tone="secondary"
              style={{ marginTop: spacing.xs, textAlign: 'center' }}
            >
              No hay ningún atleta con el username @{username}.
            </Text>
            <Button
              title="Ir a Descubrir"
              variant="secondary"
              onPress={() => router.replace('/discover')}
              style={{ marginTop: spacing.lg }}
              fullWidth
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  // Perfil a mostrar: puede venir de la búsqueda o del store propio.
  const displayProfile = matched ?? {
    id: me!.id,
    username: me!.username,
    displayName: me!.displayName,
    currentRank: me!.currentRank,
    rankPoints: me!.rankPoints,
    followersCount: 0,
    isFollowing: false,
    instagramUsername: me!.instagramUsername ?? null,
    instagramVerified: me!.instagramVerified ?? false,
  };

  const info = rankInfo(displayProfile.currentRank);
  const isFollowingValue = !!isFollowingQuery.data;
  const followersCount = followersQuery.data?.length ?? displayProfile.followersCount;
  const followingCount = followingQuery.data?.length ?? 0;
  const postsCount = userPosts.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />
      <Header onBack={() => router.back()} title={`@${displayProfile.username}`} />

      <FlatList<Post>
        data={userPosts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.sm,
        }}
        ListHeaderComponent={
          <View>
            <Card padding="lg">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                <Avatar
                  name={displayProfile.displayName}
                  size={72}
                  borderColor={info.color}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="title">{displayProfile.displayName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 }}>
                    <Badge label={info.label} tone="muted" />
                    <Text variant="caption" tone="muted">
                      @{displayProfile.username}
                    </Text>
                  </View>
                  {!!displayProfile.instagramUsername && (
                    <PressableScale
                      onPress={() => openInstagram(displayProfile.instagramUsername!)}
                      hitSlop={6}
                      pressScale={0.93}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 6,
                        alignSelf: 'flex-start',
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        borderRadius: radius.full,
                        backgroundColor: colors.social.instagramSoft,
                        borderWidth: 1,
                        borderColor: colors.social.instagramBorder,
                      }}
                    >
                      <Icon name="instagram" size={12} color={colors.social.instagram} />
                      <Text variant="caption" weight="semibold" style={{ color: colors.social.instagram, fontSize: 11 }}>
                        @{displayProfile.instagramUsername}
                      </Text>
                    </PressableScale>
                  )}
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  marginTop: spacing.lg,
                  paddingTop: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <PressableScale
                  hitSlop={6}
                  haptic={false}
                  pressScale={0.95}
                  onPress={() =>
                    router.push({
                      pathname: '/profile/connections',
                      params: { username: displayProfile.username, type: 'followers' },
                    })
                  }
                  style={{ flex: 1, alignItems: 'center' }}
                >
                  <Text variant="heading" weight="bold" numeric>{followersCount}</Text>
                  <Text variant="label" tone="muted" style={{ marginTop: 2 }}>SEGUIDORES</Text>
                </PressableScale>
                <PressableScale
                  hitSlop={6}
                  haptic={false}
                  pressScale={0.95}
                  onPress={() =>
                    router.push({
                      pathname: '/profile/connections',
                      params: { username: displayProfile.username, type: 'following' },
                    })
                  }
                  style={{ flex: 1, alignItems: 'center' }}
                >
                  <Text variant="heading" weight="bold" numeric>{followingCount}</Text>
                  <Text variant="label" tone="muted" style={{ marginTop: 2 }}>SIGUIENDO</Text>
                </PressableScale>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="heading" weight="bold" numeric>{postsCount}</Text>
                  <Text variant="label" tone="muted" style={{ marginTop: 2 }}>POSTS</Text>
                </View>
              </View>

              {!isSelf && (
                <View style={{ marginTop: spacing.lg }}>
                  <FollowButton
                    userId={targetUserId as string}
                    isFollowing={isFollowingValue}
                    size="md"
                  />
                </View>
              )}
            </Card>

            <Text variant="label" tone="secondary" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
              Publicaciones
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCell post={item} onPress={() => setCommentsPost(item)} />
        )}
        ListEmptyComponent={
          userPostsQuery.isLoading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{ width: '47%', aspectRatio: 1, flexGrow: 1 }}>
                  <Skeleton width="100%" height="100%" radius={radius.lg} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="image"
              title="Aún no hay publicaciones"
              style={{ marginTop: spacing.md }}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={userPostsQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      <CommentSheet
        visible={!!commentsPost}
        postId={commentsPost?.id ?? null}
        postOwnerId={commentsPost?.userId ?? null}
        currentUserId={me?.id ?? null}
        onClose={() => setCommentsPost(null)}
      />
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        gap: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <IconButton icon="chevron-left" onPress={onBack} iconSize={18} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone="muted">Perfil</Text>
        <Text variant="heading" numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

function PostCell({ post, onPress }: { post: Post; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      pressScale={0.96}
      haptic={false}
      style={{
        flex: 1,
        aspectRatio: 1,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.bg.elevated,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {post.photoUrl ? (
        <Image source={{ uri: post.photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, padding: spacing.md, justifyContent: 'space-between' }}>
          <Icon
            name={
              post.type === 'pr' ? 'trophy'
              : post.type === 'rank_up' ? 'lightning'
              : post.type === 'streak' ? 'fire'
              : post.type === 'achievement' ? 'target'
              : 'dumbbell'
            }
            size={20}
            color={
              post.type === 'pr' ? colors.accent.DEFAULT
              : post.type === 'rank_up' ? colors.primary.DEFAULT
              : post.type === 'streak' ? colors.accent.DEFAULT
              : post.type === 'achievement' ? colors.info.DEFAULT
              : colors.primary.DEFAULT
            }
          />
          <Text variant="caption" weight="semibold" numberOfLines={3}>
            {post.title ?? post.caption ?? ''}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}
