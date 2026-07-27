/**
 * Detalle de una rutina pública (SOLO LECTURA).
 * No hay botón guardar/editar/duplicar/adoptar: este sprint no soporta múltiples
 * rutinas locales conviviendo, así que solo se muestra el contenido ajeno.
 * El dueño llega por params de navegación (ya resuelto en el explorador); el
 * contenido (días/ejercicios) por usePublicRoutineDetail.
 */
import { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { usePublicRoutineDetail } from '@/lib/queries/routines';
import { useExerciseNames } from '@/lib/queries/exercises';
import { exerciseById } from '@/data/exercises';

export default function PublicRoutineDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    ownerName?: string;
    ownerUsername?: string;
    ownerAvatar?: string;
  }>();
  const query = usePublicRoutineDetail(params.id);
  const routine = query.data ?? null;

  // Ejercicios que exerciseById no resuelve localmente: catálogo estático no
  // los tiene y el cache de módulo solo conoce los custom del VIEWER, no los
  // del dueño de esta rutina (ver src/lib/queries/exercises.ts). RLS de
  // exercises permite leer cualquier fila, así que se resuelven aparte.
  const unresolvedIds = useMemo(() => {
    if (!routine) return [];
    const ids = new Set<string>();
    for (const day of routine.days) {
      for (const ex of day.exercises) {
        if (!exerciseById(ex.exerciseId)) ids.add(ex.exerciseId);
      }
    }
    return [...ids];
  }, [routine]);
  const { data: fetchedExercises } = useExerciseNames(unresolvedIds);
  const fetchedNameById = useMemo(() => {
    const map = new Map<string, string>();
    (fetchedExercises ?? []).forEach((e) => map.set(e.id, e.name));
    return map;
  }, [fetchedExercises]);

  const state = useQueryState({
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: !routine,
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
        <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
          {routine?.name ?? 'Rutina pública'}
        </Text>
      </View>

      {state === 'loading' ? (
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          {[0, 1, 2].map((i) => (
            <Card key={i} padding="lg" style={{ height: 120 }} />
          ))}
        </View>
      ) : state === 'error' ? (
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
          <ErrorState onRetry={() => query.refetch()} />
        </View>
      ) : state === 'empty' || !routine ? (
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
          <EmptyState
            icon="globe"
            title="Rutina no disponible"
            subtitle="Puede que ya no sea pública o que haya sido eliminada."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md }}
          showsVerticalScrollIndicator={false}
        >
          {/* Dueño */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar uri={params.ownerAvatar || undefined} name={params.ownerName} size={40} />
            <View style={{ flex: 1 }}>
              <Text weight="bold" numberOfLines={1}>
                {params.ownerName ?? 'Atleta'}
              </Text>
              {params.ownerUsername ? (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  @{params.ownerUsername}
                </Text>
              ) : null}
            </View>
          </View>

          {routine.description != null && routine.description.length > 0 && (
            <Text variant="caption" tone="secondary">
              {routine.description}
            </Text>
          )}

          <Text variant="caption" tone="muted">
            {routine.days.length} {routine.days.length === 1 ? 'día' : 'días'} · {routine.splitType}
          </Text>

          {/* Días */}
          {routine.days.map((day, di) => (
            <Animated.View
              key={day.id}
              entering={FadeInDown.delay(Math.min(di, 8) * 60).springify().damping(18)}
            >
              <Card variant="raised" padding="lg" style={{ gap: spacing.sm }}>
                <Text variant="heading">{day.name}</Text>
                {day.exercises.length === 0 ? (
                  <Text variant="caption" tone="muted">
                    Sin ejercicios.
                  </Text>
                ) : (
                  day.exercises.map((ex) => {
                    const meta = exerciseById(ex.exerciseId);
                    const name = meta?.name ?? fetchedNameById.get(ex.exerciseId) ?? ex.exerciseId;
                    return (
                      <View
                        key={ex.id}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: colors.primary.DEFAULT,
                          }}
                        />
                        <Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                          {name}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {ex.targetSets}x{ex.targetRepsMin}-{ex.targetRepsMax}
                        </Text>
                      </View>
                    );
                  })
                )}
              </Card>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
