import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Pressable, Image, Modal, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { useReduceMotion } from '@/components/ui/useReduceMotion';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { BicepIcon } from '@/components/BicepIcon';
import { RankEmblem } from '@/components/RankEmblem';
import { WorkoutShareCard } from '@/components/social/WorkoutShareCard';
import type { SocialLayout } from '@/components/social/SocialStreamColumn';
import { colors, radius, spacing, RANKS, RankId } from '@/theme/tokens';
import type { Post, ReactionKind } from '@/lib/repos/posts';
import { formatRelative } from '@/lib/format';
import { resolveRankMilestone } from '@/lib/rankMilestone';
import {
  parseWorkoutPostMetadata,
  type WorkoutPostPrMetadata,
} from '@/lib/workoutPostMetadata';
import { formatWeight } from '@/lib/units';
import { useAppStore } from '@/store/app';
import {
  totalReactions,
} from './reactions';

interface Props {
  post: Post;
  layout?: SocialLayout;
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
  accessibilityLabel,
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
  accessibilityLabel?: string;
}) {
  const tone = color ?? colors.text.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
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
          minHeight: 44,
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
      {label ? (
        <Text variant="caption" weight={weight} style={{ color: tone }} numeric>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ManualBody({ post, layout }: { post: Post; layout: SocialLayout }) {
  if (!post.photoUrl) return null;
  return (
    <View
      style={{
        marginTop: layout === 'stream' ? 0 : spacing.md,
        borderRadius: layout === 'stream' ? 0 : radius.lg,
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

function PrChips({ prs }: { prs: WorkoutPostPrMetadata[] }) {
  const unit = useAppStore((state) => state.profile?.unit ?? 'kg');
  return (
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
            borderRadius: radius.sm,
            backgroundColor: 'rgba(255,215,0,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,215,0,0.4)',
          }}
        >
          <Text variant="caption" style={{ color: '#FFD700' }} weight="semibold">
            {pr.exerciseName} · {formatWeight(pr.weightKg, unit)} × {pr.reps} reps
          </Text>
        </View>
      ))}
    </View>
  );
}

function PrCarousel({ prs }: { prs: WorkoutPostPrMetadata[] }) {
  const unit = useAppStore((state) => state.profile?.unit ?? 'kg');
  // Medimos el ancho real del carril con onLayout en vez de calcularlo desde el
  // ancho de pantalla: así el slide cabe exacto sin depender del padding de la
  // lista ni del borde dorado del PrGoldenWrapper (antes el slide quedaba ~3px
  // más ancho y el overflow:hidden recortaba el borde derecho del recuadro).
  const [trackW, setTrackW] = useState(0);
  const slideWidth = trackW;
  const interval = slideWidth + spacing.sm;
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  // El índice vive también en un ref para que el autoplay no reinicie su timer
  // en cada avance, y para no depender de closures stale.
  const idxRef = useRef(0);
  // Mientras el usuario arrastra, el autoplay se pausa.
  const interactingRef = useRef(false);

  return (
    <View style={{ overflow: 'hidden' }} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
      {trackW > 0 && (
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => {
          interactingRef.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.min(
            prs.length - 1,
            Math.max(0, Math.round(e.nativeEvent.contentOffset.x / interval)),
          );
          idxRef.current = idx;
          setActiveIdx(idx);
          interactingRef.current = false;
        }}
        decelerationRate="fast"
        snapToInterval={interval}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {prs.map((pr, i) => (
          <View
            key={i}
            style={{
              width: slideWidth,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: 'rgba(255,215,0,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255,215,0,0.4)',
              overflow: 'hidden',
            }}
          >
            <Text variant="caption" style={{ color: '#FFD700' }} weight="bold" numberOfLines={1}>
              {pr.exerciseName}
            </Text>
            <Text variant="caption" style={{ color: '#FFD700', marginTop: 2 }} weight="semibold">
              {formatWeight(pr.weightKg, unit)} × {pr.reps} reps
            </Text>
          </View>
        ))}
      </ScrollView>
      )}

      {/* Dots de página */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: spacing.sm }}>
        {prs.map((_, i) => (
          <StaticPrDot key={i} active={i === activeIdx} />
        ))}
      </View>
    </View>
  );
}

