import { useCallback, useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { IconButton } from '@/components/ui/IconButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Icon, type IconName } from '@/components/Icon';
import { SocialErrorState } from '@/components/social/SocialErrorState';
import { CommunitiesExplorer } from '@/components/communities/CommunitiesExplorer';
import { isEventFinished } from '@/components/EventCard';

import { GmupSectionHeader } from '@/components/gmup/GmupSectionHeader';
import { EventsExplorer } from '@/components/gmup/EventsExplorer';
import { GlobalRanking } from '@/components/gmup/GlobalRanking';
import { RankPodium } from '@/components/gmup/RankPodium';
import {
  CommunityTile,
  CommunityCreateTile,
  COMMUNITY_TILE_WIDTH,
} from '@/components/gmup/CommunityTile';
import {
  EventSpotlightCard,
  EVENT_SPOTLIGHT_WIDTH,
} from '@/components/gmup/EventSpotlightCard';
import {
  SuggestedAthleteCard,
  SUGGESTED_ATHLETE_WIDTH,
} from '@/components/gmup/SuggestedAthleteCard';

import { colors, fontSize, radius, spacing } from '@/theme/tokens';
import { useCommunities } from '@/lib/queries/communities';
import { useEvents } from '@/lib/queries/events';
import { useDiscover } from '@/lib/queries/feed';
import { useGlobalLeaderboard } from '@/lib/queries/social';

/**
 * Comunidad — el hub social de la app.
 *
 * Reúne comunidades, eventos, ranking global y atletas sugeridos. Es la
 * segunda página del PagerView principal. La búsqueda general vive fuera, en
 * `/discover`, que solo busca atletas y comunidades.
 */

type GmupView = 'explore' | 'communities' | 'events' | 'ranking';

const VIEWS: { value: GmupView; label: string }[] = [
  { value: 'explore',     label: 'Explorar'    },
  { value: 'communities', label: 'Comunidades' },
  { value: 'events',      label: 'Eventos'     },
  { value: 'ranking',     label: 'Ranking'     },
];

/** Alto aproximado de la barra de pestañas flotante sobre el contenido. */
const TAB_BAR_CLEARANCE = 100;

/** Máximo de tarjetas por carrusel: el hub resume, no lista. */
const CAROUSEL_LIMIT = 10;

export default function GmupScreen() {
  const router = useRouter();
  const [view, setView] = useState<GmupView>('explore');
  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = useCallback((path: '/communities/new' | '/events/new') => {
    setCreateOpen(false);
    router.push(path);
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text
              variant="title"
              weight="black"
              accessibilityRole="header"
              style={{ letterSpacing: -1.4 }}
            >
              Comunidad
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              Entrena en equipo
            </Text>
          </View>

          <IconButton
            name="search"
            accessibilityLabel="Buscar"
            accessibilityHint="Abre el buscador de atletas y comunidades"
            onPress={() => router.push('/discover')}
            variant="surface"
            size="sm"
            iconColor={colors.text.primary}
            haptic={false}
          />
          <IconButton
            name="plus"
            accessibilityLabel="Crear"
            accessibilityHint="Elige entre crear una comunidad o un evento"
            onPress={() => setCreateOpen(true)}
            variant="primary"
            size="sm"
            iconColor={colors.text.primary}
          />
        </View>

        <SegmentedControl<GmupView>
          options={VIEWS}
          value={view}
          onValueChange={setView}
          accessibilityLabel="Secciones de Comunidad"
        />
      </View>

      {view === 'explore' && <ExploreView onChangeView={setView} />}
      {view === 'communities' && <CommunitiesExplorer bottomInset={TAB_BAR_CLEARANCE} />}
      {view === 'events' && <EventsExplorer bottomInset={TAB_BAR_CLEARANCE} />}
      {view === 'ranking' && <GlobalRanking bottomInset={TAB_BAR_CLEARANCE} />}

      <Sheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear"
        subtitle="¿Qué quieres poner en marcha?"
      >
        <CreateOption
          icon="users"
          title="Crear comunidad"
          description="Tu gente, con feed y eventos propios."
          onPress={() => openCreate('/communities/new')}
        />
        <CreateOption
          icon="calendar"
          title="Crear evento"
          description="Un reto o una quedada."
          onPress={() => openCreate('/events/new')}
        />
      </Sheet>
    </SafeAreaView>
  );
}

function CreateOption({
  icon,
  title,
  description,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      pressScale={0.98}
      haptic={false}
    >
      <Card
        variant="raised"
        padding="md"
        style={{
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <View
          style={{
            width: spacing['2xl'] + spacing.sm,
            height: spacing['2xl'] + spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.primary.glow,
            backgroundColor: colors.primary.muted,
          }}
        >
          <Icon name={icon} size={spacing.xl} color={colors.primary.DEFAULT} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="bold">{title}</Text>
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        </View>
        <Icon name="chevron-right" size={spacing.lg} color={colors.text.muted} />
      </Card>
    </PressableScale>
  );
}

// =====================================================
// EXPLORAR — el hub social
// =====================================================

function ExploreView({ onChangeView }: { onChangeView: (view: GmupView) => void }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      contentContainerStyle={{
        paddingTop: spacing.lg,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        gap: spacing.xl,
      }}
    >
      <MyCommunitiesSection onSeeAll={() => onChangeView('communities')} />
      <UpcomingEventsSection onSeeAll={() => onChangeView('events')} />
      <SuggestedAthletesSection />
      <TopAthletesSection onSeeAll={() => onChangeView('ranking')} />
    </ScrollView>
  );
}

// ── Tus comunidades ───────────────────────────────────

function MyCommunitiesSection({ onSeeAll }: { onSeeAll: () => void }) {
  const router = useRouter();
  const query = useCommunities('joined');
  const communities = query.data ?? [];
  const hasData = communities.length > 0;

  return (
    <View style={{ gap: spacing.md }}>
      <GmupSectionHeader
        title="Tus comunidades"
        subtitle="Los grupos a los que perteneces"
        action={hasData ? { label: 'Ver todo', onPress: onSeeAll, accessibilityHint: 'Abre la lista completa de comunidades' } : undefined}
      />

      {query.isLoading ? (
        <CarouselSkeleton
          width={COMMUNITY_TILE_WIDTH}
          height={148}
          accessibilityLabel="Cargando tus comunidades"
        />
      ) : query.isError && !hasData ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SocialErrorState
            compact
            title="No pudimos cargar tus comunidades"
            subtitle="Sin conexión"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        </View>
      ) : !hasData ? (
        <EmptyState
          surface
          compact
          icon="users"
          title="Todavía no estás en ninguna"
          description="Únete a una y entrena acompañado."
          action={{ label: 'Explorar comunidades', onPress: onSeeAll }}
        />
      ) : (
        <Carousel>
          <CommunityCreateTile onPress={() => router.push('/communities/new')} />
          {communities.slice(0, CAROUSEL_LIMIT).map((community, i) => (
            <CarouselItem key={community.id} index={i}>
              <CommunityTile
                community={community}
                onPress={() =>
                  router.push({ pathname: '/communities/[id]', params: { id: community.id } })
                }
              />
            </CarouselItem>
          ))}
        </Carousel>
      )}
    </View>
  );
}

// ── Próximos eventos ──────────────────────────────────

function UpcomingEventsSection({ onSeeAll }: { onSeeAll: () => void }) {
  const router = useRouter();
  const query = useEvents('all');

  const upcoming = useMemo(() => {
    const events = query.data ?? [];
    return events
      .filter((event) => !isEventFinished(event.startsAt, event.endsAt))
      .slice()
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .slice(0, CAROUSEL_LIMIT);
  }, [query.data]);

  const hasData = upcoming.length > 0;

  return (
    <View style={{ gap: spacing.md }}>
      <GmupSectionHeader
        title="Próximos eventos"
        subtitle="Retos y quedadas que aún no empiezan"
        action={{ label: 'Ver todo', onPress: onSeeAll, accessibilityHint: 'Abre la lista completa de eventos' }}
      />

      {query.isLoading ? (
        <CarouselSkeleton
          width={EVENT_SPOTLIGHT_WIDTH}
          height={186}
          accessibilityLabel="Cargando próximos eventos"
        />
      ) : query.isError && !hasData ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SocialErrorState
            compact
            title="No pudimos cargar los eventos"
            subtitle="Sin conexión"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        </View>
      ) : !hasData ? (
        <EmptyState
          surface
          compact
          icon="calendar"
          title="Nada en el calendario"
          description="Convoca el primero."
          action={{ label: 'Crear evento', onPress: () => router.push('/events/new') }}
        />
      ) : (
        <Carousel>
          {upcoming.map((event, i) => (
            <CarouselItem key={event.id} index={i}>
              <EventSpotlightCard
                event={event}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
              />
            </CarouselItem>
          ))}
        </Carousel>
      )}
    </View>
  );
}

// ── Atletas para seguir ───────────────────────────────

function SuggestedAthletesSection() {
  const router = useRouter();
  const query = useDiscover(CAROUSEL_LIMIT);
  const athletes = query.data ?? [];
  const hasData = athletes.length > 0;

  return (
    <View style={{ gap: spacing.md }}>
      <GmupSectionHeader
        title="Atletas para seguir"
        subtitle="Gente activa que todavía no sigues"
        action={
          hasData
            ? {
                label: 'Buscar',
                onPress: () => router.push('/discover'),
                accessibilityHint: 'Abre el buscador de atletas y comunidades',
              }
            : undefined
        }
      />

      {query.isLoading ? (
        <CarouselSkeleton
          width={SUGGESTED_ATHLETE_WIDTH}
          height={176}
          accessibilityLabel="Cargando atletas sugeridos"
        />
      ) : query.isError && !hasData ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SocialErrorState
            compact
            title="No pudimos cargar las sugerencias"
            subtitle="Sin conexión"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        </View>
      ) : !hasData ? (
        <EmptyState
          surface
          compact
          icon="users"
          title="Sin sugerencias por ahora"
          description="Ya los sigues a todos. Busca por nombre."
          action={{ label: 'Buscar atletas', onPress: () => router.push('/discover') }}
        />
      ) : (
        <Carousel>
          {athletes.map((athlete, i) => (
            <CarouselItem key={athlete.id} index={i}>
              <SuggestedAthleteCard
                athlete={athlete}
                onOpen={() =>
                  router.push({
                    pathname: '/profile/[username]',
                    params: { username: athlete.username },
                  })
                }
              />
            </CarouselItem>
          ))}
        </Carousel>
      )}
    </View>
  );
}

