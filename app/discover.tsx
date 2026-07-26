import { useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FollowButton } from '@/components/FollowButton';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { colors, fontSize, radius, spacing, RANKS, RankId } from '@/theme/tokens';
import { useSearchUsers, type SearchUserResult } from '@/lib/queries/search';
import { useGlobalLeaderboard, type GlobalRankEntry } from '@/lib/queries/social';
import { useEvents, type EventFilter } from '@/lib/queries/events';
import { type CommunityEvent } from '@/lib/repos/events';
import { EventCard } from '@/components/EventCard';
import { CommunitiesExplorer } from '@/components/communities/CommunitiesExplorer';
import { SocialErrorState } from '@/components/social/SocialErrorState';

type HubTab = 'search' | 'events' | 'ranking' | 'communities';

const TABS: { value: HubTab; label: string; icon: IconName }[] = [
  { value: 'search',      label: 'Buscar',      icon: 'search'  },
  { value: 'events',      label: 'Eventos',     icon: 'calendar' },
  { value: 'communities', label: 'Comunidades', icon: 'users'   },
  { value: 'ranking',     label: 'Ranking',     icon: 'trophy'  },
];

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<HubTab>('search');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconButton
            name="chevron-left"
            accessibilityLabel="Volver"
            accessibilityHint="Vuelve a la pantalla anterior"
            onPress={() => router.back()}
            variant="surface"
            size="sm"
            haptic={false}
          />
          <Text variant="heading" style={{ flex: 1 }}>Comunidad</Text>
        </View>

        <SegmentedControl<HubTab>
          options={TABS}
          value={tab}
          onValueChange={setTab}
          accessibilityLabel="Secciones de comunidad"
        />
      </View>

      {tab === 'search'      && <SearchTab />}
      {tab === 'events'      && <EventsTab />}
      {tab === 'communities' && <CommunitiesExplorer />}
      {tab === 'ranking'     && <RankingTab />}
    </SafeAreaView>
  );
}

// =====================================================
// BUSCAR — secciones agrupadas (Siguiendo / Descubrir)
// =====================================================

type SearchListItem =
  | { kind: 'header'; title: string; count: number }
  | { kind: 'user'; user: SearchUserResult };

function SearchTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(handle);
  }, [input]);

  const searchQuery = useSearchUsers(query);
  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);
  const showEmptyShortQuery = query.length < 2;
  const hasResults = results.length > 0;
  const showBlockingError = !showEmptyShortQuery && searchQuery.isError && !hasResults;
  const showStaleError = !showEmptyShortQuery && searchQuery.isError && hasResults;
  const showNoResults =
    !showEmptyShortQuery &&
    !searchQuery.isLoading &&
    !searchQuery.isError &&
    !hasResults;
  const isSearching = !showEmptyShortQuery && (searchQuery.isLoading || searchQuery.isFetching);

  // Agrupar en "Siguiendo" / "Descubrir".
  const items = useMemo<SearchListItem[]>(() => {
    if (showEmptyShortQuery) return [];
    const following = results.filter((u) => u.isFollowing);
    const others = results.filter((u) => !u.isFollowing);
    const out: SearchListItem[] = [];
    if (following.length > 0) {
      out.push({ kind: 'header', title: 'Siguiendo', count: following.length });
      following.forEach((user) => out.push({ kind: 'user', user }));
    }
    if (others.length > 0) {
      out.push({ kind: 'header', title: 'Descubrir', count: others.length });
      others.forEach((user) => out.push({ kind: 'user', user }));
    }
    return out;
  }, [results, showEmptyShortQuery]);

  return (
    <>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg.elevated,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
          }}
        >
          <Icon name="search" size={spacing.lg} color={colors.text.muted} />
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Buscar por nombre o @username"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar atletas"
            accessibilityHint="Busca por nombre o nombre de usuario"
            accessibilityState={{ busy: isSearching }}
            style={{
              flex: 1,
              color: colors.text.primary,
              fontSize: fontSize.base,
              paddingVertical: spacing.md,
            }}
          />
          {input.length > 0 && (
            <IconButton
              name="close"
              accessibilityLabel="Borrar búsqueda"
              accessibilityHint="Limpia el texto de búsqueda"
              onPress={() => setInput('')}
              size="sm"
              haptic={false}
            />
          )}
          {isSearching && <ActivityIndicator size="small" color={colors.primary.DEFAULT} />}
        </View>
      </View>

      <FlatList<SearchListItem>
        data={items}
        keyExtractor={(item, i) => (item.kind === 'header' ? `h-${item.title}` : `u-${item.user.id}-${i}`)}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <SectionHeader title={item.title} count={item.count} />
          ) : (
            <ResultRow
              user={item.user}
              onOpen={() =>
                router.push({ pathname: '/profile/[username]', params: { username: item.user.username } })
              }
            />
          )
        }
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.sm,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          showStaleError ? (
            <SocialErrorState
              compact
              title="No pudimos actualizar la búsqueda"
              subtitle="Estos resultados pueden no estar al día. Puedes seguir explorándolos o intentar cargarlos de nuevo."
              onRetry={() => void searchQuery.refetch()}
              isRetrying={searchQuery.isFetching}
            />
          ) : null
        }
        ListEmptyComponent={
          showEmptyShortQuery ? (
            <EmptyState
              icon="search"
              title="Encuentra atletas"
              subtitle="Escribe al menos 2 caracteres para buscar por nombre o username."
            />
          ) : showBlockingError ? (
            <SocialErrorState
              title="No pudimos buscar atletas"
              subtitle="Revisa tu conexión e inténtalo de nuevo. Tu búsqueda seguirá aquí."
              onRetry={() => void searchQuery.refetch()}
              isRetrying={searchQuery.isFetching}
            />
          ) : showNoResults ? (
            <EmptyState
              icon="users"
              title="Ningún atleta encontrado"
              subtitle={`No hay resultados para "${query}". Prueba con otro nombre.`}
            />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.xs,
        marginBottom: spacing.xs,
      }}
    >
      <Text variant="label" tone="secondary">{title}</Text>
      <Text variant="label" tone="muted">{count}</Text>
    </View>
  );
}

