import { useEffect, useRef, useState } from 'react';
import { View, Pressable, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { FollowButton } from '@/components/FollowButton';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing, RANKS, RankId } from '@/theme/tokens';
import { useSearchUsers, type SearchUserResult } from '@/lib/queries/search';

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput | null>(null);

  // Autofocus al montar (con leve delay para Android).
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  // Debounce 350ms: `query` solo se actualiza tras pausa de escritura.
  useEffect(() => {
    const handle = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(handle);
  }, [input]);

  const searchQuery = useSearchUsers(query);

  const results = searchQuery.data ?? [];
  const showEmptyShortQuery = query.length < 2;
  const showNoResults = !showEmptyShortQuery && !searchQuery.isLoading && results.length === 0;
  const isSearching = !showEmptyShortQuery && (searchQuery.isLoading || searchQuery.isFetching);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Header con search */}
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
          <Text variant="heading" style={{ flex: 1 }}>Descubrir</Text>
        </View>

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
            style={{
              flex: 1,
              color: colors.text.primary,
              fontSize: 15,
              paddingVertical: 12,
            }}
          />
          {input.length > 0 && (
            <Pressable onPress={() => setInput('')} hitSlop={6}>
              <Icon name="close" size={14} color={colors.text.muted} />
            </Pressable>
          )}
          {isSearching && <ActivityIndicator size="small" color={colors.primary.DEFAULT} />}
        </View>
      </View>

      <FlatList<SearchUserResult>
        data={showEmptyShortQuery ? [] : results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ResultRow
            user={item}
            onOpen={() =>
              router.push({ pathname: '/profile/[username]', params: { username: item.username } })
            }
          />
        )}
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
    </SafeAreaView>
  );
}

function ResultRow({
  user,
  onOpen,
}: {
  user: SearchUserResult;
  onOpen: () => void;
}) {
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

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: 'search' | 'users';
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
      <Text
        variant="caption"
        tone="secondary"
        style={{ marginTop: spacing.xs, textAlign: 'center' }}
      >
        {subtitle}
      </Text>
    </Card>
  );
}
