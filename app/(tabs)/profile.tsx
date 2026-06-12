import { useState, useMemo } from 'react';
import { View, Pressable, ScrollView, Share, Alert, Image } from 'react-native';
import { openInstagram } from '@/lib/linking';
import { WorkoutResultsModal } from '@/components/WorkoutResultsModal';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { colors, radius, spacing, rankFromPoints } from '@/theme/tokens';
import { Loader } from '@/components/ui/Loader';
import { useAppStore } from '@/store/app';
import { useProfileCounters } from '@/lib/queries/profile';
import { useUserPosts } from '@/lib/queries/social';
import { useWorkoutsStore, type Workout } from '@/store/workouts';
import { useToast } from '@/components/ui/Toast';
import { CommentSheet } from '@/components/feed/CommentSheet';
import type { Post, PostReactions } from '@/lib/repos/posts';
import { topReactions, totalReactions } from '@/components/feed/reactions';

const BADGES: { id: string; label: string; icon: IconName; color: string; earned: boolean }[] = [
  { id: 'first',   label: 'Primer workout', icon: 'medal',   color: '#CD7F32',            earned: true  },
  { id: 'streak3', label: 'Racha 3 sem',    icon: 'fire',    color: colors.accent.DEFAULT, earned: true  },
  { id: 'streak10',label: 'Racha 10 sem',   icon: 'fire',    color: colors.accent.DEFAULT, earned: false },
  { id: 'volume',  label: 'Bestia +10t',    icon: 'muscle',  color: colors.primary.DEFAULT,earned: false },
  { id: 'early',   label: 'Madrugador',     icon: 'seedling',color: colors.success,        earned: true  },
  { id: 'social',  label: 'Influencer',     icon: 'target',  color: colors.info.DEFAULT,   earned: false },
];

type ProfileTab = 'posts' | 'activity' | 'achievements';

const TABS: { key: ProfileTab; label: string; icon: IconName }[] = [
  { key: 'posts',        label: 'Publicaciones', icon: 'image'    },
  { key: 'activity',     label: 'Actividad',     icon: 'dumbbell' },
  { key: 'achievements', label: 'Logros',         icon: 'medal'    },
];

