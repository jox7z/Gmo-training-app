import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  View,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { colors, radius, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { FeedItem } from '@/components/feed/FeedItem';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import {
  SocialStreamColumn,
  type SocialLayout,
} from '@/components/social/SocialStreamColumn';
import { FeedEmptyState, FeedErrorState } from '@/components/feed/FeedEmptyState';
import { CommentSheet } from '@/components/feed/CommentSheet';
import { WorkoutLaunchCTA } from '@/components/feed/WorkoutLaunchCTA';
import { StaticPullToRefresh } from '@/components/feed/StaticPullToRefresh';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { useRoutinesStore } from '@/store/routines';
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
import { nextRoutineDay } from '@/lib/routineSchedule';
import { formatPostShareMessage } from '@/lib/postSharing';

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
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      pressScale={0.94}
      haptic={false}
      style={[
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: 'transparent',
        },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Icon name={icon} size={16} color={colors.text.primary} />
      <Text variant="caption" weight="semibold">
        {label}
      </Text>
    </PressableScale>
  );
}

function Composer({
  displayName,
  avatarUrl,
  onOpenManual,
  onShareWorkout,
  onShareWorkoutDisabled,
  onSharePR,
  layout = 'contained',
}: {
  displayName: string;
  avatarUrl?: string;
  onOpenManual: () => void;
  onShareWorkout: () => void;
  onShareWorkoutDisabled: boolean;
  onSharePR: () => void;
  layout?: SocialLayout;
}) {
  return (
    <SocialStreamColumn
      layout={layout}
      style={{ marginBottom: layout === 'stream' ? spacing.sm : spacing.md }}
    >
      <Card variant={layout === 'stream' ? 'stream' : 'raised'} padding="lg">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Crear publicación"
        accessibilityHint="Abre el compositor para compartir una foto o actualización"
        onPress={onOpenManual}
        pressScale={0.98}
        haptic={false}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        <Avatar uri={avatarUrl} name={displayName} size={40} />
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg.elevated,
          }}
        >
          <Text tone="muted">¿Qué lograste hoy?</Text>
        </View>
      </PressableScale>

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
    </SocialStreamColumn>
  );
}

