import { useMemo, useState } from 'react';
import { View, Pressable, Image, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { colors, radius, spacing, shadow, RANKS, RankId } from '@/theme/tokens';
import type { Post, ReactionKind } from '@/lib/repos/posts';

interface Props {
  post: Post;
  isMine: boolean;
  onToggleReaction: (postId: string, reaction: ReactionKind) => void;
  onDelete: (post: Post) => void;
  onOpenComments: (post: Post) => void;
  onShare: (post: Post) => void;
  onOpenProfile: (post: Post) => void;
}

const REACTIONS: { key: ReactionKind; icon: IconName; color: string }[] = [
  { key: 'fire', icon: 'fire', color: colors.accent.DEFAULT },
  { key: 'muscle', icon: 'muscle', color: colors.primary.DEFAULT },
  { key: 'clap', icon: 'clap', color: colors.warning },
];

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return 'ahora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD}d`;
  const diffW = Math.floor(diffD / 7);
  if (diffW < 4) return `hace ${diffW}sem`;
  return new Date(iso).toLocaleDateString();
}

function ReactionPill({
  icon,
  color,
  count,
  active,
  onPress,
}: {
  icon: IconName;
  color: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.md,
          paddingVertical: 8,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: active ? color : colors.border,
          backgroundColor: active ? `${color}22` : 'transparent',
        },
        pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
      ]}
    >
      <Icon name={icon} size={14} color={active ? color : colors.text.muted} />
      <Text
        variant="caption"
        weight="semibold"
        numeric
        style={{ color: active ? color : colors.text.secondary }}
      >
        {count}
      </Text>
    </Pressable>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.sm,
          paddingVertical: 8,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Icon name={icon} size={16} color={colors.text.muted} />
      <Text variant="caption" tone="secondary" weight="semibold" numeric>
        {label}
      </Text>
    </Pressable>
  );
}

function ManualBody({ post }: { post: Post }) {
  if (!post.photoUrl) return null;
  return (
    <View
      style={{
        marginTop: spacing.md,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.bg.elevated,
      }}
    >
      <Image
        source={{ uri: post.photoUrl }}
        style={{ width: '100%', aspectRatio: 4 / 5 }}
        resizeMode="cover"
      />
    </View>
  );
}

