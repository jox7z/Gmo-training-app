/**
 * Explorador de rutinas públicas (solo lectura).
 * Lista rutinas con is_public=true de cualquier usuario; tocar una abre el
 * detalle en /routine/public/[id]. No hay acción de guardar/adoptar (este
 * sprint no soporta múltiples rutinas locales conviviendo).
 */
import { View, FlatList } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { colors, spacing } from '@/theme/tokens';
import { useQueryState } from '@/lib/queryState';
import { usePublicRoutines, type PublicRoutineSummary } from '@/lib/queries/routines';

export default function ExplorePublicRoutines() {
  const router = useRouter();
  const query = usePublicRoutines();
  const data = query.data ?? [];

  const state = useQueryState({
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: data.length === 0,
  });

  return (
    <Screen scroll={false} padded={false}>
      {/* Cabecera */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing.md,
        }}
      >
        <PressableScale onPress={() => router.back()} hitSlop={12} pressScale={0.9}>
          <Icon name="chevron-left" size={24} color={colors.text.secondary} />
        </PressableScale>
        <Text variant="title" style={{ flex: 1 }}>
          Rutinas públicas
        </Text>
      </View>

      {state === 'loading' ? (
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} padding="lg" style={{ height: 96 }} />
          ))}
        </View>
      ) : state === 'error' ? (
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
          <ErrorState onRetry={() => query.refetch()} />
        </View>
      ) : (
        <FlatList<PublicRoutineSummary>
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing['3xl'],
            gap: spacing.md,
          }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).springify().damping(18)}>
              <PublicRoutineCard
                routine={item}
                onPress={() =>
                  router.push({
                    pathname: '/routine/public/[id]',
                    params: {
                      id: item.id,
                      ownerName: item.ownerDisplayName,
                      ownerUsername: item.ownerUsername,
                      ownerAvatar: item.ownerAvatarUrl ?? '',
                    },
                  })
                }
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="globe"
              title="Aún no hay rutinas públicas"
              subtitle="Cuando alguien comparta una rutina, aparecerá aquí."
            />
          }
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function PublicRoutineCard({
  routine,
  onPress,
}: {
  routine: PublicRoutineSummary;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} pressScale={0.98}>
      <Card variant="raised" padding="lg" style={{ gap: spacing.sm }}>
        <Text variant="heading" numberOfLines={1}>
          {routine.name}
        </Text>

        {routine.description != null && routine.description.length > 0 && (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {routine.description}
          </Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="calendar" size={14} color={colors.text.muted} />
          <Text variant="caption" tone="muted">
            {routine.dayCount} {routine.dayCount === 1 ? 'día' : 'días'} · {routine.splitType}
          </Text>
        </View>

        {/* Dueño */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
          <Avatar
            uri={routine.ownerAvatarUrl}
            name={routine.ownerDisplayName}
            size={28}
            bordered={false}
            recyclingKey={routine.id}
          />
          <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
            {routine.ownerDisplayName}
            {routine.ownerUsername ? (
              <Text variant="caption" tone="muted">
                {'  @' + routine.ownerUsername}
              </Text>
            ) : null}
          </Text>
        </View>
      </Card>
    </PressableScale>
  );
}
