/**
 * ExercisePickerSheet — selector unificado de ejercicios sobre AppBottomSheet.
 *
 * Reemplaza los antiguos modales inline de app/workout/active.tsx (cambiar
 * ejercicio en la sesión) y app/routine/[id].tsx (agregar ejercicio a la rutina).
 * Un único selector con búsqueda por nombre, chips horizontales de grupo
 * muscular y lista virtualizada (BottomSheetFlatList).
 *
 * IMPORTANTE: en pantallas presentadas como modal nativo (fullScreenModal /
 * presentation:'modal') hay que envolver el contenido de esa pantalla con un
 * BottomSheetModalProvider LOCAL, o en iOS la hoja se renderiza DETRÁS del modal.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, type ListRenderItemInfo } from 'react-native';
import { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { Icon } from '@/components/Icon';
import { colors, spacing, radius, fontSize } from '@/theme/tokens';
import {
  EXERCISES,
  MUSCLE_FILTER_GROUPS,
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  type Exercise,
  type MuscleGroup,
} from '@/data/exercises';
import { exerciseImage } from '@/data/exerciseImages';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  /** IDs a ocultar de la lista (ejercicio actual, ya usados, etc.). */
  excludeIds?: string[];
  /**
   * Si se pasa, restringe la lista a estos IDs (p. ej. solo entrenados) y la
   * ordena según el orden del array (el caller decide la prioridad).
   */
  onlyIds?: string[];
  /** Ejercicio actualmente seleccionado: se resalta con borde y check. */
  selectedId?: string;
  /** Subtítulo por ID (p. ej. "5 sesiones"); si falta, muestra músculo · equipo. */
  metaById?: Record<string, string>;
  /** Cabecera de la hoja. */
  title?: string;
  /** Línea secundaria bajo el título (p. ej. el aviso del cambio de sesión). */
  subtitle?: string;
  /** ID de grupo de MUSCLE_FILTER_GROUPS con el que arranca el filtro. */
  initialMuscle?: string;
  /**
   * Músculo a destacar: sus ejercicios se ordenan primero y llevan la etiqueta
   * "Equivalente". Se usa al cambiar de ejercicio por otro del mismo músculo.
   */
  highlightMuscle?: MuscleGroup;
}

// Normaliza para buscar sin distinguir mayúsculas ni acentos.
// Rango U+0300–U+036F = marcas diacríticas combinantes (se eliminan tras NFD).
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(DIACRITICS, '');

