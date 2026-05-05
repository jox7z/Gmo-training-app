import { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, radius } from '@/theme/tokens';
import { useRoutinesStore, Routine, RoutineDay, nid } from '@/store/routines';
import { EXERCISES, exerciseById, MuscleGroup } from '@/data/exercises';

const EMPTY_ROUTINE = (): Routine => ({
  id: nid(),
  name: 'Nueva rutina',
  splitType: 'custom',
  days: [{ id: nid(), name: 'Día 1', exercises: [] }],
  createdAt: new Date().toISOString(),
});

export default function RoutineEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const existing = useRoutinesStore((s) => s.routines.find((r) => r.id === id));
  const upsert = useRoutinesStore((s) => s.upsertRoutine);

  const [routine, setRoutine] = useState<Routine>(existing ?? EMPTY_ROUTINE());
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMuscle, setPickerMuscle] = useState<MuscleGroup | 'all'>('all');

  const day = routine.days[activeDayIdx];

  const addDay = () => {
    const newDay: RoutineDay = { id: nid(), name: `Día ${routine.days.length + 1}`, exercises: [] };
    setRoutine({ ...routine, days: [...routine.days, newDay] });
    setActiveDayIdx(routine.days.length);
  };

  const removeDay = (idx: number) => {
    if (routine.days.length === 1) return;
    const days = routine.days.filter((_, i) => i !== idx);
    setRoutine({ ...routine, days });
    setActiveDayIdx(Math.max(0, idx - 1));
  };

  const updateDayName = (name: string) => {
    const days = routine.days.map((d, i) => (i === activeDayIdx ? { ...d, name } : d));
    setRoutine({ ...routine, days });
  };

  const addExercise = (exerciseId: string) => {
    const days = routine.days.map((d, i) =>
      i === activeDayIdx
        ? {
            ...d,
            exercises: [
              ...d.exercises,
              {
                id: nid(),
                exerciseId,
                targetSets: 3,
                targetRepsMin: 8,
                targetRepsMax: 12,
                restSeconds: 90,
              },
            ],
          }
        : d,
    );
    setRoutine({ ...routine, days });
    setPickerOpen(false);
  };

  const removeExercise = (exId: string) => {
    const days = routine.days.map((d, i) =>
      i === activeDayIdx ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d,
    );
    setRoutine({ ...routine, days });
  };

  const handleSave = () => {
    upsert(routine);
    router.back();
  };

  return (
    <Screen padded={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="heading" tone="muted">✕</Text>
        </Pressable>
        <Text variant="heading">Editar rutina</Text>
        <Button title="Guardar" size="sm" onPress={handleSave} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Input
          label="Nombre de la rutina"
          value={routine.name}
          onChangeText={(name) => setRoutine({ ...routine, name })}
        />
        {routine.aiReasoning && (
          <Card variant="outlined" padding="md" style={{ marginTop: spacing.md, borderColor: colors.info.DEFAULT }}>
            <Text variant="label" tone="info">¿Por qué esta rutina?</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
              {routine.aiReasoning}
            </Text>
          </Card>
        )}

        {/* Tabs de días */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {routine.days.map((d, i) => {
              const active = i === activeDayIdx;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setActiveDayIdx(i)}
                  onLongPress={() => removeDay(i)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: radius.full,
                    backgroundColor: active ? colors.primary.DEFAULT : colors.bg.elevated,
                    borderWidth: 1,
                    borderColor: active ? colors.primary.DEFAULT : colors.border,
                  }}
                >
                  <Text weight="bold" tone={active ? 'primary' : 'secondary'}>
                    {d.name}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={addDay}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: radius.full,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.border,
              }}
            >
              <Text tone="brand" weight="bold">+ Día</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={{ marginTop: spacing.lg }}>
          <Input label="Nombre del día" value={day.name} onChangeText={updateDayName} />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {day.exercises.length === 0 && (
            <Card padding="xl" style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32 }}>🏋️</Text>
              <Text variant="heading" style={{ marginTop: spacing.sm }}>Día vacío</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                Agrega ejercicios para empezar.
              </Text>
            </Card>
          )}
          {day.exercises.map((e) => {
            const ex = exerciseById(e.exerciseId);
            return (
              <Card key={e.id} padding="md" style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold">{ex?.name ?? e.exerciseId}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 4 }}>
                      <Badge label={`${e.targetSets} sets`} tone="brand" />
                      <Badge label={`${e.targetRepsMin}-${e.targetRepsMax} reps`} tone="info" />
                      <Badge label={`${e.restSeconds}s rest`} tone="muted" />
                    </View>
                  </View>
                  <Pressable onPress={() => removeExercise(e.id)} hitSlop={12}>
                    <Text tone="danger" variant="heading">✕</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>

        <Button
          title="+ Agregar ejercicio"
          variant="secondary"
          onPress={() => setPickerOpen(true)}
          style={{ marginTop: spacing.md }}
          fullWidth
        />
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        muscle={pickerMuscle}
        onMuscleChange={setPickerMuscle}
        onSelect={addExercise}
      />
    </Screen>
  );
}

function ExercisePicker({
  visible,
  onClose,
  muscle,
  onMuscleChange,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  muscle: MuscleGroup | 'all';
  onMuscleChange: (m: MuscleGroup | 'all') => void;
  onSelect: (id: string) => void;
}) {
  const muscles: (MuscleGroup | 'all')[] = ['all', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'];
  const filtered = useMemo(
    () => (muscle === 'all' ? EXERCISES : EXERCISES.filter((e) => e.muscle === muscle)),
    [muscle],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: colors.bg.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.bg.base,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: '85%',
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="title">Ejercicios</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text variant="heading" tone="muted">✕</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {muscles.map((m) => {
                const active = m === muscle;
                return (
                  <Pressable
                    key={m}
                    onPress={() => onMuscleChange(m)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: radius.full,
                      backgroundColor: active ? colors.primary.DEFAULT : colors.bg.elevated,
                    }}
                  >
                    <Text variant="caption" weight="bold" tone={active ? 'primary' : 'secondary'}>
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <FlatList
            data={filtered}
            keyExtractor={(e) => e.id}
            style={{ marginTop: spacing.md }}
            renderItem={({ item }) => (
              <Pressable onPress={() => onSelect(item.id)}>
                <Card padding="md" style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text weight="semibold">{item.name}</Text>
                      <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        {item.muscle} · {item.equipment}
                      </Text>
                    </View>
                    {item.isCompound && <Badge label="Compound" tone="accent" />}
                  </View>
                </Card>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}
