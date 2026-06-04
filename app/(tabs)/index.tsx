import { useCallback, useMemo, useState } from 'react';
import { View, Pressable, RefreshControl, ActivityIndicator, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { colors, radius, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { FeedItem } from '@/components/feed/FeedItem';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { FeedEmptyState, FeedErrorState } from '@/components/feed/FeedEmptyState';
import { CommentSheet } from '@/components/feed/CommentSheet';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import {
  useFeed,
  useToggleReaction,
  useDeletePost,
  useIncrementShare,
  type Post,
  type ReactionKind,
} from '@/lib/queries/feed';
import { useFeedRealtime } from '@/lib/queries/useFeedRealtime';
import { useUnreadCount } from '@/lib/queries/notifications';

function CoachFab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.info.soft,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.info.DEFAULT,
        }}
      >
        <Icon name="robot" size={20} color={colors.info.DEFAULT} />
      </View>
    </Pressable>
  );
}

function ComposerAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: 'transparent',
        },
        pressed && !disabled && { backgroundColor: colors.bg.elevated },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Icon name={icon} size={16} color={colors.text.primary} />
      <Text variant="caption" weight="semibold">
        {label}
      </Text>
    </Pressable>
  );
}

function Composer({
  displayName,
  avatarUrl,
  onOpenManual,
  onShareWorkout,
  onShareWorkoutDisabled,
  onSharePR,
}: {
  displayName: string;
  avatarUrl?: string;
  onOpenManual: () => void;
  onShareWorkout: () => void;
  onShareWorkoutDisabled: boolean;
  onSharePR: () => void;
}) {
  return (
    <Card padding="lg" style={{ marginBottom: spacing.md }}>
      <Pressable
        onPress={onOpenManual}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Avatar uri={avatarUrl} name={displayName} size={40} />
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg.elevated,
          }}
        >
          <Text tone="muted">¿Qué lograste hoy?</Text>
        </View>
      </Pressable>

      <View
        style={{
          flexDirection: 'row',
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: spacing.xs,
        }}
      >
        <ComposerAction icon="image" label="Foto" onPress={onOpenManual} />
        <ComposerAction
          icon="dumbbell"
          label="Workout"
          onPress={onShareWorkout}
          disabled={onShareWorkoutDisabled}
        />
        <ComposerAction icon="trophy" label="PR" onPress={onSharePR} />
      </View>
    </Card>
  );
}

