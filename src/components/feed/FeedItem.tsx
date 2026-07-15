import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Pressable, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { BicepIcon } from '@/components/BicepIcon';
import { colors, radius, spacing, RANKS, RankId } from '@/theme/tokens';
import type { Post, ReactionKind } from '@/lib/repos/posts';
import {
  DEFAULT_REACTION,
  totalReactions,
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
      {label ? (
        <Text variant="caption" weight={weight} style={{ color: tone }} numeric>
          {label}
        </Text>
      ) : null}
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
        style={{ width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.bg.elevated }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        recyclingKey={post.id}
      />
    </View>
  );
}

function PrChips({ prs }: { prs: Array<{ exercise_name: string; weight_kg: number; reps: number }> }) {
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
            borderRadius: radius.full,
            backgroundColor: colors.medal.goldSoft,
            borderWidth: 1,
            borderColor: colors.medal.goldBorder,
          }}
        >
          <Text variant="caption" style={{ color: colors.medal.gold }} weight="semibold">
            {pr.exercise_name} · {pr.weight_kg > 0 ? `${pr.weight_kg}kg × ${pr.reps} reps` : `Peso corporal · ${pr.reps} reps`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const PR_AUTOPLAY_MS = 3000;

function PrCarousel({ prs }: { prs: Array<{ exercise_name: string; weight_kg: number; reps: number }> }) {
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

  // Auto-deslizamiento: avanza al siguiente PR cada PR_AUTOPLAY_MS y vuelve
  // al primero al llegar al final.
  useEffect(() => {
    if (prs.length < 2) return;
    const t = setInterval(() => {
      if (interactingRef.current) return;
      const next = (idxRef.current + 1) % prs.length;
      idxRef.current = next;
      setActiveIdx(next);
      scrollRef.current?.scrollTo({ x: next * interval, animated: true });
    }, PR_AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [prs.length, interval]);

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
              backgroundColor: colors.medal.goldSoft,
              borderWidth: 1,
              borderColor: colors.medal.goldBorder,
              overflow: 'hidden',
            }}
          >
            <Text variant="caption" style={{ color: colors.medal.gold }} weight="bold" numberOfLines={1}>
              {pr.exercise_name}
            </Text>
            <Text variant="caption" style={{ color: colors.medal.gold, marginTop: 2 }} weight="semibold">
              {pr.weight_kg > 0 ? `${pr.weight_kg}kg × ${pr.reps} reps` : `Peso corporal · ${pr.reps} reps`}
            </Text>
          </View>
        ))}
      </ScrollView>
      )}

      {/* Dots de página */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: spacing.sm }}>
        {prs.map((_, i) => (
          <PrDot key={i} active={i === activeIdx} />
        ))}
      </View>
    </View>
  );
}

// Dot que se estira/encoge con spring al activarse, en lugar de saltar.
function PrDot({ active }: { active: boolean }) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: active ? 1 : 0,
      friction: 6,
      tension: 160,
      useNativeDriver: false, // anima width/color — no soportado por el driver nativo
    }).start();
  }, [active, anim]);

  return (
    <Animated.View
      style={{
        width: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 16] }),
        height: 6,
        borderRadius: 3,
        backgroundColor: anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['rgba(255,215,0,0.3)', 'rgba(255,215,0,1)'],
        }),
      }}
    />
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
        <Text variant="heading" tone="brand" numberOfLines={2} style={{ flexShrink: 1 }}>{post.title}</Text>
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
            <Icon name="trophy" size={12} color={colors.medal.gold} />
            <Text variant="caption" style={{ color: colors.medal.gold }} weight="bold">
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
        <View style={{ marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden' }}>
          <Image
            source={{ uri: post.photoUrl }}
            style={{ width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.bg.elevated }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            recyclingKey={post.id}
          />
        </View>
      ) : null}
    </View>
  );
}

const GOLD = colors.medal.gold;

export function PrGoldenWrapper({ children }: { children: React.ReactNode }) {
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
        borderRadius: radius.xl,
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
            backgroundColor: colors.medal.goldSoft,
            borderWidth: 1,
            borderColor: colors.medal.goldBorder,
          }}
        >
          <Icon name="trophy" size={18} color={GOLD} />
        </View>
        <Text variant="label" style={{ color: GOLD }}>Nuevo PR</Text>
      </View>
      <Text variant="title" numberOfLines={2} style={{ marginTop: spacing.sm, flexShrink: 1 }}>{post.title}</Text>
      {(weight !== undefined || reps) && (
        <Text variant="metric" style={{ color: GOLD, marginTop: spacing.xs }}>
          {weight !== undefined && weight > 0
            ? reps ? `${weight}kg × ${reps} reps` : `${weight}kg`
            : weight !== undefined
            ? reps ? `Peso corporal · ${reps} reps` : 'Peso corporal'
            : reps ? `${reps} reps` : ''}
        </Text>
      )}
      {post.subtitle ? (
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>{post.subtitle}</Text>
      ) : null}
      {post.photoUrl ? (
        <View style={{ marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden' }}>
          <Image
            source={{ uri: post.photoUrl }}
            style={{ width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.bg.elevated }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            recyclingKey={post.id}
          />
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
          <Icon name="lightning" size={20} color={colors.bg.base} />
          <Text weight="black" style={{ color: colors.bg.base }}>
            {info.label.toUpperCase()}
          </Text>
        </View>
        <Text variant="title" style={{ color: colors.bg.base, marginTop: spacing.sm }}>
          {post.title}
        </Text>
        <Text variant="caption" weight="bold" style={{ color: colors.bg.base, opacity: 0.75, marginTop: spacing.xs }}>
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
 * Resumen de reacciones: bíceps + total. Solo se muestra si hay al menos 1.
 */
function ReactionSummary({ post }: { post: Post }) {
  const total = totalReactions(post.reactions);
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
      <BicepIcon size={16} color={colors.accent.DEFAULT} />
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
  const insets = useSafeAreaInsets();
  const info = useMemo(() => rankInfo(post.user.currentRank), [post.user.currentRank]);
  const relative = useMemo(() => formatRelative(post.createdAt), [post.createdAt]);
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
        <Pressable
          hitSlop={6}
          onPress={handleReactTap}
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
        <Card variant="raised" padding="lg">{cardInner}</Card>
      )}

      {/* Owner menu — action sheet. Se monta solo al abrir: nunca dejar una hoja
          permanente por fila reciclada de la FlashList. */}
      {menuOpen && (
        <AppBottomSheet visible onClose={() => setMenuOpen(false)} enableDynamicSizing>
          <BottomSheetView
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.xs,
            }}
          >
            <PressableScale onPress={askDelete} style={{ paddingVertical: spacing.md }}>
              <Text weight="bold" tone="danger">Eliminar publicación</Text>
            </PressableScale>
            <PressableScale onPress={() => setMenuOpen(false)} style={{ paddingVertical: spacing.md }}>
              <Text tone="secondary">Cancelar</Text>
            </PressableScale>
          </BottomSheetView>
        </AppBottomSheet>
      )}

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