function ResultRow({ user, onOpen }: { user: SearchUserResult; onOpen: () => void }) {
  const info = rankInfo(user.currentRank);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Abrir perfil de ${user.displayName}`}
      accessibilityHint={`@${user.username}, ${user.followersCount.toLocaleString()} seguidores`}
      onPress={onOpen}
      pressScale={0.98}
      haptic={false}
    >
      <Card padding="md" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={user.displayName} size={48} borderColor={info.color} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {user.displayName}
            </Text>
            <Badge label={info.label} tone="muted" />
          </View>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            @{user.username} · {user.followersCount.toLocaleString()} seguidores
          </Text>
        </View>
        <FollowButton userId={user.id} isFollowing={user.isFollowing} size="sm" />
      </Card>
    </PressableScale>
  );
}

// =====================================================
// EVENTOS
// =====================================================

const EVENT_FILTERS: { key: EventFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'challenge', label: 'Retos' },
  { key: 'meetup', label: 'Quedadas' },
  { key: 'joined', label: 'Inscrito' },
  { key: 'mine', label: 'Míos' },
];

function EventsTab() {
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
              {EVENT_FILTERS.map((f) => {
                return (
                  <Chip
                    key={f.key}
                    label={f.label}
                    selected={filter === f.key}
                    onPress={() => setFilter(f.key)}
                    accessibilityLabel={`Filtrar eventos: ${f.label}`}
                    accessibilityHint="Actualiza la lista de eventos"
                  />
                );
              })}
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
        paddingBottom: insets.bottom + spacing.lg,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        gap: spacing.sm,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: spacing.lg }}>
          {eventsQuery.isLoading ? (
            <View style={{ paddingTop: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary.DEFAULT} />
            </View>
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
              subtitle="Aún no hay eventos en esta categoría. ¡Crea el primero y reúne a la comunidad!"
            />
          )}
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

// =====================================================
// RANKING GLOBAL
// =====================================================

function RankingTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const leaderboardQuery = useGlobalLeaderboard(50);
  const entries = leaderboardQuery.data ?? [];
  const hasEntries = entries.length > 0;
  const showBlockingError = leaderboardQuery.isError && !hasEntries;
  const showStaleError = leaderboardQuery.isError && hasEntries;

  return (
    <FlatList<GlobalRankEntry>
      data={entries}
      keyExtractor={(e) => e.id}
      renderItem={({ item, index }) => (
        <RankingRow
          entry={item}
          position={index + 1}
          onOpen={() =>
            router.push({ pathname: '/profile/[username]', params: { username: item.username } })
          }
        />
      )}
      ListHeaderComponent={
        hasEntries || showStaleError ? (
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {hasEntries && (
              <Text variant="label" tone="secondary">
                TOP ATLETAS · POR PUNTOS
              </Text>
            )}
            {showStaleError && (
              <SocialErrorState
                compact
                title="No pudimos actualizar el ranking"
                subtitle="Las posiciones mostradas son las últimas que guardamos."
                onRetry={() => void leaderboardQuery.refetch()}
                isRetrying={leaderboardQuery.isFetching}
              />
            )}
          </View>
        ) : null
      }
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        gap: spacing.sm,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        leaderboardQuery.isLoading ? (
          <View style={{ paddingTop: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary.DEFAULT} />
          </View>
        ) : showBlockingError ? (
          <SocialErrorState
            title="No pudimos cargar el ranking"
            subtitle="Parece que hay un problema de conexión. Inténtalo de nuevo para ver las posiciones."
            onRetry={() => void leaderboardQuery.refetch()}
            isRetrying={leaderboardQuery.isFetching}
          />
        ) : (
          <EmptyState
            icon="trophy"
            title="Sin ranking todavía"
            subtitle="Cuando los atletas acumulen puntos aparecerán aquí en el top global."
          />
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

function RankingRow({
  entry,
  position,
  onOpen,
}: {
  entry: GlobalRankEntry;
  position: number;
  onOpen: () => void;
}) {
  const info = rankInfo(entry.currentRank);
  const posColor =
    position === 1 ? colors.metal.gold.DEFAULT
    : position === 2 ? colors.metal.silver.DEFAULT
    : position === 3 ? colors.metal.bronze.DEFAULT
    : colors.text.muted;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Posición ${position}: ${entry.displayName}`}
      accessibilityHint={`${entry.rankPoints.toLocaleString()} puntos. Abre su perfil`}
      accessibilityState={{ selected: entry.isMe }}
      onPress={onOpen}
      pressScale={0.98}
      haptic={false}
    >
      <Card
        padding="md"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: entry.isMe ? colors.primary.muted : undefined,
        }}
      >
        <Text
          weight="black"
          numeric
          style={{ width: fontSize['2xl'], textAlign: 'center', color: posColor }}
        >
          {position}
        </Text>
        <Avatar uri={entry.avatarUrl} name={entry.displayName} size={42} borderColor={info.color} />
        <View style={{ flex: 1 }}>
          <Text weight="bold" numberOfLines={1}>
            {entry.displayName}{entry.isMe ? ' (tú)' : ''}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>@{entry.username}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text weight="bold" numeric style={{ color: info.color }}>
            {entry.rankPoints.toLocaleString()}
          </Text>
          <Text variant="label" tone="muted" style={{ fontSize: fontSize.xs }}>
            {info.label}
          </Text>
        </View>
      </Card>
    </PressableScale>
  );
}

// =====================================================
// SHARED
// =====================================================

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
}) {
  return (
    <Card padding="xl" style={{ alignItems: 'center', marginTop: spacing.xl }}>
      <View
        style={{
          width: spacing['4xl'],
          height: spacing['4xl'],
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg.elevated,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.md,
        }}
      >
        <Icon name={icon} size={radius['2xl']} color={colors.text.secondary} />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>{title}</Text>
      <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
        {subtitle}
      </Text>
    </Card>
  );
}
