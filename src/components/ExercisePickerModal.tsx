/**
 * ExercisePickerModal — selector de ejercicio a pantalla completa.
 *
 * Reemplaza los chips deslizables del ExerciseProgressModal: abre una ventana
 * con todos los ejercicios entrenados (con historial), filtrables por grupo
 * muscular, cada uno con su imagen de demostración. Al tocar uno, lo selecciona
 * y cierra.
 *
 * TODO(c4): eliminar cuando ExerciseProgressModal migre a AppBottomSheet — su
 * único consumidor. Mientras ese padre sea un Modal nativo, un sheet portaleado
 * al root quedaría DETRÁS del modal en iOS, así que este Modal se conserva.
 * Los pickers de workout/active y routine/[id] ya usan ExercisePickerSheet.
 */

import { useEffect, useMemo, useState } from 'react';
import { Modal, View, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import { exerciseById, type MuscleGroup } from '@/data/exercises';
import { exerciseImage } from '@/data/exerciseImages';
import { MUSCLE_LABELS } from '@/lib/optimizationScore';
import { listTrainedExercises } from '@/lib/exerciseProgress';
import { useWorkoutsStore } from '@/store/workouts';

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedId?: string;
  onSelect: (id: string) => void;
}

// Broad muscle groups for the filter row. Only groups that contain at least one
// trained exercise are rendered.
const GROUPS: { id: string; label: string; muscles: MuscleGroup[] }[] = [
  { id: 'chest', label: 'Pecho', muscles: ['chest'] },
  { id: 'back', label: 'Espalda', muscles: ['back'] },
  { id: 'shoulders', label: 'Hombros', muscles: ['front_delt', 'lateral_delt', 'rear_delt'] },
  { id: 'arms', label: 'Brazos', muscles: ['biceps', 'triceps'] },
  { id: 'legs', label: 'Piernas', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'core', label: 'Core', muscles: ['core'] },
  { id: 'full', label: 'Cuerpo', muscles: ['full_body'] },
];

export function ExercisePickerModal({ visible, onClose, selectedId, onSelect }: Props) {
  const history = useWorkoutsStore((s) => s.history);
  const [group, setGroup] = useState<string>('all');
  const [groupOpen, setGroupOpen] = useState(false);

  // El <Modal> mantiene el árbol montado al cerrar; resetea el filtro al ocultarse
  // para no reabrirlo con el desplegable expandido o un grupo previo.
  useEffect(() => {
    if (!visible) {
      setGroupOpen(false);
      setGroup('all');
    }
  }, [visible]);

  // Trained exercises enriched with their muscle group.
  const items = useMemo(
    () =>
      listTrainedExercises(history).map((ex) => ({
        ...ex,
        muscle: exerciseById(ex.exerciseId)?.muscle ?? ('core' as MuscleGroup),
      })),
    [history],
  );

  // Only show filter chips for groups that actually have trained exercises.
  const availableGroups = useMemo(
    () => GROUPS.filter((g) => items.some((it) => g.muscles.includes(it.muscle))),
    [items],
  );

  // Opciones del desplegable: "Todos" + grupos con ejercicios entrenados.
  const dropdownOptions = useMemo(
    () => [{ id: 'all', label: 'Todos los grupos' }, ...availableGroups],
    [availableGroups],
  );

  const filtered = useMemo(() => {
    if (group === 'all') return items;
    const g = GROUPS.find((x) => x.id === group);
    if (!g) return items;
    return items.filter((it) => g.muscles.includes(it.muscle));
  }, [items, group]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            gap: spacing.md,
          }}
        >
          <Text variant="heading" style={{ flex: 1 }}>
            Elegir ejercicio
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.bg.elevated,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Icon name="close" size={16} color={colors.text.primary} />
            </View>
          </Pressable>
        </View>

        {/* Muscle group filter — menú desplegable (compacto, no se desborda) */}
        {availableGroups.length > 0 && (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              zIndex: 10,
            }}
          >
            <Pressable
              onPress={() => setGroupOpen((o) => !o)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: 10,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: groupOpen ? colors.primary.DEFAULT : colors.border,
                backgroundColor: pressed ? colors.bg.elevated : colors.bg.card,
              })}
            >
              <Icon name="dumbbell" size={15} color={colors.text.secondary} />
              <Text variant="caption" weight="bold" style={{ flex: 1, color: colors.text.primary }}>
                {group === 'all'
                  ? 'Todos los grupos'
                  : GROUPS.find((g) => g.id === group)?.label ?? 'Todos los grupos'}
              </Text>
              <View style={{ transform: [{ rotate: groupOpen ? '-90deg' : '90deg' }] }}>
                <Icon name="chevron-right" size={16} color={colors.text.muted} />
              </View>
            </Pressable>

            {groupOpen && (
              <View
                style={{
                  marginTop: spacing.xs,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.bg.card,
                  overflow: 'hidden',
                }}
              >
                {dropdownOptions.map((g, i, arr) => {
                  const active = group === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => {
                        setGroup(g.id);
                        setGroupOpen(false);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 11,
                        borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                        backgroundColor: pressed
                          ? colors.bg.elevated
                          : active
                          ? colors.primary.muted
                          : 'transparent',
                      })}
                    >
                      <Text
                        variant="caption"
                        weight={active ? 'bold' : 'semibold'}
                        style={{ flex: 1, color: active ? colors.primary.DEFAULT : colors.text.secondary }}
                      >
                        {g.label}
                      </Text>
                      {active && <Icon name="check" size={15} color={colors.primary.DEFAULT} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Exercise list */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing['3xl'],
            gap: spacing.sm,
          }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing['2xl'] }}>
              <Icon name="dumbbell" size={28} color={colors.text.muted} />
              <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                Aún no has entrenado ejercicios de este grupo.
              </Text>
            </View>
          ) : (
            filtered.map((it) => {
              const active = it.exerciseId === selectedId;
              const img = exerciseImage(it.exerciseId);
              return (
                <Pressable
                  key={it.exerciseId}
                  onPress={() => {
                    onSelect(it.exerciseId);
                    onClose();
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.sm,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: active ? colors.primary.DEFAULT : colors.border,
                    backgroundColor: active
                      ? colors.primary.muted
                      : pressed
                      ? colors.bg.elevated
                      : colors.bg.card,
                  })}
                >
                  {/* Demonstration image */}
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                      backgroundColor: colors.bg.elevated,
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
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="dumbbell" size={22} color={colors.text.muted} />
                      </View>
                    )}
                  </View>

                  {/* Name + muscle + sessions */}
                  <View style={{ flex: 1 }}>
                    <Text weight="bold" numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {MUSCLE_LABELS[it.muscle] ?? it.muscle} · {it.sessions}{' '}
                      {it.sessions === 1 ? 'sesión' : 'sesiones'}
                    </Text>
                  </View>

                  {active && <Icon name="check" size={18} color={colors.primary.DEFAULT} />}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