function StaticPrDot({ active }: { active: boolean }) {
  return (
    <View
      style={{
        width: active ? 16 : 6,
        height: 6,
        borderRadius: radius.full,
        backgroundColor: active ? 'rgba(255,215,0,1)' : 'rgba(255,215,0,0.3)',
      }}
    />
  );
}

// Dot que se estira/encoge con spring al activarse, en lugar de saltar.
export function PrDot({ active }: { active: boolean }) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(active ? 1 : 0);
      return;
    }
    Animated.spring(anim, {
      toValue: active ? 1 : 0,
      friction: 6,
      tension: 160,
      useNativeDriver: false, // anima width/color — no soportado por el driver nativo
    }).start();
  }, [active, anim, reduceMotion]);

  return (
    <Animated.View
      style={{
        width: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 16] }),
        height: 6,
        borderRadius: radius.full,
        backgroundColor: anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['rgba(255,215,0,0.3)', 'rgba(255,215,0,1)'],
        }),
      }}
    />
  );
}

function WorkoutBody({ post, layout }: { post: Post; layout: SocialLayout }) {
  const metadata = useMemo(
    () => parseWorkoutPostMetadata(post.metadata),
    [post.metadata],
  );
  const prs = metadata.prs;

  return (
    <View>
      <WorkoutShareCard
        title={post.title ?? 'Entrenamiento'}
        subtitle={post.subtitle}
        metadata={metadata}
        layout={layout}
      />
      {prs.length > 0 && (
        <View
          style={[
            { marginTop: spacing.sm, gap: 6 },
            layout === 'stream' && { paddingHorizontal: spacing.lg },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="trophy" size={12} color="#FFD700" />
            <Text variant="caption" style={{ color: '#FFD700' }} weight="bold">
              {prs.length === 1 ? 'Nuevo PR' : `${prs.length} nuevos PRs`}
            </Text>
          </View>
          {prs.length > 1 ? (
            <PrCarousel prs={prs} />
          ) : (
            <PrChips prs={prs} />
          )}
        </View>
      )}
      {post.photoUrl ? (
        <View
          style={{
            marginTop: spacing.md,
            borderRadius: layout === 'stream' ? 0 : radius.lg,
            overflow: 'hidden',
          }}
        >
          <Image source={{ uri: post.photoUrl }} style={{ width: '100%', aspectRatio: 4 / 5 }} resizeMode="cover" />
        </View>
      ) : null}
    </View>
  );
}

const GOLD = '#FFD700';

export function PrGoldenWrapper({
  children,
  layout = 'contained',
}: {
  children: React.ReactNode;
  layout?: SocialLayout;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      glow.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1600, useNativeDriver: false }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [glow, reduceMotion]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,215,0,0.35)', 'rgba(255,215,0,0.95)'],
  });
  const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] });

  return (
    <Animated.View
      style={{
        borderRadius: layout === 'stream' ? 0 : radius.xl,
        borderWidth: layout === 'stream' ? 0 : 1.5,
        borderTopWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor,
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: layout === 'stream' ? 0 : shadowOpacity,
        shadowRadius: layout === 'stream' ? 0 : 14,
        elevation: layout === 'stream' ? 0 : 10,
      }}
    >
      {children}
    </Animated.View>
  );
}

function StaticPrGoldenWrapper({
  children,
  layout = 'contained',
}: {
  children: React.ReactNode;
  layout?: SocialLayout;
}) {
  return (
    <View
      style={{
        borderRadius: layout === 'stream' ? 0 : radius.xl,
        borderWidth: layout === 'stream' ? 0 : 1.5,
        borderTopWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: 'rgba(255,215,0,0.55)',
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: layout === 'stream' ? 0 : 0.25,
        shadowRadius: layout === 'stream' ? 0 : 14,
        elevation: layout === 'stream' ? 0 : 10,
      }}
    >
      {children}
    </View>
  );
}