export default function FeedHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const profile = useAppStore((s) => s.profile);
  const history = useWorkoutsStore((s) => s.history);
  const activeWorkout = useWorkoutsStore((s) => s.active);
  const routines = useRoutinesStore((s) => s.routines);
  const activeRoutineId = useRoutinesStore((s) => s.activeRoutineId);

  const feedQuery = useFeed();
  const toggleReaction = useToggleReaction();
  const deletePost = useDeletePost();
  const incrementShare = useIncrementShare();

  useFeedRealtime();

  const [commentsPost, setCommentsPost] = useState<Post | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const manualRefreshLock = useRef(false);

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
      return !w.isPublished && age >= 0 && age < 7 * 24 * 3600 * 1000;
    });
    return candidate ?? null;
  }, [history]);

  const workoutLaunch = useMemo(() => {
    const selectedRoutine =
      routines.find((routine) => routine.id === activeRoutineId) ?? routines[0] ?? null;

    if (activeWorkout) {
      const workoutRoutine =
        routines.find((routine) =>
          routine.days.some((day) => day.id === activeWorkout.routineDayId),
        ) ?? null;
      const workoutDay =
        workoutRoutine?.days.find((day) => day.id === activeWorkout.routineDayId) ??
        workoutRoutine?.days[0] ??
        null;
      const completedSets = activeWorkout.exercises.reduce(
        (total, exercise) =>
          total + exercise.sets.filter((set) => set.isCompleted).length,
        0,
      );
      const totalSets = activeWorkout.exercises.reduce(
        (total, exercise) => total + exercise.sets.length,
        0,
      );

      return {
        active: true,
        title: 'Continuar entrenamiento',
        detail:
          totalSets > 0
            ? `${activeWorkout.routineName ?? workoutRoutine?.name ?? 'Sesión activa'} · ${completedSets}/${totalSets} series`
            : activeWorkout.routineName ?? workoutRoutine?.name ?? 'Sesión activa',
        routineId: workoutRoutine?.id ?? null,
        dayId: workoutDay?.id ?? null,
      };
    }

    const nextDay = nextRoutineDay(selectedRoutine, history);

    return {
      active: false,
      title: nextDay ? `Empezar ${nextDay.name}` : 'Empezar entrenamiento',
      detail: selectedRoutine
        ? selectedRoutine.name
        : 'Elige una rutina para comenzar',
      routineId: selectedRoutine?.id ?? null,
      dayId: nextDay?.id ?? null,
    };
  }, [activeRoutineId, activeWorkout, history, routines]);

  const { refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = feedQuery;

  const onRefresh = useCallback(async () => {
    if (manualRefreshLock.current) return;
    manualRefreshLock.current = true;
    setManualRefreshing(true);
    AccessibilityInfo.announceForAccessibility('Actualizando feed');
    try {
      const result = await refetch();
      if (result.error) throw result.error;
      AccessibilityInfo.announceForAccessibility('Feed actualizado');
    } catch (error) {
      AccessibilityInfo.announceForAccessibility(
        'No se pudo actualizar el feed',
      );
      toast.show({
        message:
          (error as Error)?.message ?? 'No se pudo actualizar el feed',
        tone: 'danger',
      });
      throw error;
    } finally {
      manualRefreshLock.current = false;
      setManualRefreshing(false);
    }
  }, [refetch, toast]);

  const refreshFromButton = useCallback(() => {
    void onRefresh().catch(() => undefined);
  }, [onRefresh]);

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
      const title = post.title ?? 'Mira esto en GMO';
      const message = formatPostShareMessage(post, profile?.unit ?? 'kg');
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
    [incrementShare, profile?.unit, toast],
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
  const goWorkout = useCallback(() => {
    if (workoutLaunch.active) {
      if (workoutLaunch.routineId && workoutLaunch.dayId) {
        router.push({
          pathname: '/workout/active',
          params: {
            routineId: workoutLaunch.routineId,
            dayId: workoutLaunch.dayId,
          },
        });
      } else {
        router.push('/workout/active');
      }
      return;
    }
    if (workoutLaunch.routineId && workoutLaunch.dayId) {
      router.push({
        pathname: '/workout/active',
        params: {
          routineId: workoutLaunch.routineId,
          dayId: workoutLaunch.dayId,
        },
      });
      return;
    }
    router.push('/routine/templates');
  }, [router, workoutLaunch.active, workoutLaunch.dayId, workoutLaunch.routineId]);

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
          gap: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg.base,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">Hola,</Text>
          <Text variant="heading" numberOfLines={1}>
            {profile?.displayName ?? 'Atleta'}
          </Text>
        </View>
        <IconButton
          name="robot"
          accessibilityLabel="Actualizar feed"
          accessibilityHint="Actualiza las publicaciones sin mover la lista"
          onPress={refreshFromButton}
          variant="surface"
          size="md"
          disabled={manualRefreshing}
          iconColor={colors.primary.DEFAULT}
          haptic={false}
        />
        {/* Bell icon with unread badge */}
        <PressableScale onPress={goNotifications} hitSlop={8} pressScale={0.9} haptic={false}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
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
                  borderRadius: radius.sm,
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
        </PressableScale>

        <PressableScale onPress={goDiscover} hitSlop={8} pressScale={0.9} haptic={false}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
              backgroundColor: colors.bg.elevated,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="search" size={18} color={colors.text.primary} />
          </View>
        </PressableScale>
      </View>

      {isInitialLoading ? (
        <View
          style={{
            flex: 1,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + 200,
          }}
        >
          <Composer
            displayName={profile?.displayName ?? 'Atleta'}
            avatarUrl={profile?.avatarUrl}
            onOpenManual={goManualPublish}
            onShareWorkout={goShareWorkout}
            onShareWorkoutDisabled={!recentWorkout}
            onSharePR={goSharePR}
            layout="stream"
          />
          <FeedSkeleton count={3} layout="stream" />
        </View>
      ) : hasError ? (
        <View style={{ flex: 1, paddingTop: spacing.lg }}>
          <SocialStreamColumn style={{ paddingHorizontal: spacing.lg }}>
            <FeedErrorState
              message={feedQuery.error?.message}
              onRetry={refreshFromButton}
            />
          </SocialStreamColumn>
        </View>
      ) : (
        <StaticPullToRefresh
          refreshing={manualRefreshing}
          onRefresh={onRefresh}
        >
          {(pullProps) => (
            <FlashList<Post>
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <FeedItem
                  post={item}
                  layout="stream"
                  isMine={item.userId === profile?.id}
                  onToggleReaction={handleToggleReaction}
                  onDelete={handleDelete}
                  onOpenComments={handleOpenComments}
                  onShare={handleShare}
                  onOpenProfile={handleOpenProfile}
                />
              )}
              contentContainerStyle={{
                paddingTop: spacing.lg,
                paddingBottom: insets.bottom + 200,
              }}
              ListHeaderComponent={
                <Composer
                  displayName={profile?.displayName ?? 'Atleta'}
                  avatarUrl={profile?.avatarUrl}
                  onOpenManual={goManualPublish}
                  onShareWorkout={goShareWorkout}
                  onShareWorkoutDisabled={!recentWorkout}
                  onSharePR={goSharePR}
                  layout="stream"
                />
              }
              ListEmptyComponent={
                isEmpty ? (
                  <SocialStreamColumn style={{ paddingHorizontal: spacing.lg }}>
                    <FeedEmptyState onDiscover={goDiscover} />
                  </SocialStreamColumn>
                ) : null
              }
              ListFooterComponent={
                isFetchingNextPage ? (
                  <SocialStreamColumn>
                    <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                      <ActivityIndicator color={colors.primary.DEFAULT} />
                    </View>
                  </SocialStreamColumn>
                ) : null
              }
              {...pullProps}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.5}
              showsVerticalScrollIndicator={false}
            />
          )}
        </StaticPullToRefresh>
      )}

      <WorkoutLaunchCTA
        active={workoutLaunch.active}
        title={workoutLaunch.title}
        detail={workoutLaunch.detail}
        bottom={insets.bottom + 82}
        onPress={goWorkout}
      />

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