export default function Profile() {
  const router       = useRouter();
  const insets       = useSafeAreaInsets();
  const toast        = useToast();
  const profile      = useAppStore((s) => s.profile);
  const streakWeeks  = useAppStore((s) => s.streakWeeks);
  const signOut      = useAppStore((s) => s.signOut);
  const workoutHistory = useWorkoutsStore((s) => s.history);

  const countersQuery  = useProfileCounters(profile?.id);
  const userPostsQuery = useUserPosts(profile?.id);

  const [commentsPost, setCommentsPost]       = useState<Post | null>(null);
  const [activeTab, setActiveTab]             = useState<ProfileTab>('posts');
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const userPosts = useMemo(
    () => userPostsQuery.data?.pages.flatMap((p) => p.posts) ?? [],
    [userPostsQuery.data],
  );

  if (!profile) return <Loader />;

  const rank          = rankFromPoints(profile.rankPoints);
  const followersCount = countersQuery.data?.followers ?? 0;
  const followingCount = countersQuery.data?.following ?? 0;
  const postsCount     = countersQuery.data?.posts ?? 0;
  const earnedCount    = BADGES.filter((b) => b.earned).length;

  const handleShare = async () => {
    try {
      await Share.share({ message: `Sígueme en Gmo Training: gmo://profile/${profile.username}` });
    } catch (e) {
      toast.show({ message: (e as Error)?.message ?? 'No se pudo compartir', tone: 'danger' });
    }
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* ── NAVBAR ARRIBA ── */}
      <View style={{ backgroundColor: colors.bg.base, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        }}>
          <Text variant="heading" numberOfLines={1}>@{profile.username}</Text>
          <Pressable
            onPress={() => router.push('/profile/settings')}
            hitSlop={8}
            style={({ pressed }) => [{ padding: spacing.xs, borderRadius: radius.md }, pressed && { opacity: 0.7 }]}
          >
            <Icon name="settings" size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  borderBottomWidth: active ? 2 : 0,
                  borderBottomColor: active ? colors.primary.DEFAULT : 'transparent',
                  gap: 3,
                }}
              >
                <Icon name={tab.icon} size={18} color={active ? colors.primary.DEFAULT : colors.text.muted} />
                <Text
                  variant="caption"
                  weight={active ? 'bold' : 'regular'}
                  style={{ fontSize: 10, color: active ? colors.text.primary : colors.text.muted }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── CONTENIDO SCROLLABLE ── */}
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: spacing.md,
        }}
      >
        {/* Hero */}
        <Card variant="raised" padding="xl" style={{ alignItems: 'center', overflow: 'hidden' }}>
          <LinearGradient
            colors={rank.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110, opacity: 0.25 }}
          />
          <Avatar uri={profile.avatarUrl} name={profile.displayName} size={100} borderColor={rank.color} />
          <Text variant="title" style={{ marginTop: spacing.md }}>{profile.displayName}</Text>
          <View style={{ marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.full, overflow: 'hidden' }}>
            <LinearGradient
              colors={rank.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <Text weight="black" style={{ color: colors.bg.base, letterSpacing: 1 }}>{rank.label.toUpperCase()}</Text>
          </View>
          {streakWeeks > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
              <Icon name="fire" size={13} color={colors.accent.DEFAULT} />
              <Text variant="caption" tone="accent" weight="bold">
                {streakWeeks} {streakWeeks === 1 ? 'semana' : 'semanas'} seguidas
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: '/publish', params: { mode: 'streak' } })}
                hitSlop={6}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 3,
                    borderRadius: radius.full,
                    backgroundColor: colors.accent.soft,
                    borderWidth: 1,
                    borderColor: colors.accent.DEFAULT,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text variant="caption" tone="accent" weight="bold">Compartir</Text>
              </Pressable>
            </View>
          )}
          {!!profile.bio && (
            <Text variant="caption" tone="secondary" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              {profile.bio}
            </Text>
          )}
          {!!profile.instagramUsername && (
            <Pressable
              onPress={() => openInstagram(profile.instagramUsername!)}
              hitSlop={6}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: spacing.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 5,
                  borderRadius: radius.full,
                  backgroundColor: 'rgba(225,48,108,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(225,48,108,0.4)',
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Icon name="instagram" size={14} color="#E1306C" />
              <Text variant="caption" weight="semibold" style={{ color: '#E1306C' }}>
                @{profile.instagramUsername}
              </Text>
              {profile.instagramVerified && (
                <Icon name="check" size={12} color="#22c55e" />
              )}
            </Pressable>
          )}
        </Card>

        {/* Stats */}
        <Card variant="raised" padding="lg" style={{ flexDirection: 'row' }}>
          <SocialStat
            label="Seguidores"
            value={followersCount}
            onPress={() => router.push({ pathname: '/profile/connections', params: { type: 'followers' } })}
          />
          <Divider />
          <SocialStat
            label="Siguiendo"
            value={followingCount}
            onPress={() => router.push({ pathname: '/profile/connections', params: { type: 'following' } })}
          />
          <Divider />
          <SocialStat label="Posts" value={postsCount} />
        </Card>

        {/* Edit / Share */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title="Editar perfil"
            variant="secondary"
            flat
            leftIcon={<Icon name="edit" size={15} color={colors.text.primary} />}
            onPress={() => router.push('/profile/edit')}
            style={{ flex: 1 }}
          />
          <Pressable
            onPress={handleShare}
            hitSlop={6}
            style={({ pressed }) => [
              { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Icon name="share" size={18} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* ── TAB: PUBLICACIONES ── */}
        {activeTab === 'posts' && (
          userPostsQuery.isLoading && userPosts.length === 0 ? (
            <TabEmpty icon="image" message="Cargando publicaciones…" loading />
          ) : userPosts.length === 0 ? (
            <TabEmpty icon="image" message="Aún no hay publicaciones." />
          ) : (
            <View style={{ gap: spacing.md }}>
              {userPosts.map((post) => (
                <PublicationCard key={post.id} post={post} onPress={() => setCommentsPost(post)} />
              ))}
            </View>
          )
        )}

        {/* ── TAB: ACTIVIDAD (workout history) ── */}
        {activeTab === 'activity' && (
          workoutHistory.length === 0 ? (
            <TabEmpty icon="dumbbell" message="Aún no has registrado ningún entrenamiento." />
          ) : (
            <View style={{ gap: spacing.md }}>
              {workoutHistory.map((w) => (
                <Pressable
                  key={w.id}
                  onPress={() => setSelectedWorkout(w)}
                  style={({ pressed }) => pressed ? { opacity: 0.75 } : undefined}
                >
                  <WorkoutHistoryCard workout={w} />
                </Pressable>
              ))}
            </View>
          )
        )}

        {/* ── TAB: LOGROS ── */}
        {activeTab === 'achievements' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs }}>
              <Text variant="heading">Mis logros</Text>
              <Text variant="caption" tone="secondary" weight="semibold">{earnedCount}/{BADGES.length}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {BADGES.map((b) => (
                <Card
                  key={b.id}
                  padding="md"
                  variant={b.earned ? 'glow' : 'outlined'}
                  glowColor={b.color}
                  style={{ width: '47%', alignItems: 'center', opacity: b.earned ? 1 : 0.4 }}
                >
                  <Icon name={b.icon} size={28} color={b.color} />
                  <Text variant="caption" weight="bold" style={{ marginTop: 6, textAlign: 'center' }}>{b.label}</Text>
                  {b.earned && <Badge label="Conseguido" tone="accent" />}
                </Card>
              ))}
            </View>

            <SectionHeader title="Cuenta" />
            <RowButton icon="robot" label="Coach IA" onPress={() => router.push('/coach')} tone="info" />
            <RowButton icon="logout" label="Cerrar sesión" onPress={handleSignOut} tone="danger" />
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.xl, textAlign: 'center' }}>
              Gmo Training App · v0.1.0
            </Text>
          </>
        )}
      </ScrollView>

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

