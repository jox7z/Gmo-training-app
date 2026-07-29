import { useState } from 'react';
import { View, FlatList, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { Icon } from '@/components/Icon';
import { EventCard } from '@/components/EventCard';
import { SocialErrorState } from '@/components/social/SocialErrorState';
import { colors, spacing } from '@/theme/tokens';
import { useEvents, type EventFilter } from '@/lib/queries/events';
import type { CommunityEvent } from '@/lib/repos/events';

const EVENT_FILTERS: { key: EventFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'challenge', label: 'Retos' },
  { key: 'meetup', label: 'Quedadas' },
  { key: 'joined', label: 'Inscrito' },
  { key: 'mine', label: 'Míos' },
];

interface Props {
  /** Espacio extra al final: la barra de pestañas de GMUP tapa el último ítem. */
  bottomInset?: number;
}

/**
 * Explorador vertical de eventos.
 *
 * Vivía dentro de `app/discover.tsx`; ahora es la vista "Eventos" del hub
 * GMUP, donde vive toda la visibilidad de eventos.
 */
export function EventsExplorer({ bottomInset = 0 }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<EventFilter>('all');
  const eventsQuery = useEvents(filter);
  const events = eventsQuery.data ?? [];
  const hasEvents = events.length > 0;
  const showBlockingError = eventsQuery.isError && !hasEvents;
  const showStaleError = eventsQuery.isError && hasEvents;

  return (
    <FlatList<CommunityEvent>
      data={events}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => (
        <EventCard
          event={item}
          layout="stream"
          onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })}
        />
      )}
      ListHeaderComponent={
        <View
          style={{
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            marginBottom: spacing.sm,
          }}
        >
          <Button
            title="Crear evento"
            leftIcon={<Icon name="plus" size={spacing.lg} color={colors.text.primary} />}
            onPress={() => router.push('/events/new')}
            fullWidth
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {EVENT_FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  selected={filter === f.key}
                  onPress={() => setFilter(f.key)}
                  accessibilityLabel={`Filtrar eventos: ${f.label}`}
                  accessibilityHint="Actualiza la lista de eventos"
                />
              ))}
            </View>
          </ScrollView>

          {showStaleError && (
            <SocialErrorState
              compact
              title="No pudimos actualizar los eventos"
              subtitle="Mostramos la última información disponible mientras recuperas la conexión."
              onRetry={() => void eventsQuery.refetch()}
              isRetrying={eventsQuery.isFetching}
            />
          )}
        </View>
      }
      contentContainerStyle={{
        paddingBottom: insets.bottom + spacing.lg + bottomInset,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        gap: spacing.sm,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: spacing.lg }}>
          {eventsQuery.isLoading ? (
            <SkeletonRows rows={4} accessibilityLabel="Cargando eventos" />
          ) : showBlockingError ? (
            <SocialErrorState
              title="No pudimos cargar los eventos"
              subtitle="Revisa tu conexión y vuelve a intentarlo. También puedes crear un evento cuando estés en línea."
              onRetry={() => void eventsQuery.refetch()}
              isRetrying={eventsQuery.isFetching}
            />
          ) : (
            <EmptyState
              icon="calendar"
              title="Sin eventos por aquí"
              description="Aún no hay eventos en esta categoría. Crea el primero y reúne a la comunidad."
              action={{ label: 'Crear evento', onPress: () => router.push('/events/new') }}
            />
          )}
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
