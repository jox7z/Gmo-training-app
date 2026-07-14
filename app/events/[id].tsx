import { useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, spacing, RANKS, podiumColor, type RankId } from '@/theme/tokens';
import {
  useEvent,
  useEventParticipants,
  useToggleJoinEvent,
  useDeleteEvent,
  useEventComments,
} from '@/lib/queries/events';
import { EventCommentSheet } from '@/components/EventCommentSheet';
import { useAppStore } from '@/store/app';
import type { EventParticipant } from '@/lib/repos/events';

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const currentUserId = useAppStore((s) => s.profile?.id);

  const eventQuery = useEvent(id);
  const participantsQuery = useEventParticipants(id);
  const commentsQuery = useEventComments(id);
  const toggleJoin = useToggleJoinEvent();
  const deleteEvent = useDeleteEvent();

  const [commentsVisible, setCommentsVisible] = useState(false);

  const event = eventQuery.data;
  const participants = participantsQuery.data ?? [];
  const isChallenge = event?.kind === 'challenge';
  const commentCount = commentsQuery.data?.length ?? 0;

  const handleToggle = () => {
    if (!event) return;
    toggleJoin.mutate(
      { eventId: event.id, joined: !event.isJoined },
      {
        onError: (err) =>
          toast.show({ message: err?.message ?? 'No se pudo actualizar', tone: 'danger' }),
        onSuccess: () =>
          toast.show({
            message: event.isJoined ? 'Saliste del evento' : '¡Te uniste al evento!',
            tone: 'success',
          }),
      },
    );
  };

  const handleEdit = () => {
    if (!event) return;
    router.push({ pathname: '/events/edit/[id]', params: { id: event.id } } as unknown as Href);
  };

  const handleDelete = () => {
    if (!event) return;
    Alert.alert(
      'Eliminar evento',
      '¿Seguro que quieres eliminar este evento? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteEvent.mutate(event.id, {
              onSuccess: () => {
                toast.show({ message: 'Evento eliminado', tone: 'success' });
                router.back();
              },
              onError: (err) =>
                toast.show({ message: err?.message ?? 'No se pudo eliminar', tone: 'danger' }),
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <IconButton icon="chevron-left" onPress={() => router.back()} iconSize={18} />
        <Text variant="heading" style={{ flex: 1 }} numberOfLines={1}>
          {event?.kind === 'meetup' ? 'Quedada' : event?.kind === 'challenge' ? 'Reto' : 'Evento'}
        </Text>
        {/* Menú del creador */}
        {event?.isCreator && (
          <Pressable
            onPress={() =>
              Alert.alert(
                event.title,
                undefined,
                [
                  { text: 'Editar', onPress: handleEdit },
                  { text: 'Eliminar', style: 'destructive', onPress: handleDelete },
                  { text: 'Cancelar', style: 'cancel' },
                ],
              )
            }
            hitSlop={8}
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
            <Text style={{ fontSize: 18, color: colors.text.primary, lineHeight: 20 }}>{'···'}</Text>
          </Pressable>
        )}
      </View>

      {eventQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary.DEFAULT} />
        </View>
      ) : !event ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Icon name="calendar" size={32} color={colors.text.muted} />
          <Text tone="muted" style={{ marginTop: spacing.md, textAlign: 'center' }}>
            Este evento ya no está disponible.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
            gap: spacing.md,
          }}
        >
          {/* Portada */}
          {event.coverUrl ? (
            <Image
              source={{ uri: event.coverUrl }}
              style={{ width: '100%', aspectRatio: 16 / 9 }}
              resizeMode="cover"
            />
          ) : null}

          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Badge label={isChallenge ? 'RETO' : 'QUEDADA'} tone={isChallenge ? 'brand' : 'info'} />
              {event.isJoined && <Badge label="INSCRITO" tone="success" />}
              {event.communityName && event.communityId && (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/communities/[id]', params: { id: event.communityId! } })
                  }
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 4,
                      borderRadius: radius.full,
                      backgroundColor: colors.primary.muted,
                      borderWidth: 1,
                      borderColor: colors.primary.DEFAULT,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Icon name="users" size={11} color={colors.primary.DEFAULT} />
                  <Text
                    variant="label"
                    style={{ fontSize: 11, color: colors.primary.DEFAULT }}
                    numberOfLines={1}
                  >
                    {event.communityName}
                  </Text>
                </Pressable>
              )}
            </View>

            <Text variant="title">{event.title}</Text>

            {event.description ? (
              <Text tone="secondary">{event.description}</Text>
            ) : null}

            <Card variant="raised" padding="lg" style={{ gap: spacing.md }}>
              <InfoRow icon="calendar" label="Inicio" value={fullDate(event.startsAt)} />
              {event.endsAt ? (
                <InfoRow icon="clock" label="Fin" value={fullDate(event.endsAt)} />
              ) : null}
              {isChallenge && event.metric ? (
                <InfoRow icon="target" label="Se mide" value={event.metric} />
              ) : null}
              {!isChallenge && event.location ? (
                <InfoRow icon="map-pin" label="Lugar" value={event.location} />
              ) : null}
              <InfoRow icon="users" label="Participantes" value={`${event.participantCount}`} />
              <InfoRow icon="robot" label="Organiza" value={`@${event.creatorUsername}`} />
            </Card>

            <Button
              title={event.isJoined ? (isChallenge ? 'Abandonar reto' : 'Cancelar asistencia') : (isChallenge ? 'Unirme al reto' : 'Apuntarme')}
              variant={event.isJoined ? 'secondary' : 'primary'}
              onPress={handleToggle}
              loading={toggleJoin.isPending}
              fullWidth
              leftIcon={
                !event.isJoined ? (
                  <Icon name={isChallenge ? 'trophy' : 'check'} size={18} color={colors.text.primary} />
                ) : undefined
              }
            />

            {/* Botón comentarios */}
            <Pressable
              onPress={() => setCommentsVisible(true)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.bg.elevated,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Icon name="chat" size={18} color={colors.text.secondary} />
              <Text tone="secondary" weight="semibold">
                Comentarios{commentCount > 0 ? ` (${commentCount})` : ''}
              </Text>
            </Pressable>

            {/* Participantes / ranking interno */}
            <View style={{ marginTop: spacing.sm }}>
              <Text variant="heading" style={{ marginBottom: spacing.sm }}>
                {isChallenge ? 'Clasificación' : 'Asistentes'}
              </Text>
              <Card padding="md">
                {participantsQuery.isLoading ? (
                  <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary.DEFAULT} />
                  </View>
                ) : participants.length === 0 ? (
                  <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                    <Text variant="caption" tone="muted">Sé el primero en unirte.</Text>
                  </View>
                ) : (
                  participants.map((p, i) => (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      position={i + 1}
                      showScore={isChallenge}
                      showDivider={i < participants.length - 1}
                      onOpen={() =>
                        router.push({ pathname: '/profile/[username]', params: { username: p.username } })
                      }
                    />
                  ))
                )}
              </Card>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Sheet de comentarios */}
      {id ? (
        <EventCommentSheet
          visible={commentsVisible}
          eventId={id}
          eventOwnerId={event?.creatorId ?? null}
          currentUserId={currentUserId ?? null}
          onClose={() => setCommentsVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Icon name={icon} size={18} color={colors.text.muted} />
      <Text variant="caption" tone="muted" style={{ width: 96 }}>{label}</Text>
      <Text style={{ flex: 1 }} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function ParticipantRow({
  participant,
  position,
  showScore,
  showDivider,
  onOpen,
}: {
  participant: EventParticipant;
  position: number;
  showScore: boolean;
  showDivider: boolean;
  onOpen: () => void;
}) {
  const info = rankInfo(participant.currentRank);
  const posColor = podiumColor(position);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xs,
          borderBottomWidth: showDivider ? 1 : 0,
          borderBottomColor: colors.border,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {showScore && (
        <Text weight="black" numeric style={{ width: 26, textAlign: 'center', color: posColor }}>
          {position}
        </Text>
      )}
      <Avatar uri={participant.avatarUrl} name={participant.displayName} size={38} borderColor={info.color} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {participant.displayName}
          </Text>
          {participant.isCreator && <Badge label="HOST" tone="accent" />}
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>@{participant.username}</Text>
      </View>
      {showScore ? (
        <Text weight="bold" numeric style={{ color: info.color }}>
          {participant.score > 0
            ? `${participant.score.toLocaleString()} entrenos`
            : '0 entrenos'}
        </Text>
      ) : null}
    </Pressable>
  );
}