// ── Top atletas ───────────────────────────────────────

function TopAthletesSection({ onSeeAll }: { onSeeAll: () => void }) {
  const router = useRouter();
  const query = useGlobalLeaderboard(50);
  const entries = useMemo(() => query.data ?? [], [query.data]);
  const hasData = entries.length > 0;

  const myEntry = useMemo(() => {
    const index = entries.findIndex((entry) => entry.isMe);
    if (index < 3) return undefined;
    return { entry: entries[index], position: index + 1 };
  }, [entries]);

  const openProfile = useCallback(
    (username: string) =>
      router.push({ pathname: '/profile/[username]', params: { username } }),
    [router],
  );

  return (
    <View style={{ gap: spacing.md }}>
      <GmupSectionHeader
        title="Top atletas"
        action={
          hasData
            ? {
                label: 'Ver ranking completo',
                onPress: onSeeAll,
                accessibilityHint: 'Abre el ranking global completo',
              }
            : undefined
        }
      />

      {query.isLoading ? (
        <SkeletonGroup
          accessibilityLabel="Cargando top atletas"
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Skeleton width={92} height={132} borderRadius={radius.sm} />
          <Skeleton width={92} height={168} borderRadius={radius.sm} />
          <Skeleton width={92} height={116} borderRadius={radius.sm} />
        </SkeletonGroup>
      ) : query.isError && !hasData ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SocialErrorState
            compact
            title="No pudimos cargar el ranking"
            subtitle="Sin conexión"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        </View>
      ) : !hasData ? (
        <EmptyState
          surface
          compact
          icon="trophy"
          title="Sin ranking todavía"
          description="Aún sin posiciones."
        />
      ) : (
        <RankPodium entries={entries} myEntry={myEntry} onOpen={openProfile} />
      )}
    </View>
  );
}

// =====================================================
// SHARED
// =====================================================

function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        alignItems: 'stretch',
      }}
    >
      {children}
    </ScrollView>
  );
}

function CarouselItem({ index, children }: { index: number; children: React.ReactNode }) {
  void index;
  return (
    <View>{children}</View>
  );
}

function CarouselSkeleton({
  width,
  height,
  accessibilityLabel,
  count = 3,
}: {
  width: number;
  height: number;
  accessibilityLabel: string;
  count?: number;
}) {
  return (
    <SkeletonGroup
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={width} height={height} borderRadius={radius.lg} />
      ))}
    </SkeletonGroup>
  );
}

// `fontSize` se importa para mantener la escala tipográfica del wordmark
// alineada con `typography`; evita números sueltos en la cabecera.
void fontSize;
