import { useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { colors, fontSize, radius, spacing, RANKS } from '@/theme/tokens';
import { useSearchUsers, type SearchUserResult } from '@/lib/queries/search';
import { SocialErrorState } from '@/components/social/SocialErrorState';

/**
 * Buscar atletas.
 *
 * Antes era un hub con Buscar/Eventos/Comunidades/Ranking. Esas tres vistas
 * viven ahora en la pestaña GMUP; aquí solo queda la búsqueda, que es lo que
 * esperan todos los enlaces entrantes (`/discover`).
 */
export default function DiscoverScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />
      <ScreenHeader
        title="Buscar atletas"
        subtitle="Encuentra gente por nombre o username"
        border
      />
      <SearchTab />
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
              subtitle="Resultados sin actualizar."
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
              description="Escribe al menos 2 caracteres."
            />
          ) : showBlockingError ? (
            <SocialErrorState
              title="No pudimos buscar atletas"
              subtitle="Revisa tu conexión."
              onRetry={() => void searchQuery.refetch()}
              isRetrying={searchQuery.isFetching}
            />
          ) : showNoResults ? (
            <EmptyState
              icon="users"
              title="Ningún atleta encontrado"
              description={`No hay resultados para "${query}". Prueba con otro nombre.`}
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
  const info = RANKS.find((r) => r.id === user.currentRank) ?? RANKS[0];
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

