import { useState, useMemo } from 'react';
import { View, Pressable, ScrollView, Share, Alert, Image } from 'react-native';
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
import { useToast } from '@/components/ui/Toast';
import { CommentSheet } from '@/components/feed/CommentSheet';
import type { Post } from '@/lib/repos/posts';

const BADGES: { id: string; label: string; icon: IconName; color: string; earned: boolean }[] = [
  { id: 'first', label: 'Primer workout', icon: 'medal', color: '#CD7F32', earned: true },
  { id: 'streak3', label: 'Racha 3 sem', icon: 'fire', color: colors.accent.DEFAULT, earned: true },
  { id: 'streak10', label: 'Racha 10 sem', icon: 'fire', color: colors.accent.DEFAULT, earned: false },
  { id: 'volume', label: 'Bestia +10t', icon: 'muscle', color: colors.primary.DEFAULT, earned: false },
  { id: 'early', label: 'Madrugador', icon: 'seedling', color: colors.success, earned: true },
  { id: 'social', label: 'Influencer', icon: 'target', color: colors.info.DEFAULT, earned: false },
];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const profile = useAppStore((s) => s.profile);
  const streakWeeks = useAppStore((s) => s.streakWeeks);
  const signOut = useAppStore((s) => s.signOut);

  const countersQuery = useProfileCounters(profile?.id);
  const userPostsQuery = useUserPosts(profile?.id);
  const [commentsPost, setCommentsPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'activity' | 'achievements'>('posts');
  const userPosts = useMemo(
    () => userPostsQuery.data?.pages.flatMap((p) => p.posts) ?? [],
    [userPostsQuery.data],
  );

  if (!profile) return <Loader />;

  const rank = rankFromPoints(profile.rankPoints);
  const followersCount = countersQuery.data?.followers ?? 0;
  const followingCount = countersQuery.data?.following ?? 0;
  const postsCount = countersQuery.data?.posts ?? 0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Sígueme en Gmo Training: gmo://profile/${profile.username}`,
      });
    } catch (e) {
      toast.show({ message: (e as Error)?.message ?? 'No se pudo compartir', tone: 'danger' });
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            signOut().catch(() => {});
          },
        },
      ],
    );
  };

  const earnedCount = BADGES.filter((b) => b.earned).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: spacing.md,
        }}
      >
        {/* Hero */}
        <Card padding="xl" style={{ alignItems: 'center', overflow: 'hidden' }}>
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
            size={110}
            borderColor={rank.color}
          />
          <Text variant="title" style={{ marginTop: spacing.md }}>
            {profile.displayName}
          </Text>
          <Text variant="caption" tone="muted">@{profile.username}</Text>
          <View style={{ marginTop: spacing.md }}>
            <View
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radius.full,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={rank.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Text weight="black" style={{ color: '#0B0B0B', letterSpacing: 1 }}>
                {rank.label.toUpperCase()}
              </Text>
            </View>
          </View>
          {streakWeeks > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginTop: spacing.sm,
              }}
            >
              <Icon name="fire" size={14} color={colors.accent.DEFAULT} />
              <Text variant="caption" tone="accent" weight="bold">
                {streakWeeks} {streakWeeks === 1 ? 'semana' : 'semanas'} seguidas
              </Text>
            </View>
          )}
          {!!profile.bio && (
            <Text
              variant="caption"
              tone="secondary"
              style={{ marginTop: spacing.md, textAlign: 'center' }}
            >
              {profile.bio}
            </Text>
          )}
        </Card>

        {/* Social stats row */}
        <Card padding="lg" style={{ flexDirection: 'row' }}>
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

        {/* Edit / Share row */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title="Editar perfil"
            variant="secondary"
            leftIcon={<Icon name="edit" size={15} color={colors.text.primary} />}
            onPress={() => router.push('/profile/edit')}
            style={{ flex: 1 }}
          />
          <Pressable
            onPress={handleShare}
            hitSlop={6}
            style={({ pressed }) => [
              {
                width: 44,
                height: 44,
                borderRadius: radius.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bg.card,
                borderWidth: 1,
                borderColor: colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Icon name="share" size={18} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* Tab bar */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {([
            { key: 'posts', label: 'Publicaciones', icon: 'image' },
            { key: 'activity', label: 'Actividad', icon: 'chart' },
            { key: 'achievements', label: 'Logros', icon: 'medal' },
          ] as const).map((tab) => {
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
                  gap: 4,
                }}
              >
                <Icon
                  name={tab.icon}
                  size={17}
                  color={active ? colors.primary.DEFAULT : colors.text.muted}
                />
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

        {/* Tab: Publicaciones */}
        {activeTab === 'posts' && (
          userPostsQuery.isLoading && userPosts.length === 0 ? (
            <Card padding="lg" style={{ alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.md }}>
              <Text variant="caption" tone="muted">Cargando publicaciones…</Text>
            </Card>
          ) : userPosts.length === 0 ? (
            <Card padding="lg" style={{ alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.md }}>
              <Icon name="image" size={28} color={colors.text.muted} />
              <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
                Aún no hay publicaciones.
              </Text>
            </Card>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
              {userPosts.map((post) => (
                <ProfilePostCell key={post.id} post={post} onPress={() => setCommentsPost(post)} />
              ))}
            </View>
          )
        )}

        {/* Tab: Actividad */}
        {activeTab === 'activity' && (
          userPostsQuery.isLoading && userPosts.length === 0 ? (
            <Card padding="lg" style={{ alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.md }}>
              <Text variant="caption" tone="muted">Cargando actividad…</Text>
            </Card>
          ) : userPosts.length === 0 ? (
            <Card padding="lg" style={{ alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.md }}>
              <Icon name="chart" size={28} color={colors.text.muted} />
              <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
                Aún no hay actividad.
              </Text>
            </Card>
          ) : (
            <Card style={{ marginTop: spacing.md, overflow: 'hidden', padding: 0 }}>
              {userPosts.map((post, i) => (
                <ActivityCard
                  key={post.id}
                  post={post}
                  showDivider={i < userPosts.length - 1}
                  onPress={() => setCommentsPost(post)}
                />
              ))}
            </Card>
          )
        )}

        {/* Tab: Logros */}
        {activeTab === 'achievements' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
            {BADGES.map((b) => (
              <Card
                key={b.id}
                padding="md"
                variant={b.earned ? 'glow' : 'outlined'}
                glowColor={b.color}
                style={{ width: '47%', alignItems: 'center', opacity: b.earned ? 1 : 0.45 }}
              >
                <Icon name={b.icon} size={28} color={b.color} />
                <Text variant="caption" weight="bold" style={{ marginTop: 6, textAlign: 'center' }}>
                  {b.label}
                </Text>
                {b.earned && <Badge label="Conseguido" tone="accent" />}
              </Card>
            ))}
          </View>
        )}

        {/* Account */}
        <SectionHeader title="Cuenta" />
        <RowButton
          icon="settings"
          label="Ajustes"
          onPress={() => router.push('/profile/settings')}
        />
        <RowButton
          icon="robot"
          label="Coach IA"
          onPress={() => router.push('/coach')}
          tone="info"
        />
        <RowButton
          icon="logout"
          label="Cerrar sesión"
          onPress={handleSignOut}
          tone="danger"
        />

        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.xl, textAlign: 'center' }}
        >
          Gmo Training App · v0.1.0
        </Text>
      </ScrollView>

      <CommentSheet
        visible={!!commentsPost}
        postId={commentsPost?.id ?? null}
        postOwnerId={commentsPost?.userId ?? null}
        currentUserId={profile.id}
        onClose={() => setCommentsPost(null)}
      />
    </SafeAreaView>
  );
}

