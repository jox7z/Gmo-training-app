import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/ui/Toast';
import { EventCard } from '@/components/EventCard';
import { FeedItem } from '@/components/feed/FeedItem';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { CommentSheet } from '@/components/feed/CommentSheet';
import { colors, radius, spacing, RANKS } from '@/theme/tokens';
import {
  useCommunity,
  useCommunityMembers,
  useCommunityFeed,
  useCommunityEvents,
  useToggleJoinCommunity,
  useDeleteCommunity,
  useApproveMember,
  useRejectMember,
  useSetMemberRole,
  useRemoveMember,
  usePublishCommunityPost,
} from '@/lib/queries/communities';
import {
  useToggleReaction,
  useDeletePost,
  useIncrementShare,
  type Post,
  type ReactionKind,
} from '@/lib/queries/feed';
import { useAppStore, type UserProfile } from '@/store/app';
import type { CommunityMember } from '@/lib/repos/communities';
import type { RankId } from '@/theme/tokens';
import { colorForName } from '@/lib/avatarColor';

type DetailTab = 'muro' | 'eventos' | 'miembros';

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'muro',     label: 'Muro'     },
  { key: 'eventos',  label: 'Eventos'  },
  { key: 'miembros', label: 'Miembros' },
];

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

export default function CommunityDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const toast    = useToast();
  const insets   = useSafeAreaInsets();
  const [tab, setTab] = useState<DetailTab>('muro');
  const profile  = useAppStore((s) => s.profile);

  const communityQuery = useCommunity(id);
  const community      = communityQuery.data;

  const toggleJoin   = useToggleJoinCommunity();
  const deleteMut    = useDeleteCommunity();

  const isOwner = community?.myRole === 'owner';
  const isMod   = community?.myRole === 'moderator';
  const canManage = isOwner || isMod;
  const accentColor = community ? colorForName(community.name) : colors.primary.DEFAULT;

  const handleJoinLeave = () => {
    if (!community) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    if (community.isMember) {
      Alert.alert(
        'Salir de la comunidad',
        `¿Seguro que quieres salir de "${community.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: () =>
              toggleJoin.mutate(
                { communityId: community.id, joining: false, isPrivate: community.isPrivate },
                {
                  onSuccess: () => toast.show({ message: 'Saliste de la comunidad', tone: 'success' }),
                  onError:   (e) => toast.show({ message: e.message, tone: 'danger' }),
                },
              ),
          },
        ],
      );
    } else {
      toggleJoin.mutate(
        { communityId: community.id, joining: true, isPrivate: community.isPrivate },
        {
          onSuccess: (status) => {
            if (status === 'pending') {
              toast.show({ message: 'Solicitud enviada. El admin te dara acceso pronto', tone: 'success' });
            } else {
              toast.show({ message: 'Te uniste a la comunidad', tone: 'success' });
            }
          },
          onError: (e) => toast.show({ message: e.message, tone: 'danger' }),
        },
      );
    }
  };

  const handleDelete = () => {
    if (!community) return;
    Alert.alert(
      'Eliminar comunidad',
      `Esta acción es irreversible. Se perderán todos los datos de "${community.name}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            deleteMut.mutate(community.id, {
              onSuccess: () => {
                toast.show({ message: 'Comunidad eliminada', tone: 'success' });
                router.replace('/communities');
              },
              onError: (e) => toast.show({ message: e.message, tone: 'danger' }),
            }),
        },
      ],
    );
  };

  const showOwnerMenu = () => {
    Alert.alert(community?.name ?? 'Opciones', undefined, [
      {
        text: 'Editar comunidad',
        onPress: () =>
          router.push({ pathname: '/communities/edit/[id]', params: { id: community!.id } }),
      },
      { text: 'Eliminar comunidad', style: 'destructive', onPress: handleDelete },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (communityQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text variant="heading" style={{ textAlign: 'center' }}>Comunidad no encontrada</Text>
          <Button title="Volver" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  const initial = community.name.trim()[0]?.toUpperCase() ?? '?';

  // Join button label
  let joinLabel = 'Unirse';
  if (community.myStatus === 'pending') joinLabel = 'Solicitado';
  else if (community.isMember) joinLabel = 'Salir';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Nav row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
        }}
      >
        <IconButton icon="chevron-left" onPress={() => router.back()} iconSize={18} />
        <View style={{ flex: 1 }} />
        {isOwner && (
          <Pressable onPress={showOwnerMenu} hitSlop={8}>
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
              <Text style={{ color: colors.text.primary, fontSize: 18, lineHeight: 20 }}>
                {'···'}
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Hero */}
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {/* Cover */}
          <View
            style={{
              width: '100%',
              aspectRatio: 16 / 7,
              borderRadius: radius.xl,
              overflow: 'hidden',
            }}
          >
            {community.coverUrl ? (
              <Image
                source={{ uri: community.coverUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: accentColor + '22',
                }}
              >
                <Text weight="black" style={{ fontSize: 72, color: accentColor, opacity: 0.9 }}>
                  {initial}
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="heading" style={{ flex: 1, fontSize: 22 }} numberOfLines={2}>
                {community.name}
              </Text>
              {community.isPrivate && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    borderRadius: radius.full,
                    backgroundColor: colors.bg.elevated,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Icon name="lock" size={12} color={colors.text.muted} />
                  <Text variant="label" tone="muted" style={{ fontSize: 11 }}>Privada</Text>
                </View>
              )}
            </View>

            {community.description ? (
              <Text variant="body" tone="secondary">{community.description}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="users" size={14} color={colors.text.muted} />
              <Text variant="caption" tone="muted">
                {community.memberCount.toLocaleString()} miembro{community.memberCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Join / Leave / Pending button */}
          {!isOwner && (
            <Button
              title={joinLabel}
              variant={community.isMember ? 'secondary' : community.myStatus === 'pending' ? 'secondary' : 'primary'}
              onPress={handleJoinLeave}
              loading={toggleJoin.isPending}
              disabled={community.myStatus === 'pending'}
              fullWidth
            />
          )}
        </View>

        {/* Segmented tabs — sticky */}
        <View
          style={{
            backgroundColor: colors.bg.base,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.bg.elevated,
              borderRadius: radius.lg,
              padding: 4,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {DETAIL_TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radius.md,
                    backgroundColor: active ? colors.primary.DEFAULT : 'transparent',
                  }}
                >
                  <Text
                    weight="bold"
                    style={{ fontSize: 13, color: active ? colors.text.primary : colors.text.secondary }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Tab content */}
        <View style={{ paddingBottom: insets.bottom + spacing.xl }}>
          {tab === 'muro'    && (
            <MuroTab
              communityId={community.id}
              isMember={!!community.isMember && community.myStatus === 'active'}
              currentUserId={profile?.id}
              profile={profile ?? null}
              router={router}
              toast={toast}
            />
          )}
          {tab === 'eventos' && (
            <EventosTab
              communityId={community.id}
              isMember={!!community.isMember && community.myStatus === 'active'}
              router={router}
            />
          )}
          {tab === 'miembros' && (
            <MembersTab
              communityId={community.id}
              canManage={canManage}
              isOwner={isOwner}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Muro tab ─────────────────────────────────────────────────

function MuroTab({
  communityId,
  isMember,
  currentUserId,
  profile,
  router,
  toast,
}: {
  communityId: string;
  isMember: boolean;
  currentUserId: string | undefined;
  profile: UserProfile | null;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>;
}) {
  const feedQuery      = useCommunityFeed(communityId);
  const toggleReaction = useToggleReaction();
  const deletePost     = useDeletePost();
  const incrementShare = useIncrementShare();
  const publishPost    = usePublishCommunityPost();

  const [composerText, setComposerText] = useState('');
  const [commentsPostId, setCommentsPostId]         = useState<string | null>(null);
  const [commentsPostOwnerId, setCommentsPostOwnerId] = useState<string | null>(null);

  const posts: Post[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Post[] = [];
    for (const p of feedQuery.data?.pages.flatMap((pg) => pg.posts) ?? []) {
      if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
    }
    return out;
  }, [feedQuery.data]);

  const handlePublish = useCallback(() => {
    const text = composerText.trim();
    if (!text) return;
    publishPost.mutate(
      { caption: text, communityId },
      {
        onSuccess: () => {
          setComposerText('');
          toast.show({ message: '¡Publicado en el muro!', tone: 'success' });
        },
        onError: (e) =>
          toast.show({ message: e?.message ?? 'No se pudo publicar', tone: 'danger' }),
      },
    );
  }, [composerText, communityId, publishPost, toast]);

  const handleToggleReaction = useCallback(
    (postId: string, reaction: ReactionKind) => {
      toggleReaction.mutate(
        { postId, reaction },
        { onError: (err) => toast.show({ message: err?.message ?? 'Error', tone: 'danger' }) },
      );
    },
    [toggleReaction, toast],
  );

  const handleDelete = useCallback(
    (post: Post) => {
      Alert.alert(
        'Eliminar post',
        '¿Eliminar esta publicación?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              deletePost.mutate(post.id, {
                onSuccess: () => toast.show({ message: 'Post eliminado', tone: 'success' }),
                onError: (err) => toast.show({ message: err.message, tone: 'danger' }),
              });
            },
          },
        ],
      );
    },
    [deletePost, toast],
  );

  if (feedQuery.isLoading) {
    return (
      <View style={{ padding: spacing.lg }}>
        <FeedSkeleton count={2} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Composer — solo miembros activos */}
        {isMember && profile && (
          <Card variant="raised" padding="lg" style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <Avatar uri={profile.avatarUrl} name={profile.displayName ?? profile.username ?? ''} size={36} />
              <TextInput
                style={{
                  flex: 1,
                  color: colors.text.primary,
                  fontSize: 14,
                  lineHeight: 20,
                  minHeight: 40,
                  paddingTop: 0,
                }}
                placeholder="¿Qué hay de nuevo en la comunidad?"
                placeholderTextColor={colors.text.muted}
                value={composerText}
                onChangeText={setComposerText}
                multiline
                maxLength={500}
              />
            </View>
            {composerText.trim().length > 0 && (
              <Button
                title="Publicar"
                onPress={handlePublish}
                loading={publishPost.isPending}
                disabled={publishPost.isPending}
                style={{ alignSelf: 'flex-end' }}
              />
            )}
          </Card>
        )}

        {/* Feed */}
        {posts.length === 0 && !feedQuery.isLoading ? (
          <View style={{ paddingTop: spacing.xl, alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bg.elevated,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Icon name="chat" size={32} color={colors.text.muted} />
            </View>
            <Text variant="heading" style={{ textAlign: 'center' }}>El muro esta vacio</Text>
            <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
              {isMember ? 'Se el primero en publicar algo aqui.' : 'Unete para ver y publicar en el muro.'}
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <FeedItem
              key={post.id}
              post={post}
              isMine={post.userId === currentUserId}
              onToggleReaction={handleToggleReaction}
              onDelete={handleDelete}
              onOpenComments={(p) => { setCommentsPostId(p.id); setCommentsPostOwnerId(p.userId); }}
              onShare={(p) => incrementShare.mutate(p.id)}
              onOpenProfile={(p) => router.push({ pathname: '/profile/[username]', params: { username: p.user.username } })}
            />
          ))
        )}

        {/* Paginación */}
        {feedQuery.hasNextPage && (
          <Button
            title={feedQuery.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
            variant="secondary"
            onPress={() => feedQuery.fetchNextPage()}
            loading={feedQuery.isFetchingNextPage}
            fullWidth
          />
        )}
      </View>

      <CommentSheet
        visible={!!commentsPostId}
        postId={commentsPostId}
        postOwnerId={commentsPostOwnerId}
        currentUserId={currentUserId ?? null}
        onClose={() => { setCommentsPostId(null); setCommentsPostOwnerId(null); }}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Eventos tab ───────────────────────────────────────────────

function EventosTab({
  communityId,
  isMember,
  router,
}: {
  communityId: string;
  isMember: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const eventsQuery = useCommunityEvents(communityId);
  const events = eventsQuery.data ?? [];

  if (eventsQuery.isLoading) {
    return (
      <View style={{ paddingTop: spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      {isMember && (
        <Button
          title="Crear evento"
          leftIcon={<Icon name="plus" size={16} color={colors.text.primary} />}
          onPress={() =>
            router.push({
              pathname: '/events/new',
              params: { communityId },
            } as any)
          }
          fullWidth
        />
      )}

      {events.length === 0 ? (
        <View style={{ paddingTop: spacing.xl, alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="calendar" size={32} color={colors.text.muted} />
          </View>
          <Text variant="heading" style={{ textAlign: 'center' }}>Sin eventos aun</Text>
          <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
            {isMember ? 'Crea el primer evento de la comunidad.' : 'Unete para ver los eventos.'}
          </Text>
        </View>
      ) : (
        events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onPress={() =>
              router.push({ pathname: '/events/[id]', params: { id: event.id } })
            }
          />
        ))
      )}
    </View>
  );
}

// ─── Members tab ──────────────────────────────────────────────

function MembersTab({
  communityId,
  canManage,
  isOwner,
}: {
  communityId: string;
  canManage: boolean;
  isOwner: boolean;
}) {
  const toast        = useToast();
  const membersQuery = useCommunityMembers(communityId);
  const members      = membersQuery.data ?? [];
  const approveMut   = useApproveMember();
  const rejectMut    = useRejectMember();
  const roleMut      = useSetMemberRole();
  const removeMut    = useRemoveMember();

  const active  = members.filter((m) => m.status === 'active');
  const pending = members.filter((m) => m.status === 'pending');

  if (membersQuery.isLoading) {
    return (
      <View style={{ paddingTop: spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary.DEFAULT} />
      </View>
    );
  }

  const handleMemberAction = (member: CommunityMember) => {
    const options: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];

    if (isOwner && member.role !== 'owner') {
      if (member.role === 'member') {
        options.push({
          text: 'Promover a Moderador',
          onPress: () =>
            roleMut.mutate(
              { communityId, userId: member.userId, role: 'moderator' },
              {
                onSuccess: () => toast.show({ message: 'Promovido a moderador', tone: 'success' }),
                onError:   (e) => toast.show({ message: e.message, tone: 'danger' }),
              },
            ),
        });
      } else if (member.role === 'moderator') {
        options.push({
          text: 'Degradar a Miembro',
          onPress: () =>
            roleMut.mutate(
              { communityId, userId: member.userId, role: 'member' },
              {
                onSuccess: () => toast.show({ message: 'Degradado a miembro', tone: 'success' }),
                onError:   (e) => toast.show({ message: e.message, tone: 'danger' }),
              },
            ),
        });
      }
    }

    if (canManage && member.role !== 'owner') {
      options.push({
        text: 'Eliminar de la comunidad',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Eliminar miembro',
            `¿Eliminar a @${member.username} de la comunidad?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () =>
                  removeMut.mutate(
                    { communityId, userId: member.userId },
                    {
                      onSuccess: () => toast.show({ message: 'Miembro eliminado', tone: 'success' }),
                      onError:   (e) => toast.show({ message: e.message, tone: 'danger' }),
                    },
                  ),
              },
            ],
          ),
      });
    }

    if (options.length === 0) return;
    options.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert(`@${member.username}`, undefined, options);
  };

  return (
    <View style={{ padding: spacing.lg, gap: spacing.lg }}>
      {/* Pending requests — solo para owner/mod */}
      {canManage && pending.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="secondary">
            SOLICITUDES PENDIENTES ({pending.length})
          </Text>
          {pending.map((m) => (
            <Card key={m.userId} padding="md" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar
                uri={m.avatarUrl}
                name={m.displayName}
                size={44}
                borderColor={rankInfo(m.currentRank).color}
              />
              <View style={{ flex: 1 }}>
                <Text weight="bold" numberOfLines={1}>{m.displayName}</Text>
                <Text variant="caption" tone="muted">@{m.username}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable
                  onPress={() =>
                    approveMut.mutate(
                      { communityId, userId: m.userId },
                      {
                        onSuccess: () => toast.show({ message: 'Solicitud aprobada', tone: 'success' }),
                        onError:   (e) => toast.show({ message: e.message, tone: 'danger' }),
                      },
                    )
                  }
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: 7,
                    borderRadius: radius.md,
                    backgroundColor: colors.success,
                  }}
                >
                  <Text weight="bold" style={{ color: colors.text.primary, fontSize: 13 }}>Aprobar</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    rejectMut.mutate(
                      { communityId, userId: m.userId },
                      {
                        onSuccess: () => toast.show({ message: 'Solicitud rechazada', tone: 'success' }),
                        onError:   (e) => toast.show({ message: e.message, tone: 'danger' }),
                      },
                    )
                  }
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: 7,
                    borderRadius: radius.md,
                    backgroundColor: colors.bg.elevated,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text weight="bold" style={{ color: colors.text.secondary, fontSize: 13 }}>Rechazar</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Active members */}
      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="secondary">
          MIEMBROS ({active.length})
        </Text>
        {active.length === 0 ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center', paddingVertical: spacing.lg }}>
            Aún no hay miembros activos
          </Text>
        ) : (
          active.map((m) => {
            const info     = rankInfo(m.currentRank);
            const isOwnerRow = m.role === 'owner';
            const roleLabel  = m.role === 'owner' ? 'Owner' : m.role === 'moderator' ? 'Mod' : null;
            const canTap     = canManage && !isOwnerRow;

            return (
              <Pressable
                key={m.userId}
                onPress={() => canTap && handleMemberAction(m)}
                disabled={!canTap}
                style={({ pressed }) => [pressed && canTap && { opacity: 0.85 }]}
              >
                <Card padding="md" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Avatar
                    uri={m.avatarUrl}
                    name={m.displayName}
                    size={44}
                    borderColor={info.color}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Text weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {m.displayName}
                      </Text>
                      {roleLabel && (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: radius.full,
                            backgroundColor: isOwnerRow ? colors.primary.muted : colors.bg.elevated,
                            borderWidth: 1,
                            borderColor: isOwnerRow ? colors.primary.DEFAULT : colors.border,
                          }}
                        >
                          <Text
                            variant="label"
                            style={{
                              fontSize: 10,
                              color: isOwnerRow ? colors.primary.DEFAULT : colors.text.secondary,
                            }}
                          >
                            {roleLabel}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text variant="caption" tone="muted">@{m.username} · {info.label}</Text>
                  </View>
                  {canTap && (
                    <Icon name="chevron-right" size={16} color={colors.text.muted} />
                  )}
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}