export function ExercisePickerSheet({
  visible,
  onClose,
  onSelect,
  excludeIds,
  onlyIds,
  selectedId,
  metaById,
  title = 'Ejercicios',
  subtitle,
  initialMuscle = 'all',
  highlightMuscle,
}: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(initialMuscle);

  // Al abrir arranca en el grupo pedido; al cerrar limpia la búsqueda.
  useEffect(() => {
    if (visible) setGroup(initialMuscle);
    else setQuery('');
  }, [visible, initialMuscle]);

  const exclude = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);
  const only = useMemo(() => (onlyIds ? new Set(onlyIds) : null), [onlyIds]);

  const filtered = useMemo(() => {
    const g = MUSCLE_FILTER_GROUPS.find((x) => x.id === group);
    let list = EXERCISES.filter((e) => !exclude.has(e.id) && (only === null || only.has(e.id)));
    if (onlyIds) {
      // Respeta el orden del caller (p. ej. entrenados por recencia+frecuencia).
      const orderIdx = new Map(onlyIds.map((id, i) => [id, i]));
      list = [...list].sort((a, b) => (orderIdx.get(a.id) ?? 0) - (orderIdx.get(b.id) ?? 0));
    }
    if (g && g.muscles.length > 0) {
      list = list.filter((e) => g.muscles.includes(e.muscle));
    }
    const q = normalize(query.trim());
    if (q) list = list.filter((e) => normalize(e.name).includes(q));
    if (highlightMuscle) {
      // Mismo músculo exacto primero: son los reemplazos más naturales.
      list = [...list].sort(
        (a, b) => Number(b.muscle === highlightMuscle) - Number(a.muscle === highlightMuscle),
      );
    }
    return list;
  }, [group, query, exclude, only, onlyIds, highlightMuscle]);

  const renderItem = ({ item }: ListRenderItemInfo<Exercise>) => {
    const img = exerciseImage(item.id);
    const equivalent = highlightMuscle !== undefined && item.muscle === highlightMuscle;
    const selected = selectedId === item.id;
    return (
      <PressableScale onPress={() => onSelect(item)} pressScale={0.97}>
        <Card
          padding="md"
          style={[
            { marginBottom: spacing.sm },
            selected && { borderWidth: 1, borderColor: colors.primary.DEFAULT },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            {/* Imagen / fallback */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.md,
                overflow: 'hidden',
                backgroundColor: colors.bg.elevated,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {img !== undefined ? (
                <Image
                  source={img}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={120}
                />
              ) : (
                <Icon name="dumbbell" size={20} color={colors.text.muted} />
              )}
            </View>
            {/* Nombre + músculo · equipo */}
            <View style={{ flex: 1 }}>
              <Text weight="semibold" numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {metaById?.[item.id] ??
                  `${MUSCLE_GROUP_LABELS[item.muscle]} · ${EQUIPMENT_LABELS[item.equipment]}`}
              </Text>
            </View>
            {selected && <Icon name="check" size={16} color={colors.primary.DEFAULT} />}
            {equivalent && (
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 3,
                  borderRadius: radius.full,
                  backgroundColor: colors.primary.muted,
                  borderWidth: 1,
                  borderColor: colors.primary.DEFAULT,
                }}
              >
                <Text variant="caption" weight="bold" style={{ color: colors.primary.DEFAULT }}>
                  Equivalente
                </Text>
              </View>
            )}
          </View>
        </Card>
      </PressableScale>
    );
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['70%', '95%']}
      keyboardBehavior="extend"
      title={title}
    >
      <View style={{ flex: 1 }}>
        {subtitle ? (
          <Text
            variant="caption"
            tone="muted"
            style={{ textAlign: 'center', paddingHorizontal: spacing.lg, marginTop: 2 }}
          >
            {subtitle}
          </Text>
        ) : null}

        {/* Búsqueda por nombre */}
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
            <BottomSheetTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar ejercicio"
              placeholderTextColor={colors.text.muted}
              returnKeyType="search"
              autoCorrect={false}
              style={{
                flex: 1,
                color: colors.text.primary,
                fontSize: fontSize.base,
                paddingVertical: 12,
              }}
            />
            {query.length > 0 ? (
              <PressableScale onPress={() => setQuery('')} hitSlop={8} haptic={false}>
                <Icon name="close" size={15} color={colors.text.muted} />
              </PressableScale>
            ) : null}
          </View>
        </View>

        {/* Chips de grupo muscular */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing.md, flexGrow: 0 }}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
        >
          {MUSCLE_FILTER_GROUPS.map((g) => {
            const active = g.id === group;
            return (
              <PressableScale
                key={g.id}
                onPress={() => setGroup(g.id)}
                pressScale={0.95}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.primary.DEFAULT : colors.bg.elevated,
                  borderWidth: 1,
                  borderColor: active ? colors.primary.DEFAULT : colors.border,
                }}
              >
                <Text variant="caption" weight="bold" tone={active ? 'primary' : 'secondary'}>
                  {g.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* Lista virtualizada */}
        <BottomSheetFlatList
          data={filtered}
          keyExtractor={(item: Exercise) => item.id}
          renderItem={renderItem}
          style={{ marginTop: spacing.md, flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: spacing['2xl'] }}>
              <Icon name="dumbbell" size={28} color={colors.text.muted} />
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: spacing.sm, textAlign: 'center' }}
              >
                No hay ejercicios que coincidan.
              </Text>
            </View>
          }
        />
      </View>
    </AppBottomSheet>
  );
}
