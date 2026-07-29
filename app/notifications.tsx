import { useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, radius } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PressableScale } from '@/components/ui/PressableScale';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useNotifications, useMarkRead, type Notification } from '@/lib/queries/notifications';
import { formatRelative } from '@/lib/format';

// =====================================================
// Helpers
// =====================================================

function notificationText(n: Notification): string {
  const actor = n.actor?.displayName || n.actor?.username || 'Alguien';

  switch (n.type) {
    case 'reaction': {
      const rt = n.metadata?.reaction_type as string | undefined;
      const emoji = rt === 'muscle' ? '💪' : rt === 'heart' ? '❤️' : '';
      return `${actor} reaccionó ${emoji} a tu publicación`;
    }
    case 'comment': {
      const snippet = n.metadata?.comment_snippet as string | undefined;
      return snippet
        ? `${actor} comentó: "${snippet}"`
        : `${actor} comentó tu publicación`;
    }
    case 'follow':
      return `${actor} te empezó a seguir`;
    case 'community':
      return n.eventTitle
        ? `${actor} se unió al evento "${n.eventTitle}"`
        : `${actor} se unió a un evento`;
    case 'event':
      return n.eventTitle
        ? `Recordatorio: "${n.eventTitle}" está por comenzar`
        : 'Tienes un evento próximo';
    default:
      return 'Nueva notificación';
  }
}

// =====================================================
// NotificationRow
// =====================================================

function NotificationRow({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (n: Notification) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.md,
          backgroundColor: item.isRead ? 'transparent' : colors.primary.muted,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      {/* Avatar del actor */}
      <View style={{ position: 'relative' }}>
        <Avatar
          uri={item.actor?.avatarUrl}
          name={item.actor?.displayName || item.actor?.username}
          size={44}
          bordered={false}
        />
        {/* Indicador de no leída */}
        {!item.isRead && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 10,
              height: 10,
              borderRadius: radius.full,
              backgroundColor: colors.danger,
              borderWidth: 1.5,
              borderColor: colors.bg.base,
            }}
          />
        )}
      </View>

      {/* Texto */}
      <View style={{ flex: 1 }}>
        <Text variant="body" numberOfLines={2}>
          {notificationText(item)}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {formatRelative(item.createdAt)}
        </Text>
      </View>

      {/* Flecha si hay destino */}
      {(item.postId || item.eventId || item.type === 'follow') && (
        <Icon name="chevron-right" size={16} color={colors.text.muted} />
      )}
    </Pressable>
  );
}

// =====================================================
// Separator
// =====================================================

function Separator() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginLeft: spacing.lg + 44 + spacing.md,
      }}
    />
  );
}

// =====================================================
// Empty state
// =====================================================


// =====================================================
// Screen
// =====================================================

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const notificationsQuery = useNotifications();
  const markRead = useMarkRead();

  const notifications: Notification[] = useMemo(
    () => notificationsQuery.data?.pages.flatMap((p) => p.notifications) ?? [],
    [notificationsQuery.data],
  );

  const isInitialLoading = notificationsQuery.isLoading && notifications.length === 0;
  const isEmpty = !isInitialLoading && !notificationsQuery.error && notifications.length === 0;

  // Al abrir la pantalla, marcar todas como leídas
  // Se ejecuta solo la primera vez que el query resuelve y hay no leídas
  const hasUnread = notifications.some((n) => !n.isRead);

  const handleMarkAll = useCallback(() => {
    if (hasUnread && !markRead.isPending) {
      markRead.mutate({});
    }
  }, [hasUnread, markRead]);

  // Marcar todo al montar cuando ya hay datos
  useMemo(() => {
    if (notifications.length > 0 && hasUnread) {
      markRead.mutate({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length === 0]);

  const onRefresh = useCallback(() => {
    notificationsQuery.refetch();
  }, [notificationsQuery]);

  const onEndReached = useCallback(() => {
    if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) {
      notificationsQuery.fetchNextPage();
    }
  }, [notificationsQuery]);

  const handlePress = useCallback(
    (n: Notification) => {
      // Marcar esta como leída si no lo está
      if (!n.isRead) {
        markRead.mutate({ ids: [n.id] });
      }

      // Navegar al destino
      if (n.type === 'follow' && n.actor?.username) {
        router.push({ pathname: '/profile/[username]', params: { username: n.actor.username } });
      } else if (n.postId) {
        // Navegar al feed. En el futuro se puede profundizar hacia comentarios.
        router.push('/(tabs)');
      } else if ((n.type === 'event' || n.type === 'community') && n.eventId) {
        router.push({ pathname: '/events/[id]', params: { id: n.eventId } });
      }
    },
    [router, markRead],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      <ScreenHeader
        title="Notificaciones"
        subtitle="Reacciones, comentarios y seguidores recientes"
        border
        style={{ backgroundColor: colors.bg.base }}
        right={
          hasUnread ? (
            <PressableScale
              onPress={handleMarkAll}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              accessibilityLabel="Marcar todas las notificaciones como leídas"
              haptic={false}
            >
              <Text variant="caption" tone="brand" weight="semibold">
                Marcar todo
              </Text>
            </PressableScale>
          ) : undefined
        }
      />

      {/* Content */}
      {isInitialLoading ? (
        <View style={{ padding: spacing.lg }}>
          <SkeletonRows rows={7} accessibilityLabel="Cargando notificaciones" />
        </View>
      ) : (
        <FlashList<Notification>
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow item={item} onPress={handlePress} />
          )}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={{
            paddingBottom: insets.bottom + spacing.xl,
          }}
          ListEmptyComponent={
            isEmpty ? (
              <EmptyState
                icon="bell"
                title="Sin notificaciones"
                description="Cuando alguien reaccione, comente o te siga, aparecerá aquí."
                action={{ label: "Buscar atletas", onPress: () => router.push("/discover") }}
                style={{ paddingTop: spacing["3xl"] }}
              />
            ) : null
          }
          ListFooterComponent={
            notificationsQuery.isFetchingNextPage ? (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary.DEFAULT} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={notificationsQuery.isRefetching && !notificationsQuery.isFetchingNextPage}
              onRefresh={onRefresh}
              tintColor={colors.primary.DEFAULT}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
