import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import {
  filterAndSortExerciseProgress,
  getAvailableExerciseProgressMetadata,
  getExerciseProgressItemMetadata,
  type ExerciseProgressSortMode,
} from '@/lib/exerciseProgressPicker';
import { exerciseImage } from '@/data/exerciseImages';
import type { ExercisePerformance } from '@/lib/progressInsights';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';
import type { Equipment, MuscleGroup } from '@/data/exercises';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recientes' },
  { value: 'most-trained', label: 'Más entrenados' },
  { value: 'all', label: 'Todos' },
] as const;

export interface ExerciseProgressPickerProps {
  items: readonly ExercisePerformance[];
  selectedId: string | null;
  onSelect: (item: ExercisePerformance) => void;
}

export function ExerciseProgressPicker({
  items,
  selectedId,
  onSelect,
}: ExerciseProgressPickerProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<ExerciseProgressSortMode>('recent');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const selected = items.find((item) => item.exerciseId === selectedId) ?? null;
  const selectedMetadata = selected
    ? getExerciseProgressItemMetadata(selected.exerciseId)
    : null;
  const availableMetadata = useMemo(
    () => getAvailableExerciseProgressMetadata(items),
    [items],
  );
  const displayedItems = useMemo(
    () =>
      filterAndSortExerciseProgress(items, {
        query,
        sortMode,
        muscle,
        equipment,
      }),
    [equipment, items, muscle, query, sortMode],
  );

  const resetFilters = () => {
    setQuery('');
    setSortMode('recent');
    setMuscle(null);
    setEquipment(null);
  };

  const close = () => {
    Keyboard.dismiss();
    setVisible(false);
    resetFilters();
  };

  const select = (item: ExercisePerformance) => {
    onSelect(item);
    close();
  };

  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          selected
            ? `Cambiar ejercicio. Seleccionado: ${selected.name}`
            : 'Seleccionar ejercicio de progreso'
        }
        accessibilityHint="Abre una lista buscable de ejercicios entrenados"
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible(true)}
        haptic={false}
        pressScale={0.98}
        style={styles.selectedRow}
      >
        {selected ? (
          <ExerciseThumbnail exerciseId={selected.exerciseId} size={56} />
        ) : (
          <ExerciseThumbnail size={56} />
        )}
        <View style={styles.selectedCopy}>
          <Text weight="bold" numberOfLines={1}>
            {selected?.name ?? 'Seleccionar ejercicio'}
          </Text>
          {selected && selectedMetadata ? (
            <>
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {selectedMetadata.muscleLabel} · {selectedMetadata.equipmentLabel}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {sessionLabel(selected.sessions.length)} · Última{' '}
                {formatExerciseDate(selected.latest.ms)}
              </Text>
            </>
          ) : (
            <Text variant="caption" tone="muted">
              Elige una opción para ver su progreso.
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={spacing.lg} color={colors.text.secondary} />
      </PressableScale>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View style={styles.modalRoot} accessibilityViewIsModal>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector de ejercicios"
            onPress={close}
            style={styles.backdrop}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, spacing.lg) },
              ]}
            >
              <View style={styles.header}>
                <View style={styles.headerCopy}>
                  <Text variant="heading" accessibilityRole="header">
                    Elegir ejercicio
                  </Text>
                  <Text variant="caption" tone="muted">
                    Busca en todos tus ejercicios entrenados
                  </Text>
                </View>
                <IconButton
                  name="close"
                  accessibilityLabel="Cerrar selector"
                  onPress={close}
                  variant="surface"
                  size="sm"
                  haptic={false}
                />
              </View>

              <View style={styles.searchBox}>
                <Icon name="search" size={spacing.lg} color={colors.text.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar por nombre"
                  placeholderTextColor={colors.text.muted}
                  accessibilityLabel="Buscar ejercicio por nombre"
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  clearButtonMode="while-editing"
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

              <SegmentedControl
                options={SORT_OPTIONS}
                value={sortMode}
                onValueChange={setSortMode}
                accessibilityLabel="Orden de ejercicios"
                haptic={false}
                style={styles.sortControl}
              />

              {availableMetadata.muscles.length > 0 ? (
                <FilterRow label="Músculo">
                  {availableMetadata.muscles.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={muscle === option.value}
                      onPress={() =>
                        setMuscle((current) =>
                          current === option.value ? null : option.value,
                        )
                      }
                      accessibilityHint="Filtra los ejercicios por músculo"
                      haptic={false}
                    />
                  ))}
                </FilterRow>
              ) : null}

              {availableMetadata.equipment.length > 0 ? (
                <FilterRow label="Equipo">
                  {availableMetadata.equipment.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={equipment === option.value}
                      onPress={() =>
                        setEquipment((current) =>
                          current === option.value ? null : option.value,
                        )
                      }
                      accessibilityHint="Filtra los ejercicios por equipo"
                      haptic={false}
                    />
                  ))}
                </FilterRow>
              ) : null}

              <FlatList
                data={displayedItems}
                style={styles.list}
                keyExtractor={(item) => item.exerciseId}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.listContent,
                  displayedItems.length === 0 && styles.emptyListContent,
                ]}
                renderItem={({ item }) => {
                  const metadata = getExerciseProgressItemMetadata(item.exerciseId);
                  const isSelected = item.exerciseId === selectedId;

                  return (
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name}, ${metadata.muscleLabel}, ${metadata.equipmentLabel}, ${sessionLabel(item.sessions.length)}, última ${formatExerciseDate(item.latest.ms)}`}
                      accessibilityHint="Selecciona este ejercicio"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => select(item)}
                      haptic={false}
                      pressScale={0.98}
                      style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                    >
                      <ExerciseThumbnail exerciseId={item.exerciseId} size={52} />
                      <View style={styles.itemCopy}>
                        <Text weight="bold" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text variant="caption" tone="secondary" numberOfLines={1}>
                          {metadata.muscleLabel} · {metadata.equipmentLabel}
                        </Text>
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {sessionLabel(item.sessions.length)} · Última{' '}
                          {formatExerciseDate(item.latest.ms)}
                        </Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.check}>
                          <Icon
                            name="check"
                            size={spacing.lg}
                            color={colors.primary.DEFAULT}
                          />
                        </View>
                      ) : null}
                    </PressableScale>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Icon name="search" size={spacing.xl} color={colors.text.muted} />
                    <Text weight="bold">Sin resultados</Text>
                    <Text variant="caption" tone="muted" style={styles.emptyText}>
                      Prueba otro nombre o quita alguno de los filtros.
                    </Text>
                  </View>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

function ExerciseThumbnail({ exerciseId, size }: { exerciseId?: string; size: number }) {
  const image = exerciseId ? exerciseImage(exerciseId) : undefined;

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.thumbnail, { width: size, height: size }]}
    >
      {image !== undefined ? (
        <Image
          source={image}
          style={styles.thumbnailImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={exerciseId}
          transition={120}
          accessible={false}
        />
      ) : (
        <Icon name="dumbbell" size={Math.round(size * 0.42)} color={colors.text.muted} />
      )}
    </View>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterGroup}>
      <Text variant="label" tone="muted" style={styles.filterLabel}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chipRow}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function sessionLabel(count: number): string {
  return `${count} ${count === 1 ? 'sesión' : 'sesiones'}`;
}

function formatExerciseDate(ms: number): string {
  if (!Number.isFinite(ms)) return 'sin fecha';
  return new Date(ms).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  selectedRow: {
    minHeight: spacing['4xl'] + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.card,
  },
  selectedCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  thumbnail: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: colors.bg.elevated,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.bg.overlay,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '90%',
    flexShrink: 0,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.bg.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  searchBox: {
    minHeight: spacing['3xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.elevated,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontSize: fontSize.base,
  },
  sortControl: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  filterGroup: {
    marginTop: spacing.md,
  },
  filterLabel: {
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  chipRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  itemRow: {
    minHeight: spacing['4xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.elevated,
  },
  itemRowSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.muted,
  },
  itemCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  check: {
    width: spacing['2xl'],
    height: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary.glow,
    backgroundColor: colors.bg.card,
  },
  emptyState: {
    flex: 1,
    minHeight: spacing['4xl'] * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    maxWidth: spacing['4xl'] * 4,
    textAlign: 'center',
  },
});
