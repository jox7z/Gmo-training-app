import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Share,
  View,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AchievementMedal } from '@/components/achievements/AchievementMedal';
import { ActivityFiltersSheet } from '@/components/profile/ActivityFiltersSheet';
import { StaticPullToRefresh } from '@/components/feed/StaticPullToRefresh';
import { Avatar } from '@/components/Avatar';
import { CommentSheet } from '@/components/feed/CommentSheet';
import { FeedItem } from '@/components/feed/FeedItem';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { Icon, type IconName } from '@/components/Icon';
import { WorkoutResultsModal } from '@/components/WorkoutResultsModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { Loader } from '@/components/ui/Loader';
import { PressableScale } from '@/components/ui/PressableScale';
import { Stat } from '@/components/ui/Stat';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import {
  evaluateAchievements,
  type AchievementProgress,
} from '@/lib/achievements';
import { formatPostShareMessage } from '@/lib/postSharing';
import {
  DEFAULT_WORKOUT_HISTORY_FILTERS,
  filterWorkoutHistory,
  type WorkoutHistoryFilters,
} from '@/lib/workoutHistoryFilters';
import {
  useDeletePost,
  useIncrementShare,
  useToggleReaction,
  type Post,
  type ReactionKind,
} from '@/lib/queries/feed';
import { useProfileCounters } from '@/lib/queries/profile';
import { useUserPosts } from '@/lib/queries/social';
import { useAppStore } from '@/store/app';
import { useMainTabsStore } from '@/store/mainTabs';
import { useWorkoutsStore, type Workout } from '@/store/workouts';
import { RANK_IMAGES } from '@/theme/rankImages';
import { colors, radius, rankFromPoints, spacing } from '@/theme/tokens';

type ProfileTab = 'posts' | 'activity' | 'achievements';

type ProfileRow =
  | { kind: 'tabs' }
  | { kind: 'activity-filters' }
  | { kind: 'post'; post: Post }
  | { kind: 'workout'; workout: Workout }
  | { kind: 'achievement'; achievement: AchievementProgress };

const TABS: { key: ProfileTab; label: string; icon: IconName }[] = [
  { key: 'posts', label: 'Publicaciones', icon: 'image' },
  { key: 'activity', label: 'Actividad', icon: 'dumbbell' },
  { key: 'achievements', label: 'Logros', icon: 'medal' },
];

