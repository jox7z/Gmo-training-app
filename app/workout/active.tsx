import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Alert, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, radius } from '@/theme/tokens';
import { useRoutinesStore } from '@/store/routines';
import { useWorkoutsStore, Workout } from '@/store/workouts';
import { useAppStore, LOCAL_USER_ID } from '@/store/app';
import { exerciseById } from '@/data/exercises';
import { formatDuration, toDisplay, fromDisplay } from '@/lib/units';
import { Icon } from '@/components/Icon';
import { saveWorkout } from '@/lib/repos/workouts';
import { isSupabaseConfigured } from '@/lib/supabase';

const REST_GREEN_FROM = 150;
const REST_GREEN_TO = 300;

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function restColor(s: number) {
  if (s >= REST_GREEN_FROM && s < REST_GREEN_TO) return colors.success;
  return colors.text.muted;
}

export default function ActiveWorkout() {
  const { routineId, dayId } = useLocalSearchParams<{ routineId?: string; dayId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAppStore((s) => s.profile);
  const addWorkoutDay = useAppStore((s) => s.addWorkoutDay);
  const addPoints = useAppStore((s) => s.addPoints);

  const routine = useRoutinesStore((s) => s.routines.find((r) => r.id === routineId));
  const day = routine?.days.find((d) => d.id === dayId);

  const active = useWorkoutsStore((s) => s.active);
  const startWorkout = useWorkoutsStore((s) => s.startWorkout);
  const updateSet = useWorkoutsStore((s) => s.updateSet);
  const toggleSetComplete = useWorkoutsStore((s) => s.toggleSetComplete);
  const finishWorkout = useWorkoutsStore((s) => s.finishWorkout);
  const cancelWorkout = useWorkoutsStore((s) => s.cancelWorkout);

  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [resting, setResting] = useState(false);
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [restElapsed, setRestElapsed] = useState(0);
  const [setStartedAt, setSetStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [summary, setSummary] = useState<Workout | null>(null);

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
    if (!active || summary) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [active, summary]);

  useEffect(() => {
    if (!resting || !restStartedAt) return;
    const t = setInterval(() => {
      setRestElapsed(Math.floor((Date.now() - restStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [resting, restStartedAt]);

  // Mark setStartedAt cada vez que el SetView pasa a mostrar un set nuevo
  // (mientras no estemos en descanso). Cubre arranque del workout, "Siguiente
  // set/ejercicio" y jumps. La duración del set se calcula al pulsar
  // "Set completado" (now - setStartedAt).
  useEffect(() => {
    if (!active || resting || summary) return;
    const ex = active.exercises[exIdx];
    const s = ex?.sets[setIdx];
    if (!s || s.isCompleted) {
      setSetStartedAt(null);
      return;
    }
    setSetStartedAt(Date.now());
  }, [active, exIdx, setIdx, resting, summary]);

  if (!active || !profile) {
    return (
      <Screen>
        <Text>Cargando workout...</Text>
      </Screen>
    );
  }

  if (summary) {
    return <Summary workout={summary} unit={profile.unit} onClose={() => router.replace('/(tabs)')} />;
  }

  const currentEx = active.exercises[exIdx];
  const currentSet = currentEx?.sets[setIdx];
  const totalEx = active.exercises.length;
  const totalSets = active.exercises.reduce((a, e) => a + e.sets.length, 0);
  const completedSets = active.exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.isCompleted).length,
    0,
  );
  const isLastSet =
    exIdx === totalEx - 1 && setIdx === (currentEx?.sets.length ?? 1) - 1;

  const restsLogged = active.exercises
    .flatMap((e) => e.sets)
    .map((s) => s.restAfterSeconds)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const avgRest =
    restsLogged.length > 0
      ? Math.round(restsLogged.reduce((a, b) => a + b, 0) / restsLogged.length)
      : 0;

  const handleSetComplete = () => {
    // Captura duración antes de togglear (now - setStartedAt). Si no había
    // setStartedAt (caso raro: completado por jump sin pasar por SetView),
    // simplemente no se persiste.
    if (setStartedAt) {
      const secs = Math.max(0, Math.round((Date.now() - setStartedAt) / 1000));
      updateSet(exIdx, setIdx, { durationSeconds: secs });
    }
    toggleSetComplete(exIdx, setIdx);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSetStartedAt(null);
    setResting(true);
    setRestStartedAt(Date.now());
    setRestElapsed(0);
  };

  const advancePosition = () => {
    if (!currentEx) return;
    if (setIdx + 1 < currentEx.sets.length) {
      const justSet = currentEx.sets[setIdx];
      const nextSet = currentEx.sets[setIdx + 1];
      if (!nextSet.isCompleted) {
        updateSet(exIdx, setIdx + 1, { reps: justSet.reps, weightKg: justSet.weightKg });
      }
      setSetIdx(setIdx + 1);
    } else if (exIdx + 1 < totalEx) {
      setExIdx(exIdx + 1);
      setSetIdx(0);
    }
  };

  const captureRest = () => {
    if (restStartedAt) {
      const secs = Math.max(0, Math.round((Date.now() - restStartedAt) / 1000));
      updateSet(exIdx, setIdx, { restAfterSeconds: secs });
    }
  };

  const handleNext = () => {
    captureRest();
    setResting(false);
    setRestStartedAt(null);
    setRestElapsed(0);
    advancePosition();
  };

  const finalize = () => {
    if (resting) captureRest();
    const finished = finishWorkout({ feeling: 'good' });
    if (finished) {
      addWorkoutDay();
      addPoints(10);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSummary(finished);
      if (isSupabaseConfigured && profile.id !== LOCAL_USER_ID) {
        saveWorkout(profile.id, finished).catch((e: any) => {
          Alert.alert('Error al guardar', e?.message ?? 'El workout no se pudo sincronizar.');
        });
      }
    }
  };

  const handleFinish = () => {
    Alert.alert('Terminar entrenamiento', '¿Confirmas que terminaste?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, terminar', onPress: finalize },
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

  const jumpTo = (eIdx: number, sIdx: number) => {
    setExIdx(eIdx);
    setSetIdx(sIdx);
    setResting(false);
    setRestStartedAt(null);
    setRestElapsed(0);
    setShowJump(false);
  };

  return (
    <Screen padded={false}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable onPress={handleCancel} hitSlop={12}>
          <Icon name="close" size={22} color={colors.danger} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text variant="caption" tone="muted">
            Ejercicio {exIdx + 1} de {totalEx}
          </Text>
          <Text variant="title" tone="brand" numeric>{formatDuration(elapsed)}</Text>
        </View>
        <Pressable onPress={() => setShowJump(true)} hitSlop={12}>
          <Text variant="caption" tone="brand" weight="bold">Ver todos</Text>
        </Pressable>
      </View>

      {/* Mini stats */}
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
        <MiniStat
          label="Descanso prom."
          value={avgRest > 0 ? formatClock(avgRest) : '—'}
        />
        <MiniStat label="Ejercicios" value={`${exIdx + 1}/${totalEx}`} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: 40,
          flexGrow: 1,
          justifyContent: 'center',
        }}
      >
        {resting ? (
          <RestView
            elapsed={restElapsed}
            justExercise={currentEx?.exerciseName ?? ''}
            justSet={setIdx + 1}
            totalInEx={currentEx?.sets.length ?? 0}
            doneSet={currentSet}
            unit={profile.unit}
            isLastSet={isLastSet}
            onNext={handleNext}
            onFinish={handleFinish}
          />
        ) : currentEx && currentSet ? (
          <SetView
            exerciseName={currentEx.exerciseName}
            muscle={currentEx.muscleGroup}
            setNumber={setIdx + 1}
            totalSets={currentEx.sets.length}
            reps={currentSet.reps}
            weightKg={currentSet.weightKg}
            unit={profile.unit}
            onWeightChange={(v) => updateSet(exIdx, setIdx, { weightKg: fromDisplay(v, profile.unit) })}
            onRepsChange={(v) => updateSet(exIdx, setIdx, { reps: v })}
            onComplete={handleSetComplete}
          />
        ) : null}
      </ScrollView>

      <JumpModal
        visible={showJump}
        active={active}
        currentExIdx={exIdx}
        currentSetIdx={setIdx}
        unit={profile.unit}
        onClose={() => setShowJump(false)}
        onJump={jumpTo}
      />
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

function SetView({
  exerciseName,
  muscle,
  setNumber,
  totalSets,
  reps,
  weightKg,
  unit,
  onWeightChange,
  onRepsChange,
  onComplete,
}: {
  exerciseName: string;
  muscle: string;
  setNumber: number;
  totalSets: number;
  reps: number;
  weightKg: number;
  unit: 'kg' | 'lb';
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
  onComplete: () => void;
}) {
  const displayWeight = toDisplay(weightKg, unit);
  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Badge label={muscle} tone="info" />
        <Text variant="display" style={{ marginTop: spacing.md, textAlign: 'center' }}>
          {exerciseName}
        </Text>
        <Text variant="title" tone="brand" style={{ marginTop: spacing.sm }}>
          Set {setNumber} de {totalSets}
        </Text>
      </View>

      <Card padding="lg" style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <BigNumeric
            label={unit.toUpperCase()}
            value={displayWeight}
            step={unit === 'kg' ? 2.5 : 5}
            decimals={1}
            onChange={onWeightChange}
          />
          <BigNumeric
            label="REPS"
            value={reps}
            step={1}
            decimals={0}
            onChange={onRepsChange}
          />
        </View>
      </Card>

      <Pressable
        onPress={onComplete}
        style={{
          backgroundColor: colors.primary.DEFAULT,
          borderRadius: radius.lg,
          paddingVertical: 22,
          alignItems: 'center',
        }}
      >
        <Text variant="title" weight="black" style={{ color: '#fff' }}>
          Set completado
        </Text>
      </Pressable>
    </View>
  );
}

function BigNumeric({
  label,
  value,
  step,
  decimals,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  decimals: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(value.toFixed(decimals).replace(/\.0$/, ''));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(value.toFixed(decimals).replace(/\.0$/, ''));
  }, [value, decimals, editing]);

  const bump = (delta: number) => {
    const next = Math.max(0, value + delta);
    onChange(parseFloat(next.toFixed(decimals)));
    Haptics.selectionAsync();
  };

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="label" tone="muted">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <Pressable
          onPress={() => bump(-step)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="heading" weight="bold">−</Text>
        </Pressable>
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
            fontSize: 40,
            fontWeight: '900',
            textAlign: 'center',
            minWidth: 110,
            paddingHorizontal: 8,
          }}
          selectTextOnFocus
        />
        <Pressable
          onPress={() => bump(step)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="heading" weight="bold">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RestView({
  elapsed,
  justExercise,
  justSet,
  totalInEx,
  doneSet,
  unit,
  isLastSet,
  onNext,
  onFinish,
}: {
  elapsed: number;
  justExercise: string;
  justSet: number;
  totalInEx: number;
  doneSet: { reps: number; weightKg: number } | undefined;
  unit: 'kg' | 'lb';
  isLastSet: boolean;
  onNext: () => void;
  onFinish: () => void;
}) {
  const color = restColor(elapsed);
  const isExerciseDone = justSet >= totalInEx;
  const nextLabel = isLastSet
    ? 'Terminar workout'
    : isExerciseDone
      ? 'Siguiente ejercicio'
      : 'Siguiente set';
  const onPress = isLastSet ? onFinish : onNext;

  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="label" tone="muted">DESCANSO</Text>
      <Text
        style={{
          fontSize: 96,
          fontWeight: '900',
          color,
          marginTop: spacing.md,
          letterSpacing: 2,
        }}
      >
        {formatClock(elapsed)}
      </Text>

      <Card padding="lg" style={{ width: '100%', marginTop: spacing['2xl'] }}>
        <Text variant="label" tone="muted">SET COMPLETADO</Text>
        <Text variant="heading" style={{ marginTop: 4 }}>{justExercise}</Text>
        {doneSet && (
          <Text variant="title" tone="brand" style={{ marginTop: 4 }} numeric>
            {toDisplay(doneSet.weightKg, unit).toFixed(unit === 'kg' ? 1 : 0)} {unit} × {doneSet.reps}
          </Text>
        )}
      </Card>

      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: colors.primary.DEFAULT,
          borderRadius: radius.lg,
          paddingVertical: 22,
          alignItems: 'center',
          marginTop: spacing['2xl'],
          alignSelf: 'stretch',
        }}
      >
        <Text variant="title" weight="black" style={{ color: '#fff' }}>
          {nextLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function JumpModal({
  visible,
  active,
  currentExIdx,
  currentSetIdx,
  unit,
  onClose,
  onJump,
}: {
  visible: boolean;
  active: Workout;
  currentExIdx: number;
  currentSetIdx: number;
  unit: 'kg' | 'lb';
  onClose: () => void;
  onJump: (exIdx: number, setIdx: number) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            <Text variant="title">Todos los ejercicios</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Icon name="close" size={22} color={colors.text.muted} />
            </Pressable>
          </View>
          <ScrollView style={{ marginTop: spacing.md }}>
            {active.exercises.map((ex, eIdx) => (
              <View key={ex.id} style={{ marginBottom: spacing.lg }}>
                <Text variant="heading">{ex.exerciseName}</Text>
                <View style={{ marginTop: spacing.sm, gap: 6 }}>
                  {ex.sets.map((s, sIdx) => {
                    const isCurrent = eIdx === currentExIdx && sIdx === currentSetIdx;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => onJump(eIdx, sIdx)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: radius.md,
                          backgroundColor: isCurrent
                            ? colors.primary.muted
                            : s.isCompleted
                              ? colors.bg.elevated
                              : 'transparent',
                          borderWidth: 1,
                          borderColor: isCurrent ? colors.primary.DEFAULT : colors.border,
                        }}
                      >
                        <Text weight="bold" style={{ width: 50 }} tone={isCurrent ? 'brand' : 'secondary'}>
                          Set {sIdx + 1}
                        </Text>
                        <Text style={{ flex: 1 }} tone={s.isCompleted ? 'primary' : 'muted'}>
                          {toDisplay(s.weightKg, unit).toFixed(unit === 'kg' ? 1 : 0)} {unit} × {s.reps}
                        </Text>
                        {s.isCompleted && <Icon name="check" size={16} color={colors.success} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Summary({
  workout,
  unit,
  onClose,
}: {
  workout: Workout;
  unit: 'kg' | 'lb';
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const completedSets = workout.exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.isCompleted).length,
    0,
  );
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: spacing['2xl'],
        }}
      >
        <Text variant="label" tone="brand">WORKOUT COMPLETADO</Text>
        <Text variant="display" style={{ marginTop: 4 }}>{workout.routineName ?? 'Entrenamiento libre'}</Text>

        <Card variant="glow" padding="lg" style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SummaryStat label="Tiempo total" value={formatDuration(workout.durationSeconds ?? 0)} />
            <SummaryStat label="Sets" value={`${completedSets}/${totalSets}`} />
            <SummaryStat
              label="Descanso prom."
              value={workout.avgRestSeconds ? formatClock(workout.avgRestSeconds) : '—'}
            />
          </View>
        </Card>

        <View style={{ marginTop: spacing['2xl'] }}>
          <Text variant="heading" style={{ marginBottom: spacing.md }}>Detalle</Text>
          {workout.exercises.map((ex) => {
            const done = ex.sets.filter((s) => s.isCompleted).length;
            return (
              <Card key={ex.id} padding="md" style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold">{ex.exerciseName}</Text>
                    <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                      {done}/{ex.sets.length} sets completados
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: spacing.sm, gap: 4 }}>
                  {ex.sets.map((s, i) => (
                    <Text
                      key={s.id}
                      variant="caption"
                      tone={s.isCompleted ? 'secondary' : 'muted'}
                    >
                      Set {i + 1}: {toDisplay(s.weightKg, unit).toFixed(unit === 'kg' ? 1 : 0)} {unit} × {s.reps}
                      {s.restAfterSeconds ? ` · descanso ${formatClock(s.restAfterSeconds)}` : ''}
                    </Text>
                  ))}
                </View>
              </Card>
            );
          })}
        </View>

        <Button
          title="Ir al inicio"
          onPress={onClose}
          style={{ marginTop: spacing.xl }}
          fullWidth
        />
      </ScrollView>
    </Screen>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text variant="label" tone="muted">{label}</Text>
      <Text variant="heading" numeric style={{ marginTop: 4 }}>{value}</Text>
    </View>
  );
}
