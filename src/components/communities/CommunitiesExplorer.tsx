import { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/theme/tokens';
import { useCommunities } from '@/lib/queries/communities';
import { CommunityCard } from './CommunityCard';
import type { CommunityFilter, Community } from '@/lib/repos/communities';

const FILTERS: { key: CommunityFilter; label: string }[] = [
  { key: 'all',    label: 'Todas'  },
  { key: 'joined', label: 'Unidas' },
  { key: 'mine',   label: 'Mías'   },
];

export function CommunitiesExplorer() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [filter,  setFilter]  = useState<CommunityFilter>('all');
  const [input,   setInput]   = useState('');
  const [search,  setSearch]  = useState('');

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const query = useCommunities(filter, search || undefined);
  const data  = query.data ?? [];

  return (
    <FlatList<Community>
      data={data}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <CommunityCard
          community={item}
          onPress={() =>
            router.push({ pathname: '/communities/[id]', params: { id: item.id } })
          }
        />
      )}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          {/* Buscador */}
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
              value={input}
              onChangeText={setInput}
              placeholder="Buscar comunidades…"
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
          </View>

          {/* Chips de filtro */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {FILTERS.map((f) => {
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

          {/* Botón crear */}
          <Button
            title="Crear comunidad"
            leftIcon={<Icon name="plus" size={18} color="#fff" />}
            onPress={() => router.push('/communities/new')}
            fullWidth
          />
        </View>
      }
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        gap: spacing.md,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        query.isLoading ? (
          <View>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </View>
        ) : (
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
              <Icon name="users" size={28} color={colors.text.secondary} />
            </View>
            <Text variant="heading" style={{ textAlign: 'center' }}>
              {filter === 'mine'
                ? 'Aún no creaste ninguna'
                : filter === 'joined'
                ? 'Todavía no te uniste a ninguna'
                : search
                ? `Sin resultados para "${search}"`
                : 'No hay comunidades todavía'}
            </Text>
            <Text
              variant="caption"
              tone="secondary"
              style={{ marginTop: spacing.xs, textAlign: 'center' }}
            >
              {filter === 'all' && !search
                ? '¡Crea la primera y reúne a tu tribu fitness!'
                : 'Prueba con otro filtro o busca algo distinto'}
            </Text>
          </Card>
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