export default function FeedHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const profile = useAppStore((s) => s.profile);
  const history = useWorkoutsStore((s) => s.history);

  const feedQuery = useFeed();
  const toggleReaction = useToggleReaction();
  const deletePost = useDeletePost();
  const incrementShare = useIncrementShare();

  useFeedRealtime();

  const [commentsPost, setCommentsPost] = useState<Post | null>(null);

  const posts: Post[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Post[] = [];
    for (const p of feedQuery.data?.pages.flatMap((pg) => pg.posts) ?? []) {
      if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
    }
    return out;
  }, [feedQuery.data]);

  // Latest finished workout within 7 days (for composer "share workout" shortcut)
  const recentWorkout = useMemo(() => {
    const candidate = history.find((w) => {
      const end = w.endedAt ?? w.startedAt;
      const age = Date.now() - new Date(end).getTime();
      return age >= 0 && age < 7 * 24 * 3600 * 1000;
    });
    return candidate ?? null;
  }, [history]);

  const { refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = feedQuery;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleToggleReaction = useCallback(
    (postId: string, reaction: ReactionKind) => {
      toggleReaction.mutate(
        { postId, reaction },
        {
          onError: (err) =>
            toast.show({
              message: err?.message ?? 'No se pudo guardar tu reacción',
              tone: 'danger',
            }),
        },
      );
    },
    [toggleReaction, toast],
  );

  const handleDelete = useCallback(
    (post: Post) => {
      deletePost.mutate(post.id, {
        onSuccess: () => toast.show({ message: 'Post eliminado', tone: 'success' }),
        onError: (err) =>
          toast.show({ message: err?.message ?? 'No se pudo eliminar', tone: 'danger' }),
      });
    },
    [deletePost, toast],
  );

  const handleOpenComments = useCallback((post: Post) => {
    setCommentsPost(post);
  }, []);

  const handleShare = useCallback(
    async (post: Post) => {
      const title = post.title ?? 'Mira esto en Gmo';
      const message = post.caption
        ? `${title} — ${post.caption}\n\nCompartido desde Gmo Training App`
        : `${title}\n\nCompartido desde Gmo Training App`;
      try {
        const result = await Share.share({ message, title });
        if (result.action !== Share.dismissedAction) {
          incrementShare.mutate(post.id, {
            onError: () => {
              // Optimistic increment ya se revierte solo en onError del hook.
            },
          });
        }
      } catch (err) {
        toast.show({
          message: (err as Error)?.message ?? 'No se pudo compartir',
          tone: 'danger',
        });
      }
    },
    [incrementShare, toast],
  );

  const handleOpenProfile = useCallback(
    (post: Post) => {
      router.push({
        pathname: '/profile/[username]',
        params: { username: post.user.username },
      });
    },
    [router],
  );

  const goManualPublish = useCallback(() => router.push('/publish'), [router]);
  const goShareWorkout = useCallback(() => {
    if (!recentWorkout) return;
    router.push({
      pathname: '/publish',
      params: { mode: 'workout' },
    });
  }, [router, recentWorkout]);
  const goSharePR = useCallback(
    () => router.push({ pathname: '/publish', params: { mode: 'pr' } }),
    [router],
  );

  const goDiscover = useCallback(() => router.push('/discover'), [router]);
  const goNotifications = useCallback(() => router.push('/notifications'), [router]);
  const goCoach = useCallback(() => router.push('/coach'), [router]);

  const { data: unreadCount = 0 } = useUnreadCount();

  const isInitialLoading = feedQuery.isLoading && posts.length === 0;
  const hasError = !!feedQuery.error && posts.length === 0;
  const isEmpty = !isInitialLoading && !hasError && posts.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Sticky header */}
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
          backgroundColor: colors.bg.base,
        }}
      >
        <CoachFab onPress={goCoach} />
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">Hola,</Text>
          <Text variant="heading" numberOfLines={1}>
            {profile?.displayName ?? 'Atleta'}
          </Text>
        </View>
        {/* Bell icon with unread badge */}
        <Pressable onPress={goNotifications} hitSlop={8}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.bg.elevated,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="bell" size={18} color={colors.text.primary} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                }}
              >
                <Text
                  variant="label"
                  style={{ color: '#fff', fontSize: 9, lineHeight: 12 }}
                >
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable onPress={goDiscover} hitSlop={8}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.bg.elevated,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="search" size={18} color={colors.text.primary} />
          </View>
        </Pressable>
      </View>

      {isInitialLoading ? (
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + 100,
          }}
        >
          <Composer
            displayName={profile?.displayName ?? 'Atleta'}
            avatarUrl={profile?.avatarUrl}
            onOpenManual={goManualPublish}
            onShareWorkout={goShareWorkout}
            onShareWorkoutDisabled={!recentWorkout}
            onSharePR={goSharePR}
          />
          <FeedSkeleton count={3} />
        </View>
      ) : hasError ? (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <FeedErrorState
            message={feedQuery.error?.message}
            onRetry={onRefresh}
          />
        </View>
      ) : (
        <FlashList<Post>
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedItem
              post={item}
              isMine={item.userId === profile?.id}
              onToggleReaction={handleToggleReaction}
              onDelete={handleDelete}
              onOpenComments={handleOpenComments}
              onShare={handleShare}
              onOpenProfile={handleOpenProfile}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + 100,
          }}
          ListHeaderComponent={
            <Composer
              displayName={profile?.displayName ?? 'Atleta'}
              avatarUrl={profile?.avatarUrl}
              onOpenManual={goManualPublish}
              onShareWorkout={goShareWorkout}
              onShareWorkoutDisabled={!recentWorkout}
              onSharePR={goSharePR}
            />
          }
          ListEmptyComponent={isEmpty ? <FeedEmptyState onDiscover={goDiscover} /> : null}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary.DEFAULT} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={feedQuery.isRefetching && !isFetchingNextPage}
              onRefresh={onRefresh}
              tintColor={colors.primary.DEFAULT}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CommentSheet
        visible={!!commentsPost}
        postId={commentsPost?.id ?? null}
        postOwnerId={commentsPost?.userId ?? null}
        currentUserId={profile?.id ?? null}
        onClose={() => setCommentsPost(null)}
      />
    </SafeAreaView>
  );
}
