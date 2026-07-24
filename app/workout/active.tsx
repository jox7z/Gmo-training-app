import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Pressable, Alert, Dimensions, ScrollView, Keyboard, KeyboardAvoidingView, Platform, InputAccessoryView } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { colors, spacing, radius, fontSize } from '@/theme/tokens';
import { useRoutinesStore, RoutineDay } from '@/store/routines';
import { useWorkoutsStore, Workout, WorkoutExercise } from '@/store/workouts';
import { useAppStore, LOCAL_USER_ID } from '@/store/app';
import { useAchievementsStore, type UnlockedAchievement } from '@/store/achievements';
import { AchievementUnlockModal } from '@/components/achievements/AchievementUnlockModal';
import { exerciseById, MUSCLE_FILTER_GROUPS, MUSCLE_GROUP_LABELS } from '@/data/exercises';
import { exerciseImage } from '@/data/exerciseImages';
import { ExercisePickerSheet } from '@/components/ExercisePickerSheet';
import { formatDuration, toDisplay, fromDisplay, formatWeight } from '@/lib/units';
import { Icon } from '@/components/Icon';
import { saveWorkout } from '@/lib/repos/workouts';
import { isSupabaseConfigured } from '@/lib/supabase';
import { findPreviousSession, comparePerExercise, detectPRs, summarizeProgress, previousExerciseSets, historicMaxWeight } from '@/lib/workoutCompare';
import { isValidWorkout } from '@/lib/workoutGuards';
import { WorkoutHeader } from '@/components/workout/WorkoutHeader';
import { SetProgressPills } from '@/components/workout/SetProgressPills';
import { ExerciseHero } from '@/components/workout/ExerciseHero';
import { RestRing } from '@/components/workout/RestRing';
import { BigStepperInput } from '@/components/workout/BigStepperInput';
import { PlateCalculatorSheet } from '@/components/workout/PlateCalculatorSheet';
import { ExerciseDetailSheet } from '@/components/ExerciseDetailSheet';
import { Chip } from '@/components/ui/Chip';

const REST_PHRASES = [
  '¡Una más!',
  'Vas increíble',
  'El descanso también entrena',
  'Respira y vuelve más fuerte',
  'Esto es lo que te hace diferente',
];

const SET_SPLASH_PHRASES = [
  '¡Vamos! Siguiente serie',
  'A darlo todo',
  '¡Siguiente serie!',
  '¡Tú puedes!',
  'Máximo esfuerzo',
];

const PROGRESS_PHRASES = {
  pr:    '¡Nuevo récord personal!',
  weight:'¡Más fuerte que antes!',
  reps:  '¡Una rep más!',
  any:   '¡Sigue mejorando!',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Phase = 'warmup' | 'set' | 'log' | 'rest' | 'summary';

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

// Etiqueta de grupo muscular sin acoplarse al tipo estricto de MuscleGroup.
function muscleLabel(muscleGroup: string): string | undefined {
  return (MUSCLE_GROUP_LABELS as Record<string, string>)[muscleGroup];
}

// Réplica pura de advancePosition (sin efectos): a dónde se mueve la sesión
// después de la serie actual. null = era la última serie del workout.
function getNextPosition(
  active: Workout,
  exIdx: number,
  setIdx: number,
): { exercise: WorkoutExercise; setNumber: number; totalSets: number } | null {
  const currentEx = active.exercises[exIdx];
  if (!currentEx) return null;
  if (setIdx + 1 < currentEx.sets.length) {
    return { exercise: currentEx, setNumber: setIdx + 2, totalSets: currentEx.sets.length };
  }
  if (exIdx + 1 < active.exercises.length) {
    const next = active.exercises[exIdx + 1];
    return { exercise: next, setNumber: 1, totalSets: next.sets.length };
  }
  return null;
}

// Miniatura cuadrada del ejercicio con fallback a icono dumbbell.
function ExerciseThumb({ exerciseId, size = 44 }: { exerciseId: string; size?: number }) {
  const img = exerciseImage(exerciseId);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.bg.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {img !== undefined ? (
        <Image source={img} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={120} />
      ) : (
        <Icon name="dumbbell" size={Math.round(size * 0.45)} color={colors.text.muted} />
      )}
    </View>
  );
}

