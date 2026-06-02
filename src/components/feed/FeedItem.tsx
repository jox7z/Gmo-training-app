import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Pressable, Image, Modal } from 'react-native';
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
import { ReactionPicker } from './ReactionPicker';
import {
  REACTIONS,
  DEFAULT_REACTION,
  activeReaction,
  totalReactions,
  topReactions,
} from './reactions';

interface Props {
  post: Post;
  isMine: boolean;
  onToggleReaction: (postId: string, reaction: ReactionKind) => void;
  onDelete: (post: Post) => void;
  onOpenComments: (post: Post) => void;
  onShare: (post: Post) => void;
  onOpenProfile: (post: Post) => void;
}

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

function ActionButton({
  icon,
  emoji,
  label,
  onPress,
  onLongPress,
  innerRef,
  color,
  filled,
  weight = 'semibold',
}: {
  icon?: IconName;
  emoji?: string;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  innerRef?: React.Ref<View>;
  color?: string;
  filled?: boolean;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  const tone = color ?? colors.text.muted;
  return (
    <Pressable
      hitSlop={6}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      style={({ pressed }) => [
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 10,
          borderRadius: radius.md,
        },
        pressed && { backgroundColor: colors.bg.elevated, opacity: 0.85 },
      ]}
    >
      <View ref={innerRef} collapsable={false}>
        {emoji ? (
          <Text style={{ fontSize: 18, lineHeight: 22 }}>{emoji}</Text>
        ) : icon ? (
          <Icon name={icon} size={18} color={tone} filled={!!filled} />
        ) : null}
      </View>
      <Text variant="caption" weight={weight} style={{ color: tone }} numeric>
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
  const prs: Array<{ exercise_name: string; weight_kg: number; reps: number }> =
    Array.isArray(post.metadata?.prs) ? post.metadata.prs : [];

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
      {prs.length > 0 && (
        <View style={{ marginTop: spacing.sm, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="trophy" size={12} color="#FFD700" />
            <Text variant="caption" style={{ color: '#FFD700' }} weight="bold">
              {prs.length === 1 ? 'Nuevo PR' : `${prs.length} nuevos PRs`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {prs.map((pr, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                  borderRadius: radius.full,
                  backgroundColor: 'rgba(255,215,0,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,215,0,0.4)',
                }}
              >
                <Text variant="caption" style={{ color: '#FFD700' }} weight="semibold">
                  {pr.exercise_name} · {pr.weight_kg}kg × {pr.reps}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {post.photoUrl ? (
        <View style={{ marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden' }}>
          <Image source={{ uri: post.photoUrl }} style={{ width: '100%', aspectRatio: 4 / 5 }} resizeMode="cover" />
        </View>
      ) : null}
    </View>
  );
}

const GOLD = '#FFD700';

function PrGoldenWrapper({ children }: { children: React.ReactNode }) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1600, useNativeDriver: false }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [glow]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,215,0,0.35)', 'rgba(255,215,0,0.95)'],
  });
  const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] });

  return (
    <Animated.View
      style={{
        borderRadius: radius.lg + 2,
        borderWidth: 1.5,
        borderColor,
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity,
        shadowRadius: 14,
        elevation: 10,
      }}
    >
      {children}
    </Animated.View>
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
            backgroundColor: 'rgba(255,215,0,0.15)',
            borderWidth: 1,
            borderColor: 'rgba(255,215,0,0.5)',
          }}
        >
          <Icon name="trophy" size={18} color={GOLD} />
        </View>
        <Text variant="label" style={{ color: GOLD }}>Nuevo PR</Text>
      </View>
      <Text variant="title" style={{ marginTop: spacing.sm }}>{post.title}</Text>
      {(weight || reps) && (
        <Text variant="metric" style={{ color: GOLD, marginTop: spacing.xs }}>
          {weight ? `${weight}kg` : ''}{weight && reps ? ' × ' : ''}{reps ? `${reps}` : ''}
        </Text>
      )}
      {post.subtitle ? (
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>{post.subtitle}</Text>
      ) : null}
      {post.photoUrl ? (
        <View style={{ marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden' }}>
          <Image source={{ uri: post.photoUrl }} style={{ width: '100%', aspectRatio: 4 / 5 }} resizeMode="cover" />
        </View>
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
            {info.label.toUpperCase()}
          </Text>
        </View>
        <Text variant="title" style={{ color: '#0B0B0B', marginTop: spacing.sm }}>
          {post.title}
        </Text>
        <Text variant="caption" weight="bold" style={{ color: '#0B0B0B', opacity: 0.75, marginTop: spacing.xs }}>
          {post.subtitle ?? '¡Dale sus felicitaciones!'}
        </Text>
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

/**
 * Resumen tipo "icon icon icon · N" (Facebook). Solo se muestra si hay
 * alguna reacción. Tappable para mostrar (en el futuro) quién reaccionó.
 */
function ReactionSummary({ post }: { post: Post }) {
  const total = totalReactions(post.reactions);
  const top = useMemo(() => topReactions(post.reactions, 3), [post.reactions]);
  if (total === 0) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {top.map((r, idx) => (
          <View
            key={r.key}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bg.elevated,
              marginLeft: idx === 0 ? 0 : -8,
              borderWidth: 2,
              borderColor: colors.bg.card,
            }}
          >
            <Text style={{ fontSize: 13, lineHeight: 16 }}>{r.emoji}</Text>
          </View>
        ))}
      </View>
      <Text variant="caption" tone="secondary" weight="semibold" numeric>
        {total}
      </Text>
    </View>
  );
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

  // ── Reactions ──────────────────────────────────────────────
  const reactBtnRef = useRef<View>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const active = useMemo(() => activeReaction(post.myReactions), [post.myReactions]);

  const openPicker = useCallback(() => {
    reactBtnRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setPickerVisible(true);
    });
  }, []);

  const handleReactTap = useCallback(() => {
    // Tap corto: si hay una activa, la quita. Si no, aplica props por defecto.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const kind = active ? active.key : DEFAULT_REACTION;
    onToggleReaction(post.id, kind);
  }, [active, post.id, onToggleReaction]);

  const handlePickerSelect = useCallback(
    (kind: ReactionKind) => {
      setPickerVisible(false);
      // Si el usuario ya tenía una reacción diferente, la quita primero.
      if (active && active.key !== kind) {
        onToggleReaction(post.id, active.key);
        // Luego añade la nueva (mismo tick; el optimistic update maneja bien
        // las dos llamadas).
        onToggleReaction(post.id, kind);
      } else {
        onToggleReaction(post.id, kind);
      }
    },
    [active, post.id, onToggleReaction],
  );

  const askDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    setConfirmOpen(false);
    onDelete(post);
  };

  const reactColor = active ? active.color : colors.text.muted;
  const reactEmoji = active ? active.emoji : '👊';
  const reactLabel = active ? active.shortLabel : 'Reaccionar';

  const cardInner = (
    <>
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

      {/* Caption */}
      {post.caption ? (
        <Text variant="body" style={{ marginTop: spacing.md }}>
          {post.caption}
        </Text>
      ) : null}

      {/* Reactions summary */}
      <ReactionSummary post={post} />

      {/* Action bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: spacing.md,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <ActionButton
          innerRef={reactBtnRef}
          emoji={reactEmoji}
          label={reactLabel}
          onPress={handleReactTap}
          onLongPress={openPicker}
          color={reactColor}
          filled={!!active}
          weight={active ? 'bold' : 'semibold'}
        />
        <ActionButton
          icon="chat"
          label={post.commentCount > 0 ? `${post.commentCount}` : 'Comentar'}
          onPress={() => onOpenComments(post)}
        />
        <ActionButton
          icon="share"
          label={post.shareCount > 0 ? `${post.shareCount}` : 'Compartir'}
          onPress={() => onShare(post)}
        />
      </View>
    </>
  );

  return (
    <Pressable
      onLongPress={() => {
        if (!isMine) return;
        askDelete();
      }}
      delayLongPress={350}
      style={{ marginBottom: spacing.md }}
    >
      {post.type === 'pr' ? (
        <PrGoldenWrapper>
          <Card padding="lg">{cardInner}</Card>
        </PrGoldenWrapper>
      ) : (
        <Card padding="lg">{cardInner}</Card>
      )}

      {/* Reaction picker overlay */}
      <ReactionPicker
        visible={pickerVisible}
        anchor={anchor}
        activeKind={active?.key ?? null}
        onSelect={handlePickerSelect}
        onDismiss={() => setPickerVisible(false)}
      />

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
