import { useMemo, useState } from 'react';
import { View, Pressable, FlatList, RefreshControl, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { RankBadge } from '@/components/RankBadge';
import { colors, radius, spacing, RANKS, RankId } from '@/theme/tokens';
import {
  useFeed,
  useFollow,
  useUnfollow,
  useIsFollowing,
  useFollowers,
  useFollowing,
  type Post,
} from '@/lib/queries/feed';
import { getProfile } from '@/lib/repos/profile';
import { useAppStore } from '@/store/app';
import { useToast } from '@/components/ui/Toast';
import { CommentSheet } from '@/components/feed/CommentSheet';

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

export default function PublicProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ username: string }>();
  const username = (params.username ?? '').toLowerCase();
  const me = useAppStore((s) => s.profile);

  const feedQuery = useFeed();
  const userPosts = useMemo(() => {
    const all = feedQuery.data?.pages.flatMap((p) => p.posts) ?? [];
    return all.filter((p) => p.user.username.toLowerCase() === username);
  }, [feedQuery.data, username]);

  // Derive userId from the first matching post in cache. If the user has no
  // posts in our local feed cache, we can't show much (no getProfileByUsername
  // helper exists in the repo layer, and adding one is out of scope).
  const derivedUserId = userPosts[0]?.userId ?? null;
  const derivedUser = userPosts[0]?.user ?? null;

  const profileQuery = useQuery({
    queryKey: ['public-profile', derivedUserId],
    queryFn: () => getProfile(derivedUserId!),
    enabled: !!derivedUserId,
  });

  const isFollowingQuery = useIsFollowing(derivedUserId ?? undefined);
  const followersQuery = useFollowers(derivedUserId ?? undefined);
  const followingQuery = useFollowing(derivedUserId ?? undefined);
  const follow = useFollow();
  const unfollow = useUnfollow();

  const [commentsPost, setCommentsPost] = useState<Post | null>(null);

  const onRefresh = () => {
    feedQuery.refetch();
    if (derivedUserId) {
      profileQuery.refetch();
      isFollowingQuery.refetch();
      followersQuery.refetch();
      followingQuery.refetch();
    }
  };

  const handleToggleFollow = () => {
    if (!derivedUserId) return;
    if (isFollowingQuery.data) {
      unfollow.mutate(derivedUserId, {
        onError: (err) =>
          toast.show({ message: err?.message ?? 'No se pudo dejar de seguir', tone: 'danger' }),
      });
    } else {
      follow.mutate(derivedUserId, {
        onError: (err) =>
          toast.show({ message: err?.message ?? 'No se pudo seguir', tone: 'danger' }),
      });
    }
  };

  const isSelf = !!me && me.id === derivedUserId;
  const followBusy = follow.isPending || unfollow.isPending;
  const isFollowingValue = !!isFollowingQuery.data;

  // No info at all
  if (!derivedUser || !derivedUserId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
        <StatusBar style="light" />
        <Header onBack={() => router.back()} title={`@${username}`} />
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
          <Card padding="xl" style={{ alignItems: 'center' }}>
            <Icon name="users" size={32} color={colors.text.muted} />
            <Text variant="heading" style={{ marginTop: spacing.md }}>
              Perfil no disponible
            </Text>
            <Text
              variant="caption"
              tone="secondary"
              style={{ marginTop: spacing.xs, textAlign: 'center' }}
            >
              Aún no tenemos posts de @{username} en tu feed.
              Vuelve a la pantalla de descubrir para encontrarlo.
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

  const info = rankInfo(profileQuery.data?.currentRank ?? derivedUser.currentRank);
  const rankPoints = profileQuery.data?.rankPoints ?? 0;
  const workoutCount = userPosts.filter((p) => p.type === 'workout').length;
  const followersCount = followersQuery.data?.length ?? 0;
  const followingCount = followingQuery.data?.length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />
      <Header onBack={() => router.back()} title={`@${derivedUser.username}`} />

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
                  uri={derivedUser.avatarUrl}
                  name={derivedUser.displayName}
                  size={72}
                  borderColor={info.color}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="title">{derivedUser.displayName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 }}>
                    <Badge label={info.label} tone="muted" />
                    <Text variant="caption" tone="muted">
                      @{derivedUser.username}
                    </Text>
                  </View>
                </View>
              </View>

              {profileQuery.data && (
                <View
                  style={{
                    marginTop: spacing.lg,
                    paddingTop: spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <RankBadge points={rankPoints} size="md" showProgress />
                </View>
              )}

              <View
                style={{
                  flexDirection: 'row',
                  marginTop: spacing.lg,
                  paddingTop: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="heading" weight="bold" numeric>{workoutCount}</Text>
                  <Text variant="label" tone="muted" style={{ marginTop: 2 }}>WORKOUTS</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="heading" weight="bold" numeric>{followersCount}</Text>
                  <Text variant="label" tone="muted" style={{ marginTop: 2 }}>SEGUIDORES</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="heading" weight="bold" numeric>{followingCount}</Text>
                  <Text variant="label" tone="muted" style={{ marginTop: 2 }}>SIGUIENDO</Text>
                </View>
              </View>

              {!isSelf && (
                <Button
                  title={isFollowingValue ? 'Siguiendo' : 'Seguir'}
                  variant={isFollowingValue ? 'secondary' : 'primary'}
                  onPress={handleToggleFollow}
                  loading={followBusy}
                  fullWidth
                  style={{ marginTop: spacing.lg }}
                />
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
          <Card padding="xl" style={{ alignItems: 'center', marginTop: spacing.md }}>
            <Icon name="image" size={32} color={colors.text.muted} />
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              Aún no hay publicaciones visibles.
            </Text>
          </Card>
        }
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
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
      <Pressable onPress={onBack} hitSlop={8}>
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
        <Text variant="caption" tone="muted">Perfil</Text>
        <Text variant="heading" numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

function PostCell({ post, onPress }: { post: Post; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          aspectRatio: 1,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.bg.elevated,
          borderWidth: 1,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.8 },
      ]}
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
    </Pressable>
  );
}