export default function ActiveWorkout() {
  const { routineId, dayId } = useLocalSearchParams<{ routineId?: string; dayId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAppStore((s) => s.profile);
  const addPoints = useAppStore((s) => s.addPoints);

  const routine = useRoutinesStore((s) => s.routines.find((r) => r.id === routineId));
  // Día seleccionado para HOY: arranca en el día sugerido, pero el usuario
  // puede cambiarlo durante el calentamiento (solo afecta esta sesión).
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(dayId);
  const day = routine?.days.find((d) => d.id === selectedDayId) ?? routine?.days[0];

  const active = useWorkoutsStore((s) => s.active);
  const history = useWorkoutsStore((s) => s.history);
  const startWorkout = useWorkoutsStore((s) => s.startWorkout);
  const updateSet = useWorkoutsStore((s) => s.updateSet);
  const toggleSetComplete = useWorkoutsStore((s) => s.toggleSetComplete);
  const finishWorkout = useWorkoutsStore((s) => s.finishWorkout);
  const cancelWorkout = useWorkoutsStore((s) => s.cancelWorkout);
  const swapExercise = useWorkoutsStore((s) => s.swapExercise);

  const [phase, setPhase] = useState<Phase>('warmup');
  const [swapOpen, setSwapOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [summaryWorkout, setSummaryWorkout] = useState<Workout | null>(null);
  const [unlockQueue, setUnlockQueue] = useState<UnlockedAchievement[]>([]);
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [showSetSplash, setShowSetSplash] = useState(false);
  const [splashPhrase, setSplashPhrase] = useState('');
  const prevPhaseRef = useRef<Phase>('warmup');
  // Ejercicios cuyo PR en vivo ya se celebró en esta sesión (evita repetir el
  // splash de récord si el usuario mejora el mismo ejercicio en varias series).
  const prCelebratedRef = useRef<Set<string>>(new Set());
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [restElapsed, setRestElapsed] = useState(0);
  const [setStartedAt, setSetStartedAt] = useState<number | null>(null);
  const [setTimerElapsed, setSetTimerElapsed] = useState(0);
  const [warmupStartedAt, setWarmupStartedAt] = useState<number | null>(null);
  const [warmupElapsed, setWarmupElapsed] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // ---- Original transition: hero scales in from 0.88 + opacity, while a
  //      thin accent line sweeps width from 0→100% just before the hero
  //      settles. Runs on every phase change. useNativeDriver-safe: scale,
  //      opacity (hero) + width is JS-driven but kept off the hot path.
  const heroScale   = useRef(new Animated.Value(1)).current;
  const heroOpacity = useRef(new Animated.Value(1)).current;
  // accent bar width expressed as 0→1 (we multiply by screen width in style)
  const accentProgress = useRef(new Animated.Value(0)).current;

  // Splash overlay animation values
  const splashScale   = useRef(new Animated.Value(0.72)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashY       = useRef(new Animated.Value(28)).current;   // slide up
  const splashRing    = useRef(new Animated.Value(0)).current;    // ring expand 0→1
  const splashPulse   = useRef(new Animated.Value(1)).current;    // ring pulse

  // Energetic full-screen splash with a phrase. Reused when entering a set
  // from rest and when the user swaps the exercise mid-session.
  const playSplash = (phrase: string) => {
    setSplashPhrase(phrase);
    // Reset all values
    splashScale.setValue(0.72);
    splashOpacity.setValue(0);
    splashY.setValue(28);
    splashRing.setValue(0);
    splashPulse.setValue(1);
    setShowSetSplash(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      // Phase 1 (0–320ms): ring bursts out + phrase springs in with upward slide
      Animated.parallel([
        // Ring expands from 0 → full radius
        Animated.timing(splashRing, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        // Phrase: spring overshoot (scale) + slide up + fade in
        Animated.spring(splashScale, {
          toValue: 1,
          friction: 4,
          tension: 160,
          useNativeDriver: true,
        }),
        Animated.timing(splashY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(splashOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2 (320–520ms): ring pulses once — scale up 1→1.12→1
      Animated.sequence([
        Animated.timing(splashPulse, {
          toValue: 1.12,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(splashPulse, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      // Phase 3: hold at full opacity
      Animated.delay(480),
      // Phase 4: fade out everything
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => setShowSetSplash(false));
  };

  useEffect(() => {
    const fromRest = prevPhaseRef.current === 'rest' && phase === 'set';
    prevPhaseRef.current = phase;

    // Reset state for incoming phase
    heroScale.setValue(0.88);
    heroOpacity.setValue(0);
    accentProgress.setValue(0);

    Animated.sequence([
      // 1. accent bar sweeps across (80ms)
      Animated.timing(accentProgress, {
        toValue: 1,
        duration: 80,
        useNativeDriver: false, // width cannot use native driver
      }),
      // 2. hero scales+fades in (280ms spring feel)
      Animated.parallel([
        Animated.spring(heroScale, {
          toValue: 1,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Show energetic splash when entering set from rest (not the very first set)
    if (fromRest) {
      playSplash(SET_SPLASH_PHRASES[Math.floor(Math.random() * SET_SPLASH_PHRASES.length)]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Start warmup timer on mount
  useEffect(() => {
    const now = Date.now();
    setWarmupStartedAt(now);
    setWarmupElapsed(0);
  }, []);

  // Warmup ticker
  useEffect(() => {
    if (phase !== 'warmup' || !warmupStartedAt) return;
    const t = setInterval(() => {
      setWarmupElapsed(Math.floor((Date.now() - warmupStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [phase, warmupStartedAt]);

  // Rest ticker
  useEffect(() => {
    if (phase !== 'rest' || !restStartedAt) return;
    const t = setInterval(() => {
      setRestElapsed(Math.floor((Date.now() - restStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [phase, restStartedAt]);

  // Per-set duration ticker
  useEffect(() => {
    if (!active || phase !== 'set') return;
    const ex = active.exercises[exIdx];
    const s = ex?.sets[setIdx];
    if (!s || s.isCompleted) {
      setSetStartedAt(null);
      return;
    }
    const now = Date.now();
    setSetStartedAt(now);
    setSetTimerElapsed(0);
    const t = setInterval(() => {
      setSetTimerElapsed(Math.floor((Date.now() - now) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [active, exIdx, setIdx, phase]);

  // Total workout timer
  useEffect(() => {
    if (!active || phase === 'summary') return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [active, phase]);

  // Ejercicios ya presentes en la sesión — se excluyen del modal de cambio.
  const usedExerciseIds = useMemo(
    () => active?.exercises.map((e) => e.exerciseId) ?? [],
    [active?.exercises],
  );

  // Progreso global por ejercicio para la barra segmentada del header.
  // Antes de empezar (warmup) no hay workout activo → barra oculta.
  const segments = useMemo(
    () =>
      active
        ? active.exercises.map((e) => ({
            done: e.sets.filter((s) => s.isCompleted).length,
            total: e.sets.length,
          }))
        : [],
    [active],
  );

  // Series previas del ejercicio en curso (para mostrar "Anterior" en el log).
  // Excluye la sesión activa para no compararse consigo misma.
  // Dependencia en exerciseId (no en `active` completo): `active` cambia de
  // referencia en cada updateSet (peso/reps de cualquier serie), lo que
  // recalcularía este scan de todo el historial en cada tecla del stepper.
  const currentExerciseId = active?.exercises[exIdx]?.exerciseId;
  const activeId = active?.id;
  const prevSets = useMemo(
    () =>
      currentExerciseId && activeId
        ? previousExerciseSets(history, currentExerciseId, activeId)
        : null,
    [history, currentExerciseId, activeId],
  );

  if (!routine || !day || !profile) {
    return (
      <Screen>
        <Text>Cargando workout...</Text>
      </Screen>
    );
  }

  if ((phase === 'set' || phase === 'rest' || phase === 'log') && !active) {
    return (
      <Screen>
        <Text>Cargando workout...</Text>
      </Screen>
    );
  }

  // ---- derived state ----
  const currentEx  = active?.exercises[exIdx];
  const currentSet = currentEx?.sets[setIdx];

  // El selector de cambio arranca filtrado por el músculo del ejercicio actual
  // y destaca sus equivalentes (mismo músculo primero).
  const currentMuscle = currentEx ? exerciseById(currentEx.exerciseId)?.muscle : undefined;
  const swapInitialGroup =
    MUSCLE_FILTER_GROUPS.find((g) => currentMuscle && g.muscles.includes(currentMuscle))?.id ??
    'all';
  const totalEx    = active?.exercises.length ?? 0;
  const isLastSet  =
    !!active &&
    exIdx === totalEx - 1 &&
    setIdx === (currentEx?.sets.length ?? 1) - 1;
  // Serie previa que corresponde a la serie actual (última previa si hoy hay más).
  const prevSetForCurrent = prevSets ? prevSets[Math.min(setIdx, prevSets.length - 1)] : null;

  // ---- handlers ----

  const handleWarmupDone = () => {
    startWorkout({
      routineDayId: day.id,
      routineName: `${routine.name} · ${day.name}`,
      exercises: day.exercises.map((e) => {
        const ex = exerciseById(e.exerciseId);
        const isBodyweight = ex?.equipment === 'bodyweight';
        // Autocompleta peso/reps con lo que hiciste la última vez en este
        // ejercicio. Si hay menos series previas que las de hoy, la última serie
        // previa cubre las restantes; sin historial, valores por defecto.
        const prev = previousExerciseSets(history, e.exerciseId);
        return {
          id: '',
          exerciseId: e.exerciseId,
          exerciseName: ex?.name ?? e.exerciseId,
          muscleGroup: ex?.muscle ?? 'core',
          sets: Array.from({ length: e.targetSets }, (_, i) => {
            const src = prev ? prev[Math.min(i, prev.length - 1)] : null;
            return {
              id: Math.random().toString(36).slice(2),
              reps: src?.reps ?? e.targetRepsMin,
              weightKg: src?.weightKg ?? (isBodyweight ? 0 : 20),
              isCompleted: false,
            };
          }),
        };
      }),
    });
    setPhase('set');
  };

  const handleSetDone = () => {
    // Capture duration; transition to log to review reps+weight
    if (setStartedAt) {
      const secs = Math.max(0, Math.round((Date.now() - setStartedAt) / 1000));
      updateSet(exIdx, setIdx, { durationSeconds: secs });
    }
    setPhase('log');
  };

  const handleLogSave = () => {
    toggleSetComplete(exIdx, setIdx);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // PR en vivo: si el peso de esta serie supera el máximo histórico del
    // ejercicio (excluyendo esta sesión), celebra con splash una sola vez.
    if (
      currentEx &&
      currentSet &&
      active &&
      !prCelebratedRef.current.has(currentEx.exerciseId)
    ) {
      const max = historicMaxWeight(history, currentEx.exerciseId, active.id);
      if (max > 0 && currentSet.weightKg > max) {
        prCelebratedRef.current.add(currentEx.exerciseId);
        playSplash(PROGRESS_PHRASES.pr);
      }
    }
    setRestStartedAt(Date.now());
    setRestElapsed(0);
    setPhase('rest');
  };

  // Cambia el ejercicio actual SOLO para esta sesión (máquina ocupada, etc.).
  // La rutina guardada no se modifica. El splash a pantalla completa cubre el
  // cambio de contenido, así que no hace falta re-disparar la transición del hero.
  const handleSwapSelect = (newExerciseId: string) => {
    setSwapOpen(false);
    const newIdx = swapExercise(exIdx, newExerciseId);
    setExIdx(newIdx);
    setSetIdx(0);
    const name = exerciseById(newExerciseId)?.name ?? 'el nuevo ejercicio';
    playSplash(`¡Vamos con ${name}!`);
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
    setRestStartedAt(null);
    setRestElapsed(0);
    advancePosition();
    setPhase('set');
  };

  const finalize = () => {
    if (phase === 'rest') captureRest();
    const finished = finishWorkout({ feeling: 'good' });
    if (finished) {
      addPoints(10);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSummaryWorkout(finished);
      setPhase('summary');

      // Reevalúa logros con el historial ya actualizado y encola los nuevos
      // para celebrarlos sobre la pantalla de resumen.
      const newUnlocks = useAchievementsStore.getState().sync({
        history: useWorkoutsStore.getState().history,
      });
      if (newUnlocks.length) setUnlockQueue(newUnlocks);
      if (isSupabaseConfigured && profile.id !== LOCAL_USER_ID) {
        saveWorkout(profile.id, finished).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'El workout no se pudo sincronizar.';
          Alert.alert('Error al guardar', msg);
        });
      }
    }
  };

  const handleRestConfirm = () => {
    if (isLastSet) {
      if (active) {
        const check = isValidWorkout(active);
        if (!check.allowed) {
          Alert.alert('No se puede terminar', check.reason);
          return;
        }
      }
      Alert.alert('Terminar entrenamiento', '¿Confirmas que terminaste?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, terminar', onPress: finalize },
      ]);
    } else {
      handleNext();
    }
  };

  const handleCancel = () => {
    if (phase === 'warmup') {
      router.back();
      return;
    }
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

  // Next button label for rest screen
  const nextLabel = isLastSet
    ? 'Ya descansé · Terminar workout'
    : exIdx < totalEx - 1 && setIdx === (currentEx?.sets.length ?? 1) - 1
      ? 'Ya descansé · Siguiente ejercicio'
      : 'Ya descansé · Siguiente serie';

  // ---- header context text ----
  let headerContext = routine.name;
  if (phase === 'set' || phase === 'log' || phase === 'rest') {
    headerContext = `${currentEx?.exerciseName ?? ''} · ${exIdx + 1}/${totalEx}`;
  }

  // ---- render ----

  if (phase === 'summary' && summaryWorkout) {
    return (
      <>
        <Summary
          workout={summaryWorkout}
          profile={profile}
          onClose={() => router.replace('/(tabs)')}
          onPublishWithCaption={() =>
            router.replace({
              pathname: '/publish',
              params: { mode: 'workout', workoutId: summaryWorkout.id },
            })
          }
        />
        <AchievementUnlockModal
          queue={unlockQueue}
          visible={unlockQueue.length > 0}
          onClose={() => setUnlockQueue([])}
        />
      </>
    );
  }

  // Provider LOCAL: esta ruta se presenta como modal nativo (fullScreenModal);
  // el portal al provider del root quedaría DETRÁS del modal en iOS.
  return (
    <BottomSheetModalProvider>
    <View style={{ flex: 1, backgroundColor: colors.bg.base }}>
      {/* Header: close + contexto + chip de tiempo + barra de progreso global */}
      <View style={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.sm }}>
        <WorkoutHeader
          context={headerContext}
          elapsedLabel={active && phase !== 'summary' ? formatDuration(elapsed) : null}
          segments={segments}
          onClose={handleCancel}
        />
      </View>

      {/* Accent sweep bar — driven by accentProgress (0→1) */}
      <Animated.View
        style={{
          height: 1,
          backgroundColor: colors.primary.DEFAULT,
          width: accentProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          opacity: accentProgress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
          marginBottom: 1,
        }}
      />
      {/* Static border below the sweep */}
      <View style={{ height: 1, backgroundColor: colors.border }} />

      {/* Phase content — centred, fills remaining space */}
      <Animated.View
        style={{
          flex: 1,
          opacity: heroOpacity,
          transform: [{ scale: heroScale }],
          paddingHorizontal: spacing.lg,
          justifyContent: 'space-between',
          paddingBottom: insets.bottom + spacing.xl,
          paddingTop: spacing.xl,
        }}
      >
        {phase === 'warmup' && (
          <WarmupPhase
            elapsed={warmupElapsed}
            days={routine.days}
            selectedDayId={day.id}
            onSelectDay={setSelectedDayId}
            onDone={handleWarmupDone}
          />
        )}

        {phase === 'set' && currentEx && currentSet && (
          <SetPhase
            exerciseId={currentEx.exerciseId}
            exerciseName={currentEx.exerciseName}
            subtitle={muscleLabel(currentEx.muscleGroup)}
            setNumber={setIdx + 1}
            totalSets={currentEx.sets.length}
            completedCount={currentEx.sets.filter((s) => s.isCompleted).length}
            elapsed={setTimerElapsed}
            onDone={handleSetDone}
            onSwap={() => setSwapOpen(true)}
            onOpenDetail={() => setDetailOpen(true)}
          />
        )}

        {phase === 'log' && currentEx && currentSet && (
          <LogPhase
            set={currentSet}
            unit={profile.unit}
            exerciseId={currentEx.exerciseId}
            exerciseName={currentEx.exerciseName}
            setNumber={setIdx + 1}
            totalSets={currentEx.sets.length}
            previous={prevSetForCurrent}
            onWeightChange={(v) => updateSet(exIdx, setIdx, { weightKg: fromDisplay(v, profile.unit) })}
            onRepsChange={(v) => updateSet(exIdx, setIdx, { reps: v })}
            onSave={handleLogSave}
          />
        )}

        {phase === 'rest' && active && currentEx && currentSet && (
          <RestPhase
            elapsed={restElapsed}
            nextLabel={nextLabel}
            next={getNextPosition(active, exIdx, setIdx)}
            currentExercise={currentEx}
            currentSetIdx={setIdx}
            onConfirm={handleRestConfirm}
          />
        )}
      </Animated.View>

      {/* Energetic set-start splash overlay */}
      {showSetSplash && (
        <Pressable
          onPress={() => {
            Animated.timing(splashOpacity, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }).start(() => setShowSetSplash(false));
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Full-screen dark backdrop */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              backgroundColor: colors.bg.base,
              opacity: splashOpacity,
            }}
          />

          {/* Expanding accent ring burst — behind the text */}
          <Animated.View
            style={{
              position: 'absolute',
              width: SCREEN_WIDTH * 0.9,
              height: SCREEN_WIDTH * 0.9,
              borderRadius: SCREEN_WIDTH * 0.45,
              borderWidth: 1.5,
              borderColor: colors.primary.DEFAULT,
              // ring grows from invisible dot to full size
              transform: [
                {
                  scale: splashRing.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.08, 1],
                  }),
                },
                { scale: splashPulse },
              ],
              opacity: splashRing.interpolate({
                inputRange: [0, 0.15, 0.75, 1],
                outputRange: [0, 0.7, 0.35, 0.2],
              }),
              shadowColor: colors.primary.DEFAULT,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 24,
            }}
          />
          {/* Inner tighter ring for depth */}
          <Animated.View
            style={{
              position: 'absolute',
              width: SCREEN_WIDTH * 0.55,
              height: SCREEN_WIDTH * 0.55,
              borderRadius: SCREEN_WIDTH * 0.275,
              borderWidth: 1,
              borderColor: colors.primary.DEFAULT,
              transform: [
                {
                  scale: splashRing.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.1, 1],
                  }),
                },
                { scale: splashPulse },
              ],
              opacity: splashRing.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [0, 0.9, 0.5, 0.3],
              }),
            }}
          />

          {/* Phrase: spring-overshoots in with upward slide */}
          <Animated.View
            style={{
              opacity: splashOpacity,
              transform: [
                { scale: splashScale },
                { translateY: splashY },
              ],
              alignItems: 'center',
              paddingHorizontal: spacing.xl,
            }}
          >
            <Text variant="metric" tracking="tight" style={{ textAlign: 'center' }}>
              {splashPhrase}
            </Text>
            {/* Red accent pill beneath the phrase */}
            <View
              style={{
                width: 48,
                height: 3,
                backgroundColor: colors.primary.DEFAULT,
                marginTop: spacing.md,
                borderRadius: 2,
                shadowColor: colors.primary.DEFAULT,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 6,
              }}
            />
          </Animated.View>
        </Pressable>
      )}

      {/* Cambio de ejercicio solo para esta sesión */}
      <ExercisePickerSheet
        visible={swapOpen}
        onClose={() => setSwapOpen(false)}
        onSelect={(ex) => handleSwapSelect(ex.id)}
        excludeIds={usedExerciseIds}
        title="Cambiar ejercicio"
        subtitle="Solo para esta sesión — tu rutina queda igual."
        initialMuscle={swapInitialGroup}
        highlightMuscle={currentMuscle}
      />

      {/* Ficha del ejercicio en curso (hub de detalle) — accesible en pleno
          workout. `key` en el ejercicio actual reinicia el estado interno del
          sheet (selectedId = useState(initialExerciseId)) cada vez que cambia
          el ejercicio, garantizando que se abre con el correcto. */}
      <ExerciseDetailSheet
        key={currentEx?.exerciseId}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        unit={profile.unit}
        initialExerciseId={currentEx?.exerciseId}
        showSelector={false}
        initialTab="about"
      />
    </View>
    </BottomSheetModalProvider>
  );
}

// ---- Phase components ----

// Chip de día con "pop" elástico al quedar seleccionado.
function DayChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      scale.setValue(0.9);
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    }
  }, [active, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 18,
          borderRadius: radius.full,
          backgroundColor: active ? colors.primary.DEFAULT : colors.bg.elevated,
          borderWidth: 1,
          borderColor: active ? colors.primary.DEFAULT : colors.border,
        }}
      >
        <Text weight="bold" tone={active ? 'primary' : 'secondary'}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function WarmupPhase({
  elapsed,
  days,
  selectedDayId,
  onSelectDay,
  onDone,
}: {
  elapsed: number;
  days: RoutineDay[];
  selectedDayId: string;
  onSelectDay: (id: string) => void;
  onDone: () => void;
}) {
  const selDay = days.find((d) => d.id === selectedDayId) ?? days[0];

  // El preview de ejercicios entra con fade + slide cada vez que cambia el día.
  const previewOpacity = useRef(new Animated.Value(1)).current;
  const previewY = useRef(new Animated.Value(0)).current;
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    previewOpacity.setValue(0);
    previewY.setValue(14);
    Animated.parallel([
      Animated.timing(previewOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(previewY, { toValue: 0, friction: 6, tension: 140, useNativeDriver: true }),
    ]).start();
    Haptics.selectionAsync();
  }, [selectedDayId, previewOpacity, previewY]);

  const previewExercises = selDay?.exercises.slice(0, 4) ?? [];
  const extraCount = Math.max(0, (selDay?.exercises.length ?? 0) - previewExercises.length);

  return (
    <>
      {/* Selector de día — por si hoy toca improvisar */}
      <View>
        <Text variant="overline" tone="muted" style={{ marginBottom: spacing.md }}>
          DÍA DE HOY
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {days.map((d) => (
              <DayChip
                key={d.id}
                label={d.name}
                active={d.id === selectedDayId}
                onPress={() => onSelectDay(d.id)}
              />
            ))}
          </View>
        </ScrollView>
        {days.length > 1 && (
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
            ¿Cambio de planes? Elige otro día solo por hoy: tu rutina no se modifica.
          </Text>
        )}
      </View>

      {/* Tarjeta central: cronómetro de calentamiento + preview del día */}
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: spacing.lg }}>
        <Card variant="raised" padding="xl">
          <Text variant="overline" tone="muted" style={{ textAlign: 'center', marginBottom: spacing.sm }}>
            CALENTAMIENTO
          </Text>
          <Text
            variant="metricLg"
            numeric
            tracking="tightest"
            style={{
              color: colors.text.secondary,
              textAlign: 'center',
            }}
          >
            {formatClock(elapsed)}
          </Text>

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />

          {/* Preview animado de lo que toca hoy */}
          <Animated.View
            style={{
              opacity: previewOpacity,
              transform: [{ translateY: previewY }],
              gap: spacing.sm,
            }}
          >
            {previewExercises.map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <ExerciseThumb exerciseId={e.exerciseId} size={40} />
                <Text weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                  {exerciseById(e.exerciseId)?.name ?? e.exerciseId}
                </Text>
                <Text variant="caption" tone="muted">
                  {e.targetSets} series
                </Text>
              </View>
            ))}
            {extraCount > 0 && (
              <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: spacing.xs }}>
                +{extraCount} más
              </Text>
            )}
          </Animated.View>
        </Card>
      </View>

      <Button title="Terminé de calentar" variant="primary" size="lg" fullWidth onPress={onDone} />
    </>
  );
}

function SetPhase({
  exerciseId,
  exerciseName,
  subtitle,
  setNumber,
  totalSets,
  completedCount,
  elapsed,
  onDone,
  onSwap,
  onOpenDetail,
}: {
  exerciseId: string;
  exerciseName: string;
  subtitle?: string;
  setNumber: number;
  totalSets: number;
  completedCount: number;
  elapsed: number;
  onDone: () => void;
  onSwap: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <>
      {/* Arriba: serie actual + pills de progreso */}
      <View>
        <Text variant="overline" tone="brand" style={{ textAlign: 'center', marginBottom: spacing.md }}>
          SERIE {setNumber}/{totalSets}
        </Text>
        <SetProgressPills total={totalSets} current={setNumber - 1} completedCount={completedCount} />
      </View>

      {/* Centro: hero con imagen del ejercicio + chip del cronómetro */}
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.lg }}>
        <ExerciseHero
          exerciseId={exerciseId}
          name={exerciseName}
          subtitle={subtitle}
          onPress={onOpenDetail}
          style={{ flex: 1, flexShrink: 1, maxHeight: SCREEN_HEIGHT * 0.42, minHeight: 160 }}
        />

        {/* Chip ancho del cronómetro de la serie */}
        <View
          style={{
            backgroundColor: colors.bg.elevated,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            alignItems: 'center',
          }}
        >
          <Text variant="timer">{formatClock(elapsed)}</Text>
          <Text variant="caption" tone="muted" tracking="wide" style={{ marginTop: spacing.xs }}>
            tiempo en la serie
          </Text>
        </View>

        {/* ¿Máquina ocupada? Cambia el ejercicio solo por hoy */}
        <Chip
          label="Cambiar ejercicio"
          leftIcon="swap"
          variant="outline"
          onPress={onSwap}
          style={{ alignSelf: 'center' }}
        />
      </View>

      <Button title="Terminé la serie" variant="primary" size="lg" fullWidth onPress={onDone} />
    </>
  );
}

const LOG_ACCESSORY_ID = 'log-keyboard-accessory';

function LogPhase({
  set,
  unit,
  exerciseId,
  exerciseName,
  setNumber,
  totalSets,
  previous,
  onWeightChange,
  onRepsChange,
  onSave,
}: {
  set: { reps: number; weightKg: number };
  unit: 'kg' | 'lb';
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  previous?: { weightKg: number; reps: number } | null;
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
  onSave: () => void;
}) {
  const displayWeight = toDisplay(set.weightKg, unit);
  const equipment = exerciseById(exerciseId)?.equipment;
  const showPlates = equipment === 'barbell' || equipment === 'smith';
  const [platesOpen, setPlatesOpen] = useState(false);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* iOS: toolbar with "Listo" above decimal-pad */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={LOG_ACCESSORY_ID}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              backgroundColor: colors.bg.elevated,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
            }}
          >
            <Pressable onPress={Keyboard.dismiss} hitSlop={8}>
              <Text style={{ color: colors.primary.DEFAULT, fontWeight: '600', fontSize: fontSize.md }}>
                Listo
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}

      {/* Contexto compacto: qué ejercicio y qué serie se está registrando */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <ExerciseThumb exerciseId={exerciseId} size={44} />
        <Text variant="heading" style={{ flex: 1 }} numberOfLines={1}>
          {exerciseName}
        </Text>
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: 5,
            borderRadius: radius.full,
            backgroundColor: colors.primary.muted,
            borderWidth: 1,
            borderColor: colors.primary.DEFAULT,
          }}
        >
          <Text variant="caption" weight="bold" style={{ color: colors.primary.DEFAULT }} numeric>
            Serie {setNumber}/{totalSets}
          </Text>
        </View>
      </View>

      {/* Steppers gigantes de peso y reps */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          gap: spacing.lg,
          paddingVertical: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Referencia rápida de lo que hiciste la última vez en esta serie */}
        {previous && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="clock" size={13} color={colors.text.muted} />
            <Text variant="caption" tone="muted" numeric>
              Anterior: {formatWeight(previous.weightKg, unit)} × {previous.reps}
            </Text>
          </View>
        )}
        <BigStepperInput
          label={unit.toUpperCase()}
          value={displayWeight}
          step={unit === 'kg' ? 2.5 : 5}
          decimals={unit === 'kg' ? 1 : 0}
          onChange={onWeightChange}
          accessoryId={LOG_ACCESSORY_ID}
        />
        {showPlates && (
          <Chip
            label="Discos"
            leftIcon="dumbbell"
            variant="solid"
            onPress={() => setPlatesOpen(true)}
            style={{ alignSelf: 'center' }}
          />
        )}
        <BigStepperInput
          label="REPS"
          value={set.reps}
          step={1}
          decimals={0}
          onChange={onRepsChange}
          accessoryId={LOG_ACCESSORY_ID}
        />
      </ScrollView>

      <Button title="Guardar serie" variant="primary" size="lg" fullWidth onPress={onSave} />

      <PlateCalculatorSheet
        visible={platesOpen}
        onClose={() => setPlatesOpen(false)}
        targetDisplay={displayWeight}
        unit={unit}
        onApply={(v) => onWeightChange(v)}
      />
    </KeyboardAvoidingView>
  );
}

function RestPhrase() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const phraseOpacity = useRef(new Animated.Value(1)).current;
  const phraseScale   = useRef(new Animated.Value(1)).current;
  const phraseY       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cycle = () => {
      // Exit: fade + shrink + slide down
      Animated.parallel([
        Animated.timing(phraseOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(phraseScale,   { toValue: 0.82, duration: 300, useNativeDriver: true }),
        Animated.timing(phraseY,       { toValue: 12, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setPhraseIdx((i) => (i + 1) % REST_PHRASES.length);
        // Reset position for entrance
        phraseY.setValue(-16);
        phraseScale.setValue(0.9);
        // Entrance: spring overshoot + slide up from below + fade in
        Animated.parallel([
          Animated.timing(phraseOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.spring(phraseScale, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
          Animated.spring(phraseY, {
            toValue: 0,
            friction: 6,
            tension: 130,
            useNativeDriver: true,
          }),
        ]).start();
      });
    };

    const t = setInterval(cycle, 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <Animated.View
      style={{
        opacity: phraseOpacity,
        transform: [{ scale: phraseScale }, { translateY: phraseY }],
        marginTop: spacing.lg,
        alignItems: 'center',
      }}
    >
      <Text
        tracking="snug"
        style={{
          fontSize: fontSize.md,
          fontWeight: '600',
          color: colors.text.secondary,
          textAlign: 'center',
        }}
      >
        {REST_PHRASES[phraseIdx]}
      </Text>
    </Animated.View>
  );
}

function RestPhase({
  elapsed,
  nextLabel,
  next,
  currentExercise,
  currentSetIdx,
  onConfirm,
}: {
  elapsed: number;
  nextLabel: string;
  next: { exercise: WorkoutExercise; setNumber: number; totalSets: number } | null;
  currentExercise: WorkoutExercise;
  currentSetIdx: number;
  onConfirm: () => void;
}) {
  // Pills de lo que viene; si era la última serie del workout, mostramos el
  // ejercicio actual ya completo.
  const pillsEx = next ? next.exercise : currentExercise;
  const pillsTotal = next ? next.totalSets : currentExercise.sets.length;
  const pillsCurrent = next ? next.setNumber - 1 : currentSetIdx;
  const pillsCompleted = pillsEx.sets.filter((s) => s.isCompleted).length;

  return (
    <>
      {/* Arriba: label + pills de la serie que viene */}
      <View>
        <Text variant="overline" tone="muted" style={{ textAlign: 'center', marginBottom: spacing.md }}>
          DESCANSO
        </Text>
        <SetProgressPills total={pillsTotal} current={pillsCurrent} completedCount={pillsCompleted} />
      </View>

      {/* Centro: anillo de descanso + tarjeta de lo que sigue */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md }}>
        <RestRing elapsed={elapsed} size={Math.min(260, SCREEN_HEIGHT * 0.3)} />
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.md, textAlign: 'center', maxWidth: 260, lineHeight: 18 }}
        >
          Descansa hasta sentirte completamente recuperado (2–5 min)
        </Text>

        {/* Qué toca después del descanso */}
        <Card variant="raised" padding="md" style={{ alignSelf: 'stretch', marginTop: spacing.lg }}>
          {next ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <ExerciseThumb exerciseId={next.exercise.exerciseId} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="muted">
                  Siguiente
                </Text>
                <Text weight="semibold" numberOfLines={1}>
                  {next.exercise.exerciseName}
                </Text>
              </View>
              <Text variant="caption" tone="secondary" numeric>
                Serie {next.setNumber}/{next.totalSets}
              </Text>
            </View>
          ) : (
            <Text weight="semibold" style={{ textAlign: 'center' }}>
              ¡Último set, a cerrar fuerte!
            </Text>
          )}
        </Card>

        {/* Rotating motivational phrase — lively, cycles every ~4.5s */}
        <RestPhrase />
      </View>

      <Button title={nextLabel} variant="primary" size="lg" fullWidth onPress={onConfirm} />
    </>
  );
}

// ---- Summary screen ----

function Summary({
  workout,
  profile,
  onClose,
  onPublishWithCaption,
}: {
  workout: Workout;
  profile: ReturnType<typeof useAppStore.getState>['profile'];
  onClose: () => void;
  onPublishWithCaption: () => void;
}) {
  const insets = useSafeAreaInsets();
  const history = useWorkoutsStore((s) => s.history);
  const [publishing] = useState(false);

  // Success animation: ring scales+pulses in
  const ringScale   = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const checkScale  = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const progressScale   = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(progressOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(progressScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previousSession = findPreviousSession(history, workout);
  const comparisons = comparePerExercise(workout, previousSession);
  const prs = detectPRs(history, workout);
  const progress = summarizeProgress(comparisons, prs);
  const hasProgress = progress.improvedCount > 0 || progress.prCount > 0;

  const totalSets = workout.exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
    0,
  );

  const unit = profile?.unit ?? 'kg';


  const duration = formatDuration(workout.durationSeconds ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing['2xl'],
          paddingBottom: insets.bottom + spacing['3xl'],
          paddingHorizontal: spacing.lg,
        }}
      >
        {/* ---- Hero header ---- */}
        <View style={{ alignItems: 'center', marginBottom: spacing['2xl'] }}>
          <Animated.View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 2,
              borderColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
              marginBottom: spacing.lg,
            }}
          >
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Icon name="check" size={40} color={colors.success} />
            </Animated.View>
          </Animated.View>

          <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
            <Text
              tracking="tighter"
              style={{
                fontSize: fontSize['3xl'],
                fontWeight: '900',
                color: colors.text.primary,
                textAlign: 'center',
              }}
            >
              ¡Bien hecho!
            </Text>
            <Text variant="heading" tone="muted" numeric style={{ marginTop: spacing.sm }}>
              {duration}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
              tiempo total
            </Text>
          </Animated.View>
        </View>

        {/* ---- Global stats ---- */}
        <Card variant="raised" padding="xl" style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
            <View style={{ flex: 1, minWidth: 80 }}>
              <Stat label="Sets" value={totalSets} unit="" tone="info" />
            </View>
            <View style={{ flex: 1, minWidth: 80 }}>
              <Stat label="Reps" value={workout.totalReps} unit="" />
            </View>
            {workout.avgRestSeconds !== undefined && (
              <View style={{ flex: 1, minWidth: 80 }}>
                <Stat label="Desc. prom" value={Math.round(workout.avgRestSeconds)} unit="s" />
              </View>
            )}
          </View>

          {previousSession === null && (
            <View
              style={{
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text variant="caption" tone="muted">Primera sesión registrada</Text>
            </View>
          )}
        </Card>

        {/* ---- Progress congratulations ---- */}
        {hasProgress && (
          <Animated.View
            style={{
              opacity: progressOpacity,
              transform: [{ scale: progressScale }],
              marginBottom: spacing.lg,
              borderRadius: radius.lg + 2,
              ...(progress.prCount > 0 ? {
                borderWidth: 1.5,
                borderColor: 'rgba(255,215,0,0.75)',
                shadowColor: colors.medal.gold,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.45,
                shadowRadius: 12,
                elevation: 8,
              } : {}),
            }}
          >
            <Card variant="raised" padding="lg">
              <View style={{ alignItems: 'center', gap: spacing.sm }}>
                <Text
                  tracking="tight"
                  style={{
                    fontSize: fontSize.xl,
                    fontWeight: '800',
                    color: progress.prCount > 0 ? colors.medal.gold : colors.success,
                    textAlign: 'center',
                  }}
                >
                  {progress.prCount > 0
                    ? PROGRESS_PHRASES.pr
                    : progress.gainedWeight
                    ? PROGRESS_PHRASES.weight
                    : PROGRESS_PHRASES.reps}
                </Text>
                <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                  {progress.prCount > 0
                    ? `${progress.prCount} ${progress.prCount === 1 ? 'récord nuevo' : 'récords nuevos'}`
                    : `${progress.improvedCount} ${progress.improvedCount === 1 ? 'ejercicio mejorado' : 'ejercicios mejorados'}`}
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* ---- Per-exercise detail ---- */}
        {workout.exercises.map((ex, i) => {
          const comp = comparisons[i];
          const completedSets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
          const isPR = prs.has(ex.exerciseId);

          return (
            <Card key={ex.id} variant="raised" padding="md" style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <Text weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                  {ex.exerciseName}
                </Text>
                {isPR && (
                  <View
                    style={{
                      backgroundColor: colors.accent.soft,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: colors.accent.DEFAULT,
                    }}
                  >
                    <Text
                      variant="caption"
                      weight="bold"
                      style={{ color: colors.accent.DEFAULT }}
                    >
                      PR
                    </Text>
                  </View>
                )}
              </View>

              {/* Sets list */}
              <View style={{ gap: 4 }}>
                {completedSets.map((s, j) => (
                  <Text key={j} variant="caption" tone="secondary" numeric>
                    {j + 1}. {s.reps} reps · {formatWeight(s.weightKg, unit)}
                  </Text>
                ))}
              </View>

              {/* Comparison deltas */}
              {comp && comp.topWeightDelta !== null && (
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                  <Text
                    variant="caption"
                    style={{ color: comp.topWeightDelta >= 0 ? colors.success : colors.danger }}
                  >
                    {comp.topWeightDelta >= 0 ? '▲' : '▼'} {Math.abs(Number(toDisplay(comp.topWeightDelta, unit).toFixed(1).replace(/\.0$/, '')))} {unit} top
                  </Text>
                </View>
              )}
            </Card>
          );
        })}

        {/* ---- Actions ---- */}
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Button
            title="Publicar entreno"
            onPress={onPublishWithCaption}
            loading={publishing}
            fullWidth
          />
          <Button title="Listo" variant="secondary" size="lg" fullWidth onPress={onClose} />
        </View>
      </ScrollView>
    </View>
  );
}
