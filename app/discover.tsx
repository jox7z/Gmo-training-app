import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, FlatList, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FollowButton } from '@/components/FollowButton';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, spacing, RANKS, RankId, podiumColor } from '@/theme/tokens';
import { useSearchUsers, type SearchUserResult } from '@/lib/queries/search';
import { useGlobalLeaderboard, type GlobalRankEntry } from '@/lib/queries/social';
import { useEvents, type EventFilter } from '@/lib/queries/events';
import { type CommunityEvent } from '@/lib/repos/events';
import { EventCard } from '@/components/EventCard';
import { CommunitiesExplorer } from '@/components/communities/CommunitiesExplorer';
import { SkeletonRow } from '@/components/ui/Skeleton';

type HubTab = 'search' | 'events' | 'ranking' | 'communities';

const TABS: { key: HubTab; label: string; icon: IconName }[] = [
  { key: 'search',      label: 'Buscar',      icon: 'search'  },
  { key: 'events',      label: 'Eventos',     icon: 'calendar' },
  { key: 'communities', label: 'Comunidades', icon: 'users'   },
  { key: 'ranking',     label: 'Ranking',     icon: 'trophy'  },
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
          <Pressable onPress={() => router.back()} hitSlop={8}>
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
              <Icon name="chevron-left" size={18} color={colors.text.primary} />
            </View>
          </Pressable>
          <Text variant="heading" style={{ flex: 1 }}>Comunidad</Text>
        </View>

        {/* Segmented control */}
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
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  gap: 6,
                  paddingVertical: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: active ? colors.primary.DEFAULT : 'transparent',
                }}
              >
                <Icon name={t.icon} size={15} color={active ? '#fff' : colors.text.muted} />
                <Text weight="bold" style={{ fontSize: 13, color: active ? '#fff' : colors.text.secondary }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
  const results = searchQuery.data ?? [];
  const showEmptyShortQuery = query.length < 2;
  const showNoResults = !showEmptyShortQuery && !searchQuery.isLoading && results.length === 0;
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
          <Icon name="search" size={16} color={colors.text.muted} />
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Buscar por nombre o @username"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, color: colors.text.primary, fontSize: 15, paddingVertical: 12 }}
          />
          {input.length > 0 && (
            <Pressable onPress={() => setInput('')} hitSlop={6}>
              <Icon name="close" size={14} color={colors.text.muted} />
            </Pressable>
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
        ListEmptyComponent={
          showEmptyShortQuery ? (
            <EmptyState
              icon="search"
              title="Encuentra atletas"
              subtitle="Escribe al menos 2 caracteres para buscar por nombre o username."
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
        marginBottom: 2,
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
    <Pressable onPress={onOpen} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
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
    </Pressable>
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

  return (
    <FlatList<CommunityEvent>
      data={events}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => (
        <EventCard event={item} onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })} />
      )}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          <Button
            title="Crear evento"
            leftIcon={<Icon name="plus" size={18} color={colors.text.primary} />}
            onPress={() => router.push('/events/new')}
            fullWidth
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {EVENT_FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: 8,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: active ? colors.primary.DEFAULT : colors.border,
                      backgroundColor: active ? colors.primary.muted : colors.bg.elevated,
                    }}
                  >
                    <Text
                      variant="caption"
                      weight="bold"
                      style={{ color: active ? colors.primary.DEFAULT : colors.text.secondary }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      }
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        gap: spacing.sm,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        eventsQuery.isLoading ? (
          <View>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="calendar"
            title="Sin eventos por aquí"
            subtitle="Aún no hay eventos en esta categoría. ¡Crea el primero y reúne a la comunidad!"
          />
        )
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
        entries.length > 0 ? (
          <Text variant="label" tone="secondary" style={{ marginBottom: spacing.sm }}>
            TOP ATLETAS · POR PUNTOS
          </Text>
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
          <View>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </View>
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
  const posColor = podiumColor(position);

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <Card
        padding="md"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: entry.isMe ? colors.primary.muted : undefined,
        }}
      >
        <Text weight="black" numeric style={{ width: 30, textAlign: 'center', color: posColor }}>
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
          <Text variant="label" tone="muted" style={{ fontSize: 9 }}>{info.label}</Text>
        </View>
      </Card>
    </Pressable>
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
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg.elevated,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.md,
        }}
      >
        <Icon name={icon} size={28} color={colors.text.secondary} />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>{title}</Text>
      <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
        {subtitle}
      </Text>
    </Card>
  );
}
