import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  SectionList,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type HostInstance,
} from 'react-native';

import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import {
  filterMuscleMilestones,
  type MilestoneMuscle,
  type MuscleMilestoneResult,
} from '@/lib/muscleMilestones';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';

interface Props {
  visible: boolean;
  results: readonly MuscleMilestoneResult[];
  selectedMuscle: MilestoneMuscle | null;
  onSelect: (muscle: MilestoneMuscle | null) => void;
  onClose: () => void;
  returnFocusTarget?: HostInstance | null;
}

export function MuscleMilestoneSelector({
  visible,
  results,
  selectedMuscle,
  onSelect,
  onClose,
  returnFocusTarget,
}: Props) {
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const searchInputRef = useRef<TextInput | null>(null);
  const filtered = useMemo(
    () => filterMuscleMilestones(results, { query }),
    [query, results],
  );
  const sections = useMemo(
    () =>
      [
        {
          title: 'Con hitos',
          data: filtered.filter((result) => result.level > 0),
        },
        {
          title: 'Sin hitos',
          data: filtered.filter((result) => result.level === 0),
        },
      ].filter((section) => section.data.length > 0),
    [filtered],
  );
  const baseListHeight = Math.max(
    176,
    Math.min(328, Math.round(height * 0.36)),
  );
  const listHeight =
    keyboardHeight > 0
      ? Math.max(
          120,
          Math.min(baseListHeight, height - keyboardHeight - 264),
        )
      : baseListHeight;

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  const close = () => {
    Keyboard.dismiss();
    setQuery('');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Elegir músculo"
      subtitle="Busca en el mapa completo y filtra por registro"
      maxHeightRatio={0.9}
      keyboardOffset={keyboardHeight}
      closeAccessibilityLabel="Cerrar selector de hitos"
      initialFocusRef={searchInputRef}
      returnFocusTarget={returnFocusTarget}
    >
      <View style={styles.searchBox}>
        <Icon name="search" size={spacing.lg} color={colors.text.muted} />
        <TextInput
          ref={searchInputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar músculo o levantamiento"
          placeholderTextColor={colors.text.muted}
          accessibilityLabel="Buscar músculo o levantamiento"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length > 0 && Platform.OS !== 'ios' ? (
          <IconButton
            name="close"
            accessibilityLabel="Limpiar búsqueda"
            onPress={() => setQuery('')}
            size="sm"
            haptic={false}
          />
        ) : null}
      </View>

      <Text variant="caption" tone="muted" numeric>
        {filtered.length} de {results.length} grupos musculares
      </Text>

      <View style={{ height: listHeight }}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.muscle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            sections.length === 0 && styles.emptyContent,
          ]}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            query.length === 0 ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Todos los músculos"
                accessibilityState={{ selected: selectedMuscle === null }}
                onPress={() => {
                  onSelect(null);
                  close();
                }}
                haptic={false}
                pressScale={0.98}
                style={[
                  styles.resultRow,
                  selectedMuscle === null && styles.resultRowSelected,
                ]}
              >
                <View style={styles.resultIcon}>
                  <Icon
                    name="target"
                    size={spacing.lg}
                    color={colors.primary.DEFAULT}
                  />
                </View>
                <View style={styles.resultCopy}>
                  <Text weight="bold">Todos</Text>
                  <Text variant="caption" tone="muted">
                    Vista completa del mapa
                  </Text>
                </View>
                <Icon
                  name="chevron-right"
                  size={spacing.lg}
                  color={colors.text.secondary}
                />
              </PressableScale>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <Text variant="label" tone="muted" style={styles.sectionHeader}>
              {section.title.toUpperCase()}
            </Text>
          )}
          renderItem={({ item }) => {
            const selected = item.muscle === selectedMuscle;
            return (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${item.muscleLabel}, ${item.levelLabel}`}
                accessibilityHint="Selecciona este grupo para ver qué levantamientos aportan"
                accessibilityState={{ selected }}
                onPress={() => {
                  onSelect(item.muscle);
                  close();
                }}
                haptic={false}
                pressScale={0.98}
                style={[
                  styles.resultRow,
                  selected && styles.resultRowSelected,
                ]}
              >
                <View style={styles.resultIcon}>
                  <Icon
                    name="muscle"
                    size={spacing.lg}
                    color={
                      item.level > 0
                        ? colors.primary.DEFAULT
                        : colors.text.muted
                    }
                  />
                </View>
                <View style={styles.resultCopy}>
                  <Text weight="bold" numberOfLines={2}>
                    {item.muscleLabel}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {contributionLabel(item)}
                  </Text>
                </View>
                <Badge
                  label={item.levelLabel}
                  tone={badgeTone(item.level)}
                  icon={item.level > 0 ? 'check' : 'dot'}
                  highContrast
                />
              </PressableScale>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="Sin resultados"
              description="Prueba otro nombre o cambia el filtro."
              icon="search"
              compact
            />
          }
        />
      </View>
    </Sheet>
  );
}

function contributionLabel(result: MuscleMilestoneResult): string {
  if (result.contributions.length === 0) {
    return 'Sin levantamientos base asociados';
  }
  const names = result.contributions.map((item) => item.exerciseName);
  return [...new Set(names)].join(' · ');
}

function badgeTone(
  level: MuscleMilestoneResult['level'],
): 'muted' | 'info' | 'success' | 'warning' | 'accent' | 'brand' {
  if (level === 0) return 'muted';
  if (level <= 2) return 'info';
  if (level <= 4) return 'success';
  if (level === 5) return 'warning';
  if (level === 6) return 'accent';
  return 'brand';
}

const styles = StyleSheet.create({
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: spacing['3xl'],
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text.primary,
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    backgroundColor: colors.bg.card,
    paddingBottom: spacing.xs,
    paddingTop: spacing.sm,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  resultRow: {
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: spacing['4xl'],
    padding: spacing.sm,
  },
  resultRowSelected: {
    backgroundColor: colors.primary.muted,
    borderColor: colors.primary.DEFAULT,
  },
  resultIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceVeil,
    borderRadius: radius.sm,
    height: spacing['2xl'],
    justifyContent: 'center',
    width: spacing['2xl'],
  },
  resultCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
});