function ProfilePostCell({ post, onPress }: { post: Post; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: '48%',
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

function ActivityCard({
  post,
  showDivider,
  onPress,
}: {
  post: Post;
  showDivider: boolean;
  onPress: () => void;
}) {
  const cfg: Record<Post['type'], { icon: IconName; color: string }> = {
    workout: { icon: 'dumbbell', color: colors.primary.DEFAULT },
    pr: { icon: 'trophy', color: colors.accent.DEFAULT },
    rank_up: { icon: 'lightning', color: colors.primary.DEFAULT },
    streak: { icon: 'fire', color: colors.accent.DEFAULT },
    achievement: { icon: 'target', color: colors.info.DEFAULT },
    manual: { icon: 'image', color: colors.text.secondary },
  };
  const { icon, color } = cfg[post.type] ?? cfg.workout;
  const title = post.title ?? post.caption ?? '';
  const sub = post.title && post.caption ? post.caption : undefined;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: showDivider ? 1 : 0,
          borderBottomColor: colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}22`,
        }}
      >
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="semibold" numberOfLines={1}>{title}</Text>
        {sub ? <Text variant="caption" tone="secondary" numberOfLines={1}>{sub}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 3 }}>
          <Text variant="caption" tone="muted">{relativeTime(post.createdAt)}</Text>
          {post.reactions.muscle > 0 && (
            <Text variant="caption" tone="muted" numeric>💪 {post.reactions.muscle}</Text>
          )}
          {post.reactions.heart > 0 && (
            <Text variant="caption" tone="muted" numeric>❤️ {post.reactions.heart}</Text>
          )}
          {post.commentCount > 0 && (
            <Text variant="caption" tone="muted" numeric>💬 {post.commentCount}</Text>
          )}
        </View>
      </View>
      {post.photoUrl ? (
        <Image
          source={{ uri: post.photoUrl }}
          style={{ width: 50, height: 50, borderRadius: radius.md }}
          resizeMode="cover"
        />
      ) : null}
    </Pressable>
  );
}

function SocialStat({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const inner = (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm }}>
      <Text variant="heading" weight="bold" numeric>
        {value.toLocaleString()}
      </Text>
      <Text variant="label" tone="muted" style={{ marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) {
    return <View style={{ flex: 1 }}>{inner}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.7 }]}
    >
      {inner}
    </Pressable>
  );
}

function Divider() {
  return (
    <View
      style={{
        width: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.xs,
      }}
    />
  );
}

function SectionHeader({ title, right }: { title: string; right?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
      }}
    >
      <Text variant="heading">{title}</Text>
      {right ? (
        <Text variant="caption" tone="secondary" weight="semibold">
          {right}
        </Text>
      ) : null}
    </View>
  );
}

function RowButton({
  icon,
  label,
  onPress,
  tone = 'default',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'info' | 'danger';
}) {
  const fg =
    tone === 'danger' ? colors.danger
    : tone === 'info' ? colors.info.DEFAULT
    : colors.text.primary;
  const iconBg =
    tone === 'danger' ? 'rgba(239,68,68,0.15)'
    : tone === 'info' ? colors.info.soft
    : colors.bg.elevated;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: colors.bg.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: iconBg,
        }}
      >
        <Icon name={icon} size={16} color={fg} />
      </View>
      <Text weight="semibold" style={{ flex: 1, color: fg }}>
        {label}
      </Text>
      <Icon name="chevron-right" size={16} color={colors.text.muted} />
    </Pressable>
  );
}