function PrBody({ post, layout }: { post: Post; layout: SocialLayout }) {
  const unit = useAppStore((state) => state.profile?.unit ?? 'kg');
  const rawWeight = post.metadata?.weightKg ?? post.metadata?.weight_kg;
  const weight =
    typeof rawWeight === 'number' && Number.isFinite(rawWeight) && rawWeight >= 0
      ? rawWeight
      : undefined;
  const reps =
    typeof post.metadata?.reps === 'number' && Number.isFinite(post.metadata.reps)
      ? post.metadata.reps
      : undefined;
  return (
    <View>
      <View style={layout === 'stream' ? { paddingHorizontal: spacing.lg } : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.sm,
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
      <Text variant="title" numberOfLines={2} style={{ marginTop: spacing.sm, flexShrink: 1 }}>{post.title}</Text>
      {(weight !== undefined || reps) && (
        <Text variant="metric" style={{ color: GOLD, marginTop: spacing.xs }}>
          {weight !== undefined
            ? reps ? `${formatWeight(weight, unit)} × ${reps} reps` : formatWeight(weight, unit)
            : reps ? `${reps} reps` : ''}
        </Text>
      )}
      {post.subtitle ? (
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>{post.subtitle}</Text>
      ) : null}
      </View>
      {post.photoUrl ? (
        <View
          style={{
            marginTop: spacing.md,
            borderRadius: layout === 'stream' ? 0 : radius.lg,
            overflow: 'hidden',
          }}
        >
          <Image source={{ uri: post.photoUrl }} style={{ width: '100%', aspectRatio: 4 / 5 }} resizeMode="cover" />
        </View>
      ) : null}
    </View>
  );
}

function RankUpBody({
  post,
  layout,
}: {
  post: Post;
  layout: SocialLayout;
}) {
  const milestone = resolveRankMilestone(post.metadata);
  if (!milestone) {
    return <NeutralRankBody post={post} layout={layout} />;
  }

  const { fromRank, toRank } = milestone;
  const isStream = layout === 'stream';

  return (
    <View
      style={{
        backgroundColor: colors.bg.base,
        borderBottomColor: toRank.color,
        borderBottomWidth: 1,
        borderLeftColor: toRank.color,
        borderLeftWidth: isStream ? 0 : 1,
        borderRadius: isStream ? 0 : radius.lg,
        borderRightColor: toRank.color,
        borderRightWidth: isStream ? 0 : 1,
        borderTopColor: toRank.color,
        borderTopWidth: 1,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={[colors.bg.cardEdge, colors.bg.base, colors.bg.cardEdge]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
        style={{
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xl,
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={toRank.gradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius.full,
            height: 180,
            opacity: 0.09,
            position: 'absolute',
            top: 32,
            width: 180,
          }}
        />

        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            width: '100%',
          }}
        >
          <View
            pointerEvents="none"
            style={{
              backgroundColor: toRank.color,
              flex: 1,
              height: 1,
              opacity: 0.45,
            }}
          />
          <Text variant="label" weight="bold" style={{ color: toRank.color }}>
            NUEVO RANGO
          </Text>
          <View
            pointerEvents="none"
            style={{
              backgroundColor: toRank.color,
              flex: 1,
              height: 1,
              opacity: 0.45,
            }}
          />
        </View>

        <View
          style={{
            alignItems: 'center',
            height: 136,
            justifyContent: 'center',
            marginTop: spacing.sm,
            width: '100%',
          }}
        >
          <View
            pointerEvents="none"
            style={{
              backgroundColor: toRank.color,
              height: 1,
              left: 0,
              opacity: 0.2,
              position: 'absolute',
              right: 0,
              top: 67,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              borderColor: toRank.color,
              borderRadius: radius.full,
              borderWidth: 1,
              height: 132,
              opacity: 0.18,
              position: 'absolute',
              width: 132,
            }}
          />
          <RankEmblem
            rankId={toRank.id}
            size={112}
            accessibilityLabel={`Promoción de ${fromRank.label} a ${toRank.label}`}
          />
        </View>

        <Text
          variant="eyebrow"
          weight="black"
          style={{ color: toRank.color, textAlign: 'center' }}
        >
          {toRank.label}
        </Text>
        <Text
          variant="heading"
          weight="bold"
          style={{ marginTop: spacing.sm, textAlign: 'center' }}
        >
          {post.title ?? `Nuevo rango ${toRank.label}`}
        </Text>
        <Text
          variant="caption"
          tone="secondary"
          style={{ marginTop: spacing.xs, textAlign: 'center' }}
        >
          {fromRank.label} → {toRank.label}
        </Text>
        {post.subtitle ? (
          <Text
            variant="caption"
            tone="muted"
            style={{ marginTop: spacing.sm, textAlign: 'center' }}
          >
            {post.subtitle}
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function NeutralRankBody({
  post,
  layout,
}: {
  post: Post;
  layout: SocialLayout;
}) {
  const isStream = layout === 'stream';

  return (
    <View
      accessible
      accessibilityLabel={`Actualización de rango. ${post.title ?? 'Cambio de rango'}`}
      style={{
        alignItems: 'center',
        backgroundColor: colors.bg.elevated,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        borderLeftColor: colors.border,
        borderLeftWidth: isStream ? 0 : 1,
        borderRadius: isStream ? 0 : radius.lg,
        borderRightColor: colors.border,
        borderRightWidth: isStream ? 0 : 1,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
      }}
    >
      <View
        importantForAccessibility="no"
        style={{
          alignItems: 'center',
          backgroundColor: colors.surfaceVeil,
          borderColor: colors.borderStrong,
          borderRadius: radius.sm,
          borderWidth: 1,
          height: 44,
          justifyContent: 'center',
          width: 44,
        }}
      >
        <Icon name="medal" size={22} color={colors.text.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label" tone="muted">
          ACTUALIZACIÓN DE RANGO
        </Text>
        <Text variant="heading" style={{ marginTop: spacing.xs }}>
          {post.title ?? 'Cambio de rango'}
        </Text>
        {post.subtitle ? (
          <Text
            variant="caption"
            tone="muted"
            style={{ marginTop: spacing.xs }}
          >
            {post.subtitle}
          </Text>
        ) : null}
      </View>
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
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent.soft,
        }}
      >
        <Icon name="fire" size={22} color={colors.accent.DEFAULT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="heading" tone="accent" numberOfLines={2} style={{ flexShrink: 1 }}>
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
          borderRadius: radius.sm,
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

function Body({ post, layout }: { post: Post; layout: SocialLayout }) {
  switch (post.type) {
    case 'pr':
      return <PrBody post={post} layout={layout} />;
    case 'rank_up':
      return <RankUpBody post={post} layout={layout} />;
    case 'streak':
      return (
        <View style={layout === 'stream' ? { paddingHorizontal: spacing.lg } : undefined}>
          <StreakBody post={post} />
        </View>
      );
    case 'achievement':
      return (
        <View style={layout === 'stream' ? { paddingHorizontal: spacing.lg } : undefined}>
          <AchievementBody post={post} />
        </View>
      );
    case 'manual':
      return <ManualBody post={post} layout={layout} />;
    case 'workout':
    default:
      return <WorkoutBody post={post} layout={layout} />;
  }
}

/**
 * Resumen de reacciones: bíceps + total. Solo se muestra si hay al menos 1.
 */
function ReactionSummary({ post }: { post: Post }) {
  const total = totalReactions(post.reactions);
  if (total === 0) return null;
  return (
    <View
      accessible
      accessibilityLabel={`${total} ${total === 1 ? 'reacción' : 'reacciones'}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.md,
      }}
    >
      <BicepIcon size={16} color={colors.accent.DEFAULT} />
      <Text variant="caption" tone="secondary" weight="semibold" numeric>
        {total}
      </Text>
    </View>
  );
}

export function FeedItem({
  post,
  layout = 'contained',
  isMine,
  onToggleReaction,
  onDelete,
  onOpenComments,
  onShare,
  onOpenProfile,
}: Props) {
  const info = useMemo(() => rankInfo(post.user.currentRank), [post.user.currentRank]);
  const relative = useMemo(
    () => formatRelative(post.createdAt, 'device'),
    [post.createdAt],
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Reactions ──────────────────────────────────────────────
  // Única reacción: muscle (bíceps). Activa si post.myReactions.muscle === true.
  const isActive = post.myReactions?.muscle === true;

  const handleReactTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggleReaction(post.id, 'muscle');
  }, [post.id, onToggleReaction]);

  const askDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    setConfirmOpen(false);
    onDelete(post);
  };

  const reactColor = isActive ? colors.accent.DEFAULT : colors.text.muted;

  const cardInner = (
    <>
      {/* Header */}
      <View
        style={[
          { flexDirection: 'row', alignItems: 'center' },
          layout === 'stream' && {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.lg,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir perfil de ${post.user.displayName}`}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Más opciones de la publicación"
            onPress={() => setMenuOpen(true)}
            hitSlop={10}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.full,
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
        <Body post={post} layout={layout} />
      </View>

      {/* Caption */}
      {post.caption ? (
        <View style={layout === 'stream' ? { paddingHorizontal: spacing.lg } : undefined}>
          <Text variant="body" style={{ marginTop: spacing.md }}>
            {post.caption}
          </Text>
        </View>
      ) : null}

      {/* Reactions summary */}
      <View style={layout === 'stream' ? { paddingHorizontal: spacing.lg } : undefined}>
        <ReactionSummary post={post} />
      </View>

      {/* Action bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: spacing.md,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: layout === 'stream' ? spacing.lg : 0,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isActive ? 'Quitar reacción Bíceps' : 'Reaccionar con Bíceps'
          }
          accessibilityState={{ selected: isActive }}
          hitSlop={6}
          onPress={handleReactTap}
          style={({ pressed }) => [
            {
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minHeight: 44,
              paddingVertical: 10,
              borderRadius: radius.md,
            },
            pressed && { backgroundColor: colors.bg.elevated, opacity: 0.85 },
          ]}
        >
          <BicepIcon size={22} color={reactColor} />
          {isActive && (
            <Text variant="caption" weight="bold" style={{ color: reactColor }}>
              Bíceps
            </Text>
          )}
        </Pressable>
        <ActionButton
          icon="chat"
          label={post.commentCount > 0 ? `${post.commentCount}` : 'Comentar'}
          accessibilityLabel={
            post.commentCount > 0
              ? `${post.commentCount} comentarios`
              : 'Comentar'
          }
          onPress={() => onOpenComments(post)}
        />
        <ActionButton
          icon="share"
          label={post.shareCount > 0 ? `${post.shareCount}` : 'Compartir'}
          accessibilityLabel={
            post.shareCount > 0
              ? `${post.shareCount} veces compartida`
              : 'Compartir'
          }
          onPress={() => onShare(post)}
        />
      </View>
    </>
  );

  return (
    <Pressable
      accessible={false}
      onLongPress={() => {
        if (!isMine) return;
        askDelete();
      }}
      delayLongPress={350}
      style={[
        {
          marginBottom: layout === 'stream' ? spacing.sm : spacing.md,
        },
        layout === 'stream' && {
          width: '100%',
          maxWidth: 600,
          alignSelf: 'center',
        },
      ]}
    >
      {post.type === 'pr' ? (
        <StaticPrGoldenWrapper layout={layout}>
          <Card
            variant={layout === 'stream' ? 'stream' : 'default'}
            padding={layout === 'stream' ? 0 : 'lg'}
            style={layout === 'stream' ? { borderTopWidth: 0, borderBottomWidth: 0 } : undefined}
          >
            {cardInner}
          </Card>
        </StaticPrGoldenWrapper>
      ) : (
        <Card
          variant={layout === 'stream' ? 'stream' : 'raised'}
          padding={layout === 'stream' ? 0 : 'lg'}
        >
          {cardInner}
        </Card>
      )}

      {/* Owner menu */}
      <Modal
        transparent
        visible={menuOpen}
        animationType="none"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          accessible={false}
          onPress={() => setMenuOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: colors.bg.elevated,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Eliminar publicación"
              onPress={askDelete}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text weight="bold" tone="danger">Eliminar publicación</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={() => setMenuOpen(false)}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text tone="secondary">Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Confirm delete */}
      <Modal
        transparent
        visible={confirmOpen}
        animationType="none"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View
          accessibilityViewIsModal
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
                flat
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