const STICKY_HEADER_INDICES = [0];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const profile = useAppStore((state) => state.profile);
  const streakWeeks = useAppStore((state) => state.streakWeeks);
  const requestTab = useMainTabsStore((state) => state.requestTab);
  const workoutHistory = useWorkoutsStore((state) => state.history);

  const countersQuery = useProfileCounters(profile?.id);
  const userPostsQuery = useUserPosts(profile?.id);
  const toggleReaction = useToggleReaction();
  const deletePost = useDeletePost();
  const incrementShare = useIncrementShare();

  const [commentsPost, setCommentsPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [activityFilters, setActivityFilters] = useState<WorkoutHistoryFilters>(
    DEFAULT_WORKOUT_HISTORY_FILTERS,
  );
  const [activityFiltersVisible, setActivityFiltersVisible] = useState(false);
  const listRef = useRef<FlashListRef<ProfileRow>>(null);
  const activityFiltersTriggerRef = useRef<View>(null);

  const userPosts = useMemo(() => {
    const seen = new Set<string>();
    return (userPostsQuery.data?.pages.flatMap((page) => page.posts) ?? []).filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [userPostsQuery.data]);

  const achievements = useMemo(
    () =>
      evaluateAchievements({
        history: workoutHistory,
        weeklyGoalDays: profile?.weeklyGoalDays,
      }),
    [profile?.weeklyGoalDays, workoutHistory],
  );
  const filteredActivity = useMemo(
    () => filterWorkoutHistory(workoutHistory, activityFilters),
    [activityFilters, workoutHistory],
  );

  const rows = useMemo<ProfileRow[]>(() => {
    const nextRows: ProfileRow[] = [{ kind: 'tabs' }];
    if (activeTab === 'posts') {
      nextRows.push(...userPosts.map((post) => ({ kind: 'post' as const, post })));
      return nextRows;
    }
    if (activeTab === 'activity') {
      nextRows.push({ kind: 'activity-filters' });
      nextRows.push(
        ...filteredActivity.map((workout) => ({ kind: 'workout' as const, workout })),
      );
      return nextRows;
    }
    nextRows.push(
      ...achievements.map((achievement) => ({
        kind: 'achievement' as const,
        achievement,
      })),
    );
    return nextRows;
  }, [achievements, activeTab, filteredActivity, userPosts]);

  const handleSelectTab = useCallback(
    (tab: ProfileTab) => {
      if (tab === activeTab) return;
      listRef.current?.scrollToIndex({ index: 0, animated: false });
      setActiveTab(tab);
    },
    [activeTab],
  );

  const onRefresh = useCallback(() => {
    if (activeTab !== 'posts') return;
    void Promise.all([userPostsQuery.refetch(), countersQuery.refetch()]);
  }, [activeTab, countersQuery, userPostsQuery]);

  const onEndReached = useCallback(() => {
    if (
      activeTab === 'posts' &&
      userPostsQuery.hasNextPage &&
      !userPostsQuery.isFetchingNextPage
    ) {
      void userPostsQuery.fetchNextPage();
    }
  }, [activeTab, userPostsQuery]);

  const handleToggleReaction = useCallback(
    (postId: string, reaction: ReactionKind) => {
      toggleReaction.mutate(
        { postId, reaction },
        {
          onError: (error) =>
            toast.show({
              message: error.message || 'No se pudo guardar tu reacción',
              tone: 'danger',
            }),
        },
      );
    },
    [toast, toggleReaction],
  );

  const handleDelete = useCallback(
    (post: Post) => {
      deletePost.mutate(post.id, {
        onSuccess: () => {
          if (commentsPost?.id === post.id) setCommentsPost(null);
          toast.show({ message: 'Publicación eliminada', tone: 'success' });
        },
        onError: (error) =>
          toast.show({
            message: error.message || 'No se pudo eliminar la publicación',
            tone: 'danger',
          }),
      });
    },
    [commentsPost?.id, deletePost, toast],
  );

  const handleSharePost = useCallback(
    async (post: Post) => {
      try {
        const result = await Share.share({
          title: post.title ?? 'Mira esto en GMO',
          message: formatPostShareMessage(post, profile?.unit ?? 'kg'),
        });
        if (result.action !== Share.dismissedAction) {
          incrementShare.mutate(post.id);
        }
      } catch (error) {
        toast.show({
          message: (error as Error)?.message ?? 'No se pudo compartir',
          tone: 'danger',
        });
      }
    },
    [incrementShare, profile?.unit, toast],
  );

  const handleShareProfile = useCallback(async () => {
    if (!profile) return;
    try {
      await Share.share({
        message: `Sígueme en Gmo Training: gmo://profile/${profile.username}`,
      });
    } catch (error) {
      toast.show({
        message: (error as Error)?.message ?? 'No se pudo compartir',
        tone: 'danger',
      });
    }
  }, [profile, toast]);

  const handleShareProfileFromMenu = useCallback(() => {
    setProfileMenuVisible(false);
    void handleShareProfile();
  }, [handleShareProfile]);

  const handleOpenSettings = useCallback(() => {
    setProfileMenuVisible(false);
    router.push('/profile/settings');
  }, [router]);

  const goToRoutines = useCallback(() => {
    requestTab('routines');
  }, [requestTab]);

  if (!profile) return <Loader />;

  const rank = rankFromPoints(profile.rankPoints);
  const isInitialPostsLoading =
    activeTab === 'posts' && userPostsQuery.isLoading && userPosts.length === 0;
  const hasPostsError =
    activeTab === 'posts' && userPostsQuery.isError && userPosts.length === 0;
  const refreshing =
    activeTab === 'posts' &&
    (userPostsQuery.isRefetching || countersQuery.isRefetching) &&
    !userPostsQuery.isFetchingNextPage;

  const emptyState = isInitialPostsLoading ? (
    <FeedSkeleton count={2} layout="stream" />
  ) : hasPostsError ? (
    <TabState
      icon="close"
      title="No se pudieron cargar tus publicaciones"
      message={userPostsQuery.error?.message ?? 'Revisa tu conexión e inténtalo de nuevo.'}
      action="Reintentar"
      onAction={onRefresh}
      tone="danger"
    />
  ) : activeTab === 'posts' ? (
    <TabState
      icon="image"
      title="Aún no hay publicaciones"
      message="Comparte un entrenamiento, un logro o una actualización."
      action="Crear publicación"
      onAction={() => router.push('/publish')}
    />
  ) : activeTab === 'activity' && workoutHistory.length === 0 ? (
    <TabState
      icon="dumbbell"
      title="Aún no hay actividad"
      message="Tus entrenamientos terminados aparecerán aquí."
      action="Ir a rutinas"
      onAction={goToRoutines}
    />
  ) : activeTab === 'activity' ? (
    <TabState
      icon="filter"
      title="Sin sesiones con estos filtros"
      message="Prueba con otro periodo, ejercicio o rutina."
      action="Limpiar filtros"
      onAction={() => setActivityFilters(DEFAULT_WORKOUT_HISTORY_FILTERS)}
    />
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      <View
        style={{
          width: '100%',
          maxWidth: 600,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 56,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>Perfil</Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            @{profile.username}
          </Text>
        </View>
        <IconButton
          name="more"
          accessibilityLabel="Más opciones"
          accessibilityHint="Abre las opciones para compartir el perfil o ir a ajustes"
          onPress={() => setProfileMenuVisible(true)}
          variant="ghost"
          size="md"
        />
      </View>

      <StaticPullToRefresh
        refreshing={refreshing}
        onRefresh={onRefresh}
        label="Actualizando perfil"
      >
        {(pullProps) => (
      <FlashList<ProfileRow>
        ref={listRef}
        data={rows}
        extraData={{ activeTab, activityFilters }}
        stickyHeaderIndices={STICKY_HEADER_INDICES}
        keyExtractor={(item) => {
          if (item.kind === 'tabs') return 'profile-tabs';
          if (item.kind === 'activity-filters') return 'profile-activity-filters';
          if (item.kind === 'post') return `post-${item.post.id}`;
          if (item.kind === 'workout') return `workout-${item.workout.id}`;
          return `achievement-${item.achievement.def.id}`;
        }}
        getItemType={(item) => item.kind}
        renderItem={({ item, index }) => {
          if (item.kind === 'tabs') {
            return <ProfileTabs activeTab={activeTab} onSelect={handleSelectTab} />;
          }

          if (item.kind === 'post') {
            return (
              <FeedItem
                post={item.post}
                layout="stream"
                isMine
                onToggleReaction={handleToggleReaction}
                onDelete={handleDelete}
                onOpenComments={setCommentsPost}
                onShare={handleSharePost}
                onOpenProfile={(post) =>
                  router.push({
                    pathname: '/profile/[username]',
                    params: { username: post.user.username },
                  })
                }
              />
            );
          }

          if (item.kind === 'activity-filters') {
            return (
              <ActivityFiltersControl
                activeCount={countActivityFilters(activityFilters)}
                onPress={() => setActivityFiltersVisible(true)}
                focusRef={activityFiltersTriggerRef}
              />
            );
          }

          if (item.kind === 'workout') {
            return (
              <View
                style={{
                  width: '100%',
                  maxWidth: 600,
                  alignSelf: 'center',
                  paddingHorizontal: spacing.lg,
                  paddingTop: index === 2 ? spacing.md : 0,
                  paddingBottom: spacing.md,
                }}
              >
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${item.workout.routineName ?? 'entrenamiento libre'}`}
                  accessibilityHint="Muestra el registro completo de la sesión"
                  onPress={() => setSelectedWorkout(item.workout)}
                  pressScale={0.98}
                  haptic={false}
                >
                  <WorkoutHistoryCard workout={item.workout} />
                </PressableScale>
              </View>
            );
          }

          return (
            <View
              style={{
                width: '100%',
                maxWidth: 600,
                alignSelf: 'center',
                paddingHorizontal: spacing.lg,
                paddingTop: index === 1 ? spacing.md : 0,
                paddingBottom: spacing.md,
              }}
            >
              <AchievementRow
                achievement={item.achievement}
                onPress={() => router.push('/achievements')}
              />
            </View>
          );
        }}
        ListHeaderComponent={
          <ProfileHeader
            profile={profile}
            rank={rank}
            streakWeeks={streakWeeks}
            followers={countersQuery.data?.followers}
            following={countersQuery.data?.following}
            posts={countersQuery.data?.posts}
            countersError={countersQuery.isError}
            onEdit={() => router.push('/profile/edit')}
            onOpenFollowers={() =>
              router.push({
                pathname: '/profile/connections',
                params: { type: 'followers' },
              })
            }
            onOpenFollowing={() =>
              router.push({
                pathname: '/profile/connections',
                params: { type: 'following' },
              })
            }
          />
        }
        ListFooterComponent={
          (activeTab === 'activity' && filteredActivity.length === 0) || rows.length === 1 ? (
            emptyState
          ) : activeTab === 'posts' && userPostsQuery.isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary.DEFAULT} />
            </View>
          ) : (
            <View style={{ height: spacing.sm }} />
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        {...pullProps}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
        )}
      </StaticPullToRefresh>

      <Sheet
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
        title="Opciones del perfil"
      >
        <ProfileMenuAction
          icon="share"
          title="Compartir perfil"
          description="Envía un enlace directo a tu perfil."
          onPress={handleShareProfileFromMenu}
        />
        <ProfileMenuAction
          icon="settings"
          title="Ajustes"
          description="Privacidad, unidades y cierre de sesión."
          onPress={handleOpenSettings}
        />
      </Sheet>

      <ActivityFiltersSheet
        visible={activityFiltersVisible}
        history={workoutHistory}
        value={activityFilters}
        onChange={setActivityFilters}
        onClose={() => setActivityFiltersVisible(false)}
        returnFocusTarget={activityFiltersTriggerRef.current}
      />

      <CommentSheet
        visible={!!commentsPost}
        postId={commentsPost?.id ?? null}
        postOwnerId={commentsPost?.userId ?? null}
        currentUserId={profile.id}
        onClose={() => setCommentsPost(null)}
      />

      <WorkoutResultsModal
        visible={!!selectedWorkout}
        workout={selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
      />
    </SafeAreaView>
  );
}

type ProfileHeaderProps = {
  profile: NonNullable<ReturnType<typeof useAppStore.getState>['profile']>;
  rank: ReturnType<typeof rankFromPoints>;
  streakWeeks: number;
  followers?: number;
  following?: number;
  posts?: number;
  countersError: boolean;
  onEdit: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
};

function ProfileHeader({
  profile,
  rank,
  streakWeeks,
  followers,
  following,
  posts,
  countersError,
  onEdit,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileHeaderProps) {
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        backgroundColor: colors.bg.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <LinearGradient
        colors={rank.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 76, opacity: 0.82 }}
      />

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <View
          style={{
            minHeight: 56,
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ width: 104, height: 56 }}>
            <Avatar
              uri={profile.avatarUrl}
              name={profile.displayName}
              size={72}
              borderColor={colors.bg.base}
              style={{ position: 'absolute', top: -36, left: 0 }}
            />
            <ExpoImage
              source={RANK_IMAGES[rank.id]}
              style={{
                position: 'absolute',
                top: 10,
                left: 54,
                width: 40,
                height: 40,
              }}
              contentFit="contain"
              accessibilityLabel={`Emblema del rango ${rank.label}`}
            />
          </View>
          <Button
            title="Editar perfil"
            variant="primary"
            size="sm"
            flat
            leftIcon={<Icon name="edit" size={15} color={colors.text.primary} />}
            onPress={onEdit}
            style={{ minHeight: 44, minWidth: 136, marginTop: spacing.sm }}
          />
        </View>

        <Text variant="headline" numberOfLines={2}>
          {profile.displayName}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          @{profile.username}
        </Text>

        {profile.bio ? (
          <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
            {profile.bio}
          </Text>
        ) : null}

        <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: spacing.sm,
            }}
          >
            <Text variant="label" weight="black" style={{ color: rank.color }}>
              {rank.label}
            </Text>
            {streakWeeks > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Icon name="fire" size={14} color={colors.accent.DEFAULT} />
                <Text variant="caption" tone="accent" weight="bold">
                  {streakWeeks} {streakWeeks === 1 ? 'semana' : 'semanas'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing.md,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Stat
            label="Publicaciones"
            value={posts === undefined ? '—' : posts.toLocaleString('es-ES')}
            size="md"
            align="center"
            layout="value-first"
            style={{ flex: 1, paddingVertical: spacing.sm }}
          />
          <Divider />
          <Stat
            label="Seguidores"
            value={
              followers === undefined
                ? '—'
                : followers.toLocaleString('es-ES')
            }
            size="md"
            align="center"
            layout="value-first"
            onPress={onOpenFollowers}
            style={{ flex: 1, paddingVertical: spacing.sm }}
          />
          <Divider />
          <Stat
            label="Siguiendo"
            value={
              following === undefined
                ? '—'
                : following.toLocaleString('es-ES')
            }
            size="md"
            align="center"
            layout="value-first"
            onPress={onOpenFollowing}
            style={{ flex: 1, paddingVertical: spacing.sm }}
          />
        </View>

        {countersError ? (
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
            El resumen social no está disponible.
          </Text>
        ) : null}
      </View>
    </View>
  );
  /*
  return (
    <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center' }}>
      <View style={{ paddingTop: spacing.lg, gap: spacing.md }}>
        <Card
          variant="section"
          padding="xl"
          style={{ alignItems: 'center', overflow: 'hidden' }}
        >
          <LinearGradient
            colors={rank.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 110,
              opacity: 0.25,
            }}
          />
          <Avatar
            uri={profile.avatarUrl}
            name={profile.displayName}
            size={96}
            borderColor={rank.color}
          />
          <ExpoImage
            source={RANK_IMAGES[rank.id]}
            style={{ width: 68, height: 68, marginTop: spacing.sm }}
            contentFit="contain"
            transition={150}
            accessibilityLabel={`Rango ${rank.label}`}
          />
          <Text variant="title" style={{ marginTop: spacing.xs }}>{profile.displayName}</Text>
          <View
            style={{
              marginTop: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: 5,
              borderRadius: radius.sm,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={rank.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', inset: 0 }}
            />
            <Text weight="black" style={{ color: colors.bg.base, letterSpacing: 1 }}>
              {rank.label.toUpperCase()}
            </Text>
          </View>
          {streakWeeks > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                marginTop: spacing.sm,
              }}
            >
              <Icon name="fire" size={14} color={colors.accent.DEFAULT} />
              <Text variant="caption" tone="accent" weight="bold">
                {streakWeeks} {streakWeeks === 1 ? 'semana seguida' : 'semanas seguidas'}
              </Text>
              <PressableScale
                onPress={onShareStreak}
                hitSlop={6}
                pressScale={0.92}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                  borderRadius: radius.sm,
                  backgroundColor: colors.accent.soft,
                  borderWidth: 1,
                  borderColor: colors.accent.DEFAULT,
                }}
              >
                <Text variant="caption" tone="accent" weight="bold">Compartir</Text>
              </PressableScale>
            </View>
          ) : null}
          {profile.bio ? (
            <Text
              variant="caption"
              tone="secondary"
              style={{ marginTop: spacing.sm, textAlign: 'center' }}
            >
              {profile.bio}
            </Text>
          ) : null}
          {profile.instagramUsername ? (
            <PressableScale
              onPress={() => openInstagram(profile.instagramUsername!)}
              hitSlop={6}
              pressScale={0.93}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                marginTop: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: 5,
                borderRadius: radius.sm,
                backgroundColor: 'rgba(225,48,108,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(225,48,108,0.4)',
              }}
            >
              <Icon name="instagram" size={14} color="#E1306C" />
              <Text variant="caption" weight="semibold" style={{ color: '#E1306C' }}>
                @{profile.instagramUsername}
              </Text>
            </PressableScale>
          ) : null}
        </Card>

        <Card
          variant="raised"
          padding="lg"
          style={{ flexDirection: 'row', marginHorizontal: spacing.lg }}
        >
          <SocialStat label="Seguidores" value={followers} onPress={onOpenFollowers} />
          <Divider />
          <SocialStat label="Siguiendo" value={following} onPress={onOpenFollowing} />
          <Divider />
          <SocialStat label="Posts" value={posts} />
        </Card>
        {countersError ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            No se pudo actualizar el resumen social.
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Button
            title="Editar perfil"
            variant="secondary"
            flat
            leftIcon={<Icon name="edit" size={15} color={colors.text.primary} />}
            onPress={onEdit}
            style={{ flex: 1 }}
          />
          <PressableScale
            onPress={onShare}
            hitSlop={6}
            pressScale={0.92}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bg.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="share" size={18} color={colors.text.primary} />
          </PressableScale>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <SectionHeader title="Cuenta" />
          <RowButton icon="settings" label="Configuración" onPress={onSettings} />
        </View>

        {achievementsSummary ? (
          <PressableScale
            onPress={onOpenAchievements}
            pressScale={0.98}
            haptic={false}
            style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
          >
            <Card variant="raised" padding="lg">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.sm,
                    backgroundColor: colors.accent.soft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="trophy" size={22} color={colors.accent.DEFAULT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text weight="bold">Todos los logros</Text>
                  <Text variant="caption" tone="muted" numeric>
                    {achievementsSummary.earned} de {achievementsSummary.total} niveles alcanzados
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.text.muted} />
              </View>
            </Card>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
  */
}

function ProfileTabs({
  activeTab,
  onSelect,
}: {
  activeTab: ProfileTab;
  onSelect: (tab: ProfileTab) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Secciones del perfil"
      style={{
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        flexDirection: 'row',
        backgroundColor: colors.bg.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <PressableScale
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(tab.key)}
            pressScale={0.98}
            haptic={false}
            style={{
              flex: 1,
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              borderBottomWidth: 2,
              borderBottomColor: active ? colors.primary.DEFAULT : 'transparent',
            }}
          >
            <Icon
              name={tab.icon}
              size={16}
              color={active ? colors.primary.DEFAULT : colors.text.muted}
            />
            <Text
              variant="caption"
              weight={active ? 'bold' : 'semibold'}
              numberOfLines={1}
              style={{ color: active ? colors.text.primary : colors.text.muted }}
            >
              {tab.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function ProfileMenuAction({
  icon,
  title,
  description,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      pressScale={0.98}
      haptic={false}
      style={{
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.bg.elevated,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceVeil,
        }}
      >
        <Icon name={icon} size={20} color={colors.text.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="bold">{title}</Text>
        <Text variant="caption" tone="muted">{description}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.text.muted} />
    </PressableScale>
  );
}

function ActivityFiltersControl({
  activeCount,
  onPress,
  focusRef,
}: {
  activeCount: number;
  onPress: () => void;
  focusRef: RefObject<View | null>;
}) {
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        minHeight: 52,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.bg.base,
      }}
    >
      <Text variant="caption" tone="secondary" weight="semibold">
        {activeCount > 0 ? `${activeCount} filtro${activeCount === 1 ? '' : 's'} activo${activeCount === 1 ? '' : 's'}` : 'Todas las sesiones'}
      </Text>
      <View ref={focusRef} collapsable={false}>
        <IconButton
          name="filter"
          accessibilityLabel={
            activeCount > 0
              ? `Abrir filtros de actividad, ${activeCount} activos`
              : 'Abrir filtros de actividad'
          }
          onPress={onPress}
          variant="ghost"
          size="md"
        />
      </View>
    </View>
  );
}

function countActivityFilters(filters: WorkoutHistoryFilters): number {
  return Number(filters.exerciseId !== null) +
    Number(filters.routineName !== null) +
    Number(filters.period !== 'all') +
    Number(filters.publishedOnly);
}

function WorkoutHistoryCard({ workout }: { workout: Workout }) {
  const durationMin = Math.round((workout.durationSeconds ?? 0) / 60);
  const sets = workout.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((set) => set.isCompleted && !set.isWarmup).length,
    0,
  );
  const date = new Date(workout.startedAt).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Card variant="section" padding="lg">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.sm,
            backgroundColor: colors.surfaceVeil,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="dumbbell" size={20} color={colors.text.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="bold" numberOfLines={1}>
            {workout.routineName ?? 'Entrenamiento libre'}
          </Text>
          <Text variant="caption" tone="muted">{date}</Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.text.muted} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Stat
          label="Tiempo"
          value={`${durationMin} min`}
          size="sm"
          align="center"
          style={{ flex: 1 }}
        />
        <Stat
          label="Series"
          value={String(sets)}
          size="sm"
          align="center"
          style={{ flex: 1 }}
        />
        <Stat
          label="Reps"
          value={String(workout.totalReps)}
          size="sm"
          align="center"
          style={{ flex: 1 }}
        />
      </View>

      {workout.exercises.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
          {workout.exercises.slice(0, 4).map((exercise) => (
            <Text key={exercise.id} variant="caption" tone="secondary">
              {exercise.exerciseName}
            </Text>
          ))}
          {workout.exercises.length > 4 ? (
            <Text variant="caption" tone="muted">
              +{workout.exercises.length - 4} más
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function AchievementRow({
  achievement,
  onPress,
}: {
  achievement: AchievementProgress;
  onPress: () => void;
}) {
  const currentValue = `${achievement.value.toLocaleString('es-ES', {
    maximumFractionDigits: 1,
  })}${achievement.def.unit ? ` ${achievement.def.unit}` : ''}`;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${achievement.def.title}, ${currentValue}`}
      accessibilityHint="Abre todos los logros"
      onPress={onPress}
      pressScale={0.98}
      haptic={false}
    >
      <Card variant="raised" padding="lg">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <AchievementMedal
            icon={achievement.def.icon}
            color={achievement.def.color}
            level={achievement.level}
            maxLevel={achievement.maxLevel}
            size={58}
          />
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <Text weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                {achievement.def.title}
              </Text>
              <Text variant="caption" tone="secondary" numeric>{currentValue}</Text>
            </View>
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {achievement.def.description}
            </Text>
            <View
              style={{
                height: 5,
                borderRadius: radius.sm,
                backgroundColor: colors.bg.elevated,
                overflow: 'hidden',
                marginTop: spacing.sm,
              }}
            >
              <View
                style={{
                  width: `${Math.round(achievement.progressToNext * 100)}%`,
                  height: '100%',
                  backgroundColor: achievement.def.color,
                }}
              />
            </View>
            <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
              {achievement.nextTier
                ? `Siguiente: ${achievement.nextTier.label}`
                : 'Nivel máximo alcanzado'}
            </Text>
          </View>
        </View>
      </Card>
    </PressableScale>
  );
}

function TabState({
  icon,
  title,
  message,
  action,
  onAction,
  tone = 'neutral',
}: {
  icon: IconName;
  title: string;
  message: string;
  action: string;
  onAction: () => void;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
      }}
    >
      <Card variant="section" padding="xl" style={{ alignItems: 'center' }}>
        <Icon
          name={icon}
          size={30}
          color={tone === 'danger' ? colors.danger : colors.text.muted}
        />
        <Text variant="heading" style={{ marginTop: spacing.md, textAlign: 'center' }}>
          {title}
        </Text>
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.xs, textAlign: 'center' }}
        >
          {message}
        </Text>
        <Button
          title={action}
          variant="secondary"
          onPress={onAction}
          style={{ marginTop: spacing.lg }}
        />
      </Card>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />;
}
