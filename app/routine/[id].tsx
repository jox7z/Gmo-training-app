import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { colors, spacing } from '@/theme/tokens';
import { useRoutinesStore, Routine, RoutineDay, RoutineDayExercise, nid } from '@/store/routines';
import { useAppStore, LOCAL_USER_ID } from '@/store/app';
import { saveRoutine } from '@/lib/repos/routines';
import { isSupabaseConfigured } from '@/lib/supabase';
import { exerciseById } from '@/data/exercises';
import { ExercisePickerSheet } from '@/components/ExercisePickerSheet';
import { Icon } from '@/components/Icon';

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
  const profile = useAppStore((s) => s.profile);

  const [routine, setRoutine] = useState<Routine>(existing ?? EMPTY_ROUTINE());
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const updateExercise = (exId: string, patch: Partial<RoutineDayExercise>) => {
    const days = routine.days.map((d, i) =>
      i === activeDayIdx
        ? {
            ...d,
            exercises: d.exercises.map((e) =>
              e.id === exId ? { ...e, ...patch } : e,
            ),
          }
        : d,
    );
    setRoutine({ ...routine, days });
  };

  const handleSave = () => {
    upsert(routine);
    if (isSupabaseConfigured && profile?.id && profile.id !== LOCAL_USER_ID) {
      saveRoutine(profile.id, routine).catch(() => {});
    }
    router.back();
  };

  // Provider LOCAL: esta ruta se presenta como modal nativo (presentation:'modal');
  // el portal al provider del root quedaría DETRÁS del modal en iOS.
  return (
    <BottomSheetModalProvider>
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
        {/* Botón cerrar — icono pequeño, escala 0.9 */}
        <PressableScale onPress={() => router.back()} hitSlop={12} pressScale={0.9}>
          <Text variant="heading" tone="muted">✕</Text>
        </PressableScale>
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
            {/* Tab de día — long-press para eliminar */}
            {routine.days.map((d, i) => (
              <Chip
                key={d.id}
                label={d.name}
                selected={i === activeDayIdx}
                onPress={() => setActiveDayIdx(i)}
                onLongPress={() => removeDay(i)}
              />
            ))}
            {/* Botón añadir día */}
            <Chip label="+ Día" variant="dashed" onPress={addDay} />
          </View>
        </ScrollView>

        <View style={{ marginTop: spacing.lg }}>
          <Input label="Nombre del día" value={day.name} onChangeText={updateDayName} />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {day.exercises.length === 0 && (
            <Card variant="raised" padding="xl" style={{ alignItems: 'center' }}>
              <Icon name="dumbbell" size={40} color={colors.text.muted} />
              <Text variant="heading" style={{ marginTop: spacing.sm }}>Día vacío</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                Agrega ejercicios para empezar.
              </Text>
            </Card>
          )}
          {day.exercises.map((e) => {
            const ex = exerciseById(e.exerciseId);
            return (
              // Animated.View para animar inserción/eliminación de ejercicios
              <Animated.View
                key={e.id}
                entering={FadeInDown.springify().damping(18)}
                layout={LinearTransition.springify().damping(18)}
              >
                <Card padding="md" style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    {/* Columna central: nombre + steppers */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text
                        weight="semibold"
                        numberOfLines={2}
                        style={{ textAlign: 'center', marginBottom: spacing.sm }}
                      >
                        {ex?.name ?? e.exerciseId}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
                        <StepperField
                          label="Sets"
                          value={e.targetSets}
                          min={1}
                          max={20}
                          step={1}
                          onChange={(v) => updateExercise(e.id, { targetSets: v })}
                        />
                      </View>
                    </View>
                    {/* Botón quitar — círculo danger */}
                    <IconButton
                      icon="close"
                      onPress={() => removeExercise(e.id)}
                      size={40}
                      iconSize={22}
                      tone="danger"
                      pressScale={0.88}
                      hitSlop={12}
                    />
                  </View>
                </Card>
              </Animated.View>
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

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(ex) => addExercise(ex.id)}
        title="Ejercicios"
      />
    </Screen>
    </BottomSheetModalProvider>
  );
}

function StepperField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const display = format ? format(value) : String(value);

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        variant="caption"
        tone="muted"
        style={{ marginBottom: 6, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {/* Botón decrementar — escala 0.9, hitSlop generoso */}
        <PressableScale
          onPress={dec}
          hitSlop={10}
          pressScale={0.9}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.bg.elevated,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text weight="bold" style={{ fontSize: 18, lineHeight: 20, color: colors.text.primary }}>−</Text>
        </PressableScale>
        <Text weight="bold" style={{ minWidth: 44, textAlign: 'center', fontSize: 22 }}>
          {display}
        </Text>
        {/* Botón incrementar */}
        <PressableScale
          onPress={inc}
          hitSlop={10}
          pressScale={0.9}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.bg.elevated,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text weight="bold" style={{ fontSize: 18, lineHeight: 20, color: colors.text.primary }}>+</Text>
        </PressableScale>
      </View>
    </View>
  );
}