function WorkoutBody({ post }: { post: Post }) {
  const chips: string[] = Array.isArray(post.metadata?.exercises)
    ? (post.metadata.exercises as any[]).slice(0, 3).map((e) => String(e?.name ?? e))
    : [];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
        <Icon name="dumbbell" size={18} color={colors.primary.DEFAULT} />
        <Text variant="heading" tone="brand">{post.title}</Text>
      </View>
      {post.subtitle ? (
        <Text variant="caption" tone="secondary">{post.subtitle}</Text>
      ) : null}
      {chips.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
          {chips.map((c, i) => (
            <View
              key={`${c}-${i}`}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: colors.bg.elevated,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="caption" tone="secondary">{c}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PrBody({ post }: { post: Post }) {
  const weight = post.metadata?.weightKg ?? post.metadata?.weight_kg;
  const reps = post.metadata?.reps;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent.soft,
            ...shadow.glowAccent,
          }}
        >
          <Icon name="trophy" size={18} color={colors.accent.DEFAULT} />
        </View>
        <Text variant="label" tone="accent">Nuevo PR</Text>
      </View>
      <Text variant="title" style={{ marginTop: spacing.sm }}>{post.title}</Text>
      {(weight || reps) && (
        <Text variant="metric" tone="accent" style={{ marginTop: spacing.xs }}>
          {weight ? `${weight}kg` : ''}{weight && reps ? ' × ' : ''}{reps ? `${reps}` : ''}
        </Text>
      )}
      {post.subtitle ? (
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>{post.subtitle}</Text>
      ) : null}
    </View>
  );
}

function RankUpBody({ post }: { post: Post }) {
  const newRankId = (post.metadata?.toRank ?? post.metadata?.to_rank ?? post.user.currentRank) as RankId;
  const info = rankInfo(newRankId);
  return (
    <View style={{ overflow: 'hidden', borderRadius: radius.lg }}>
      <LinearGradient
        colors={info.gradient as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: spacing.lg, borderRadius: radius.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="lightning" size={20} color="#0B0B0B" />
          <Text weight="black" style={{ color: '#0B0B0B' }}>
            Subió a {info.label}
          </Text>
        </View>
        <Text variant="title" style={{ color: '#0B0B0B', marginTop: spacing.sm }}>
          {post.title}
        </Text>
        {post.subtitle ? (
          <Text variant="caption" weight="semibold" style={{ color: '#0B0B0B', opacity: 0.8, marginTop: 2 }}>
            {post.subtitle}
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function StreakBody({ post }: { post: Post }) {
  const weeks = post.metadata?.weeks ?? post.metadata?.streakWeeks;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent.soft,
        }}
      >
        <Icon name="fire" size={22} color={colors.accent.DEFAULT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="heading" tone="accent">
          {weeks ? `${weeks} semanas seguidas` : post.title}
        </Text>
        {post.subtitle ? (
          <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>{post.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

function AchievementBody({ post }: { post: Post }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.info.soft,
          borderWidth: 1,
          borderColor: colors.info.DEFAULT,
        }}
      >
        <Icon name="target" size={22} color={colors.info.DEFAULT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label" tone="info">Logro desbloqueado</Text>
        <Text variant="heading" style={{ marginTop: 2 }}>{post.title}</Text>
        {post.subtitle ? (
          <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>{post.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Body({ post }: { post: Post }) {
  switch (post.type) {
    case 'pr':
      return <PrBody post={post} />;
    case 'rank_up':
      return <RankUpBody post={post} />;
    case 'streak':
      return <StreakBody post={post} />;
    case 'achievement':
      return <AchievementBody post={post} />;
    case 'manual':
      return <ManualBody post={post} />;
    case 'workout':
    default:
      return <WorkoutBody post={post} />;
  }
}

export function FeedItem({
  post,
  isMine,
  onToggleReaction,
  onDelete,
  onOpenComments,
  onShare,
  onOpenProfile,
}: Props) {
  const info = useMemo(() => rankInfo(post.user.currentRank), [post.user.currentRank]);
  const relative = useMemo(() => formatRelative(post.createdAt), [post.createdAt]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const askDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    setConfirmOpen(false);
    onDelete(post);
  };

  return (
    <Pressable
      onLongPress={() => {
        if (!isMine) return;
        askDelete();
      }}
      delayLongPress={350}
    >
      <Card padding="lg" style={{ marginBottom: spacing.md }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => onOpenProfile(post)}
            hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            <Avatar
              uri={post.user.avatarUrl}
              name={post.user.displayName}
              size={44}
              borderColor={info.color}
            />
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {post.user.displayName}
                </Text>
                <Badge label={info.label} tone="muted" />
              </View>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                @{post.user.username} · {relative}
              </Text>
            </View>
          </Pressable>

          {isMine && (
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={10}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text weight="black" tone="muted" style={{ fontSize: 18, lineHeight: 18 }}>
                  ⋯
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Body */}
        <View style={{ marginTop: spacing.md }}>
          <Body post={post} />
        </View>

        {/* Caption (skip duplicate for manual since photo is the body) */}
        {post.caption ? (
          <Text variant="body" style={{ marginTop: spacing.md }}>
            {post.caption}
          </Text>
        ) : null}

        {/* Reactions */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          {REACTIONS.map((r) => (
            <ReactionPill
              key={r.key}
              icon={r.icon}
              color={r.color}
              count={post.reactions[r.key]}
              active={post.myReactions[r.key]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onToggleReaction(post.id, r.key);
              }}
            />
          ))}
        </View>

        {/* Comments + Share actions */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginTop: spacing.sm,
            paddingTop: spacing.sm,
          }}
        >
          <ActionButton
            icon="chat"
            label={`${post.commentCount} comentarios`}
            onPress={() => onOpenComments(post)}
          />
          <ActionButton
            icon="share"
            label={post.shareCount > 0 ? `${post.shareCount} compartidos` : 'Compartir'}
            onPress={() => onShare(post)}
          />
        </View>
      </Card>

      {/* Owner menu */}
      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: colors.bg.elevated,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <Pressable onPress={askDelete} style={{ paddingVertical: spacing.md }}>
              <Text weight="bold" tone="danger">Eliminar publicación</Text>
            </Pressable>
            <Pressable onPress={() => setMenuOpen(false)} style={{ paddingVertical: spacing.md }}>
              <Text tone="secondary">Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Confirm delete */}
      <Modal
        transparent
        visible={confirmOpen}
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <Card padding="lg">
            <Text variant="heading">¿Eliminar publicación?</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: spacing.sm }}>
              Esta acción no se puede deshacer.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Button
                title="Cancelar"
                variant="ghost"
                onPress={() => setConfirmOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Eliminar"
                variant="danger"
                onPress={confirmDelete}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Pressable>
  );
}
