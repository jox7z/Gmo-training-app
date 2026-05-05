import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, radius } from '@/theme/tokens';
import { useRoutinesStore } from '@/store/routines';
import { useWorkoutsStore } from '@/store/workouts';
import { useAppStore } from '@/store/app';
import { exerciseById } from '@/data/exercises';
import { formatDuration, formatWeight, toDisplay, fromDisplay } from '@/lib/units';

export default function ActiveWorkout() {
  const { routineId, dayId } = useLocalSearchParams<{ routineId?: string; dayId?: string }>();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const addWorkoutDay = useAppStore((s) => s.addWorkoutDay);
  const addPoints = useAppStore((s) => s.addPoints);

  const routine = useRoutinesStore((s) => s.routines.find((r) => r.id === routineId));
  const day = routine?.days.find((d) => d.id === dayId);

  const active = useWorkoutsStore((s) => s.active);
  const startWorkout = useWorkoutsStore((s) => s.startWorkout);
  const updateSet = useWorkoutsStore((s) => s.updateSet);
  const toggleSetComplete = useWorkoutsStore((s) => s.toggleSetComplete);
  const addSet = useWorkoutsStore((s) => s.addSet);
  const removeSet = useWorkoutsStore((s) => s.removeSet);
  const finishWorkout = useWorkoutsStore((s) => s.finishWorkout);
  const cancelWorkout = useWorkoutsStore((s) => s.cancelWorkout);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active && day && routine && profile) {
      startWorkout({
        routineDayId: day.id,
        routineName: `${routine.name} · ${day.name}`,
        exercises: day.exercises.map((e) => {
          const ex = exerciseById(e.exerciseId);
          return {
            id: '',
            exerciseId: e.exerciseId,
            exerciseName: ex?.name ?? e.exerciseId,
            muscleGroup: ex?.muscle ?? 'core',
            sets: Array.from({ length: e.targetSets }, () => ({
              id: Math.random().toString(36).slice(2),
              reps: e.targetRepsMin,
              weightKg: 20,
              isCompleted: false,
            })),
          };
        }),
      });
    }
  }, [active, day, routine, profile]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [active]);

  if (!active || !profile) {
    return (
      <Screen>
        <Text>Cargando workout...</Text>
      </Screen>
    );
  }

  const completedSets = active.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);
  const totalSets = active.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const volume = active.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).reduce((a, s) => a + s.reps * s.weightKg, 0),
    0,
  );

  const handleFinish = () => {
    Alert.alert('Terminar entrenamiento', '¿Confirmas que terminaste?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, terminar',
        onPress: () => {
          const finished = finishWorkout({ feeling: 'good' });
          if (finished) {
            addWorkoutDay();
            addPoints(10);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancelar workout', '¿Seguro? Se perderá el progreso.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar',
        style: 'destructive',
        onPress: () => {
          cancelWorkout();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      {/* Header sticky */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable onPress={handleCancel} hitSlop={12}>
          <Text variant="heading" tone="danger">✕</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text variant="caption" tone="muted">{active.routineName}</Text>
          <Text variant="title" tone="brand" numeric>{formatDuration(elapsed)}</Text>
        </View>
        <Button title="Terminar" size="sm" variant="accent" onPress={handleFinish} />
      </View>

      {/* Progreso */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <MiniStat label="Sets" value={`${completedSets}/${totalSets}`} />
        <MiniStat label="Volumen" value={`${Math.round(toDisplay(volume, profile.unit))} ${profile.unit}`} />
        <MiniStat label="Ejercicios" value={`${active.exercises.length}`} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        {active.exercises.map((ex, exIdx) => (
          <Card key={ex.id} padding="lg" style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="heading">{ex.exerciseName}</Text>
                <Badge label={ex.muscleGroup} tone="info" />
              </View>
            </View>

            {/* Header columnas */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 8, marginBottom: 6 }}>
              <Text variant="label" tone="muted" style={{ width: 32 }}>SET</Text>
              <Text variant="label" tone="muted" style={{ flex: 1, textAlign: 'center' }}>{profile.unit.toUpperCase()}</Text>
              <Text variant="label" tone="muted" style={{ flex: 1, textAlign: 'center' }}>REPS</Text>
              <View style={{ width: 44 }} />
            </View>

            {ex.sets.map((s, setIdx) => (
              <SetRow
                key={s.id}
                index={setIdx + 1}
                set={s}
                unit={profile.unit}
                onWeightChange={(v) => updateSet(exIdx, setIdx, { weightKg: fromDisplay(v, profile.unit) })}
                onRepsChange={(v) => updateSet(exIdx, setIdx, { reps: v })}
                onToggle={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  toggleSetComplete(exIdx, setIdx);
                }}
                onLongPress={() => removeSet(exIdx, setIdx)}
              />
            ))}

            <Pressable
              onPress={() => addSet(exIdx)}
              style={{
                marginTop: spacing.sm,
                paddingVertical: 12,
                borderRadius: radius.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Text tone="secondary" weight="semibold">+ Agregar serie</Text>
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="label" tone="muted">{label}</Text>
      <Text variant="heading" numeric style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function SetRow({
  index,
  set,
  unit,
  onWeightChange,
  onRepsChange,
  onToggle,
  onLongPress,
}: {
  index: number;
  set: { reps: number; weightKg: number; isCompleted: boolean };
  unit: 'kg' | 'lb';
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  const displayWeight = toDisplay(set.weightKg, unit);
  return (
    <Pressable onLongPress={onLongPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 8,
          marginBottom: 4,
          borderRadius: radius.md,
          backgroundColor: set.isCompleted ? colors.primary.muted : 'transparent',
        }}
      >
        <Text weight="bold" style={{ width: 32 }} tone={set.isCompleted ? 'brand' : 'secondary'}>
          {index}
        </Text>
        <NumericCell
          value={displayWeight}
          onChange={onWeightChange}
          step={unit === 'kg' ? 2.5 : 5}
          decimals={1}
        />
        <NumericCell value={set.reps} onChange={onRepsChange} step={1} decimals={0} />
        <Pressable
          onPress={onToggle}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: set.isCompleted ? colors.primary.DEFAULT : colors.bg.elevated,
            borderWidth: 1,
            borderColor: set.isCompleted ? colors.primary.DEFAULT : colors.border,
          }}
        >
          <Text weight="bold">{set.isCompleted ? '✓' : ''}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function NumericCell({
  value,
  onChange,
  step,
  decimals,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  decimals: number;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value.toFixed(decimals));

  useEffect(() => {
    if (!editing) setText(value.toFixed(decimals).replace(/\.0$/, ''));
  }, [value, decimals, editing]);

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <TextInput
        value={text}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          const n = parseFloat(text);
          if (!isNaN(n)) onChange(n);
        }}
        onChangeText={setText}
        keyboardType="decimal-pad"
        style={{
          color: colors.text.primary,
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          minWidth: 60,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: editing ? colors.bg.elevated : 'transparent',
        }}
        selectTextOnFocus
      />
    </View>
  );
}