// ─────────────────────────────────────────────────────────────────────────────
// Publication card (feed style)
// ─────────────────────────────────────────────────────────────────────────────

const POST_TYPE_MAP: Record<Post['type'], { icon: IconName; color: string; label: string }> = {
  workout:     { icon: 'dumbbell',  color: colors.primary.DEFAULT, label: 'Entrenamiento' },
  pr:          { icon: 'trophy',    color: colors.accent.DEFAULT,  label: 'PR'            },
  rank_up:     { icon: 'lightning', color: '#FFD700',              label: 'Nuevo rango'   },
  streak:      { icon: 'fire',      color: colors.accent.DEFAULT,  label: 'Racha'         },
  achievement: { icon: 'target',    color: colors.info.DEFAULT,    label: 'Logro'         },
  manual:      { icon: 'image',     color: colors.text.secondary,  label: 'Post'          },
};

function PostReactionsInline({ reactions }: { reactions: PostReactions }) {
  const total = totalReactions(reactions);
  const top = topReactions(reactions, 3);
  if (total === 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ flexDirection: 'row' }}>
        {top.map((r, idx) => (
          <View
            key={r.key}
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bg.elevated,
              marginLeft: idx === 0 ? 0 : -6,
              borderWidth: 1.5,
              borderColor: colors.bg.card,
            }}
          >
            <Text style={{ fontSize: 11, lineHeight: 14 }}>{r.emoji}</Text>
          </View>
        ))}
      </View>
      <Text variant="caption" tone="muted" numeric>{total}</Text>
    </View>
  );
}

function PublicationCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const { icon, color, label } = POST_TYPE_MAP[post.type] ?? POST_TYPE_MAP.manual;

  return (
    <Card variant="raised" padding="lg">
      {/* Type row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={15} color={color} />
        </View>
        <Text variant="label" style={{ color, flex: 1 }}>{label.toUpperCase()}</Text>
        <Text variant="caption" tone="muted">{relativeTime(post.createdAt)}</Text>
      </View>

      {post.title ? <Text weight="bold" style={{ fontSize: 16 }}>{post.title}</Text> : null}
      {post.subtitle ? <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>{post.subtitle}</Text> : null}
      {post.caption ? (
        <Text variant="body" style={{ marginTop: post.title ? spacing.sm : 0 }}>{post.caption}</Text>
      ) : null}

      {post.photoUrl ? (
        <View style={{ marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden' }}>
          <Image source={{ uri: post.photoUrl }} style={{ width: '100%', aspectRatio: 4 / 5 }} resizeMode="cover" />
        </View>
      ) : null}

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
          pressed && { opacity: 0.7 },
        ]}
      >
        <PostReactionsInline reactions={post.reactions} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Icon name="chat" size={14} color={colors.text.muted} />
          <Text variant="caption" tone="muted">
            {post.commentCount > 0 ? `${post.commentCount} comentarios` : 'Ver comentarios'}
          </Text>
        </View>
      </Pressable>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workout history card
// ─────────────────────────────────────────────────────────────────────────────

function WorkoutHistoryCard({ workout }: { workout: Workout }) {
  const durationMin = Math.round((workout.durationSeconds ?? 0) / 60);
  const sets = workout.exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
    0,
  );
  const date = new Date(workout.startedAt).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <Card variant="raised" padding="lg">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary.muted, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="dumbbell" size={20} color={colors.primary.DEFAULT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="bold" numberOfLines={1}>{workout.routineName ?? 'Entrenamiento libre'}</Text>
          <Text variant="caption" tone="muted">{date}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
        <WorkoutStat label="Tiempo"  value={`${durationMin}min`} />
        <WorkoutStat label="Series"  value={String(sets)} />
        <WorkoutStat label="Reps"    value={String(workout.totalReps)} />
      </View>

      {workout.exercises.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
          {workout.exercises.slice(0, 4).map((e) => (
            <View key={e.id} style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border }}>
              <Text variant="caption" tone="secondary">{e.exerciseName}</Text>
            </View>
          ))}
          {workout.exercises.length > 4 && (
            <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border }}>
              <Text variant="caption" tone="muted">+{workout.exercises.length - 4} más</Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

function WorkoutStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text weight="bold" numeric style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function TabEmpty({ icon, message, loading }: { icon: IconName; message: string; loading?: boolean }) {
  return (
    <Card padding="xl" style={{ alignItems: 'center', marginTop: spacing.md }}>
      <Icon name={icon} size={28} color={colors.text.muted} />
      <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
        {loading ? message : message}
      </Text>
    </Card>
  );
}

function relativeTime(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return 'ahora';
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function SocialStat({ label, value, onPress }: { label: string; value: number; onPress?: () => void }) {
  const inner = (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm }}>
      <Text variant="heading" weight="bold" numeric>{value.toLocaleString()}</Text>
      <Text variant="label" tone="muted" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
  if (!onPress) return <View style={{ flex: 1 }}>{inner}</View>;
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.7 }]}>
      {inner}
    </Pressable>
  );
}

function Divider() {
  return <View style={{ width: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />;
}

function SectionHeader({ title, right }: { title: string; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <Text variant="heading">{title}</Text>
      {right ? <Text variant="caption" tone="secondary" weight="semibold">{right}</Text> : null}
    </View>
  );
}

function RowButton({ icon, label, onPress, tone = 'default' }: { icon: IconName; label: string; onPress: () => void; tone?: 'default' | 'info' | 'danger' }) {
  const fg     = tone === 'danger' ? colors.danger : tone === 'info' ? colors.info.DEFAULT : colors.text.primary;
  const iconBg = tone === 'danger' ? 'rgba(239,68,68,0.15)' : tone === 'info' ? colors.info.soft : colors.bg.elevated;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: iconBg }}>
        <Icon name={icon} size={16} color={fg} />
      </View>
      <Text weight="semibold" style={{ flex: 1, color: fg }}>{label}</Text>
      <Icon name="chevron-right" size={16} color={colors.text.muted} />
    </Pressable>
  );
}
