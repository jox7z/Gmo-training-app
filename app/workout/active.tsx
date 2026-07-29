import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Pressable, Alert, Dimensions, ScrollView, Keyboard, KeyboardAvoidingView, Platform, InputAccessoryView, Modal, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, spacing, radius } from '@/theme/tokens';
import { useRoutinesStore, RoutineDay } from '@/store/routines';
import { useWorkoutsStore, Workout, WorkoutExercise } from '@/store/workouts';
import { useAppStore, LOCAL_USER_ID } from '@/store/app';
import { useAchievementsStore, type UnlockedAchievement } from '@/store/achievements';
import { AchievementUnlockModal } from '@/components/achievements/AchievementUnlockModal';
import { exerciseById, EXERCISES, MUSCLE_FILTER_GROUPS, MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '@/data/exercises';
import { exerciseImage } from '@/data/exerciseImages';
import { formatDuration, toDisplay, fromDisplay, formatWeight } from '@/lib/units';
import { Icon } from '@/components/Icon';
import { saveWorkout } from '@/lib/repos/workouts';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  detectSetPR,
  getCarriedWeightForSet,
  getPreviousSetValue,
  type PreviousSetValue,
} from '@/lib/workoutCompare';
import { WorkoutHeader } from '@/components/workout/WorkoutHeader';
import { SetProgressPills } from '@/components/workout/SetProgressPills';
import { ExerciseHero } from '@/components/workout/ExerciseHero';
import { RestRing } from '@/components/workout/RestRing';
import {
  BigStepperInput,
  type BigStepperInputHandle,
} from '@/components/workout/BigStepperInput';
import { PreviousSetCompact } from '@/components/workout/PreviousSetCompact';
import { LivePrBanner } from '@/components/workout/LivePrBanner';
import {
  validateSetForCompletion,
  validateWorkoutForFinish,
} from '@/lib/workoutValidation';
import { PlateCalculatorModal } from '@/components/workout/PlateCalculatorModal';
import { GmoMascot } from '@/components/GmoMascot';
import { runHapticSafely } from '@/lib/haptics';
import { useReduceMotion } from '@/components/ui/useReduceMotion';
import { RestMascotCoach } from '@/components/workout/RestMascotCoach';
import { WorkoutMetric } from '@/components/workout/WorkoutMetric';
import { duration as motionDuration, spring as motionSpring } from '@/theme/motion';

const REST_PHRASES = [
  'Buen trabajo. Sigue así.',
  'Respira. La siguiente es tuya.',
  'Mantén el ritmo.',
  'Serie registrada.',
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Phase = 'warmup' | 'set' | 'log' | 'rest' | 'summary';

interface LivePrState {
  setId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
}

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function parseRestStartedAt(value: string | undefined): number | null {
  if (!value) return null;
  const startedAt = new Date(value).getTime();
  return Number.isFinite(startedAt) ? startedAt : null;
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

function getResumePosition(active: Workout): {
  exIdx: number;
  setIdx: number;
  phase: Extract<Phase, 'set' | 'log' | 'rest'>;
} {
  // Snapshots creados antes de la validación inmediata pueden contener una
  // serie marcada completa con datos inválidos. Se abre el editor primero para
  // que el usuario pueda repararla y terminar la sesión sin quedar bloqueado.
  for (let exerciseIndex = 0; exerciseIndex < active.exercises.length; exerciseIndex += 1) {
    const invalidCompletedSetIndex = active.exercises[exerciseIndex].sets.findIndex(
      (set) => set.isCompleted && validateSetForCompletion(set).length > 0,
    );
    if (invalidCompletedSetIndex >= 0) {
      return { exIdx: exerciseIndex, setIdx: invalidCompletedSetIndex, phase: 'log' };
    }
  }

  for (let exerciseIndex = 0; exerciseIndex < active.exercises.length; exerciseIndex += 1) {
    const openRestSetIndex = active.exercises[exerciseIndex].sets.findIndex(
      (set) => set.isCompleted && parseRestStartedAt(set.restStartedAt) !== null,
    );
    if (openRestSetIndex >= 0) {
      return { exIdx: exerciseIndex, setIdx: openRestSetIndex, phase: 'rest' };
    }
  }

  for (let exerciseIndex = 0; exerciseIndex < active.exercises.length; exerciseIndex += 1) {
    const pendingSetIndex = active.exercises[exerciseIndex].sets.findIndex(
      (set) => !set.isCompleted,
    );
    if (pendingSetIndex >= 0) {
      return { exIdx: exerciseIndex, setIdx: pendingSetIndex, phase: 'set' };
    }
  }

  const lastExerciseIndex = Math.max(0, active.exercises.length - 1);
  const lastSetIndex = Math.max(
    0,
    (active.exercises[lastExerciseIndex]?.sets.length ?? 1) - 1,
  );
  return { exIdx: lastExerciseIndex, setIdx: lastSetIndex, phase: 'rest' };
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
  const addWorkoutDay = useAppStore((s) => s.addWorkoutDay);
  const addPoints = useAppStore((s) => s.addPoints);

  const routines = useRoutinesStore((s) => s.routines);
  const active = useWorkoutsStore((s) => s.active);
  const history = useWorkoutsStore((s) => s.history);
  const routine =
    routines.find((item) => item.id === routineId) ??
    routines.find((item) =>
      item.days.some((routineDay) => routineDay.id === active?.routineDayId),
    );
  // Día seleccionado para HOY: arranca en el día sugerido, pero el usuario
  // puede cambiarlo durante el calentamiento (solo afecta esta sesión).
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(
    dayId ?? active?.routineDayId,
  );
  const day = routine?.days.find((d) => d.id === selectedDayId) ?? routine?.days[0];

  const startWorkout = useWorkoutsStore((s) => s.startWorkout);
  const updateSetById = useWorkoutsStore((s) => s.updateSetById);
  const completeSetAndCarryWeightById = useWorkoutsStore(
    (s) => s.completeSetAndCarryWeightById,
  );
  const finishWorkout = useWorkoutsStore((s) => s.finishWorkout);
  const cancelWorkout = useWorkoutsStore((s) => s.cancelWorkout);
  const swapExercise = useWorkoutsStore((s) => s.swapExercise);

  const initialResumePosition = active ? getResumePosition(active) : null;
  const [phase, setPhase] = useState<Phase>(initialResumePosition?.phase ?? 'warmup');
  const [swapOpen, setSwapOpen] = useState(false);
  const [summaryWorkout, setSummaryWorkout] = useState<Workout | null>(null);
  const [unlockQueue, setUnlockQueue] = useState<UnlockedAchievement[]>([]);
  const [exIdx, setExIdx] = useState(initialResumePosition?.exIdx ?? 0);
  const [setIdx, setSetIdx] = useState(initialResumePosition?.setIdx ?? 0);
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [restElapsed, setRestElapsed] = useState(0);
  const [setStartedAt, setSetStartedAt] = useState<number | null>(null);
  const [setTimerElapsed, setSetTimerElapsed] = useState(0);
  const [warmupStartedAt, setWarmupStartedAt] = useState<number | null>(null);
  const [warmupElapsed, setWarmupElapsed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [livePr, setLivePr] = useState<LivePrState | null>(null);
  const restoredWorkoutId = useRef<string | null>(null);
  const autofillWorkoutId = useRef<string | null>(null);
  const enteredSetIds = useRef(new Set<string>());
  const editedSetIds = useRef(new Set<string>());
  const reduceMotion = useReduceMotion();

  // Transición breve de fase. Sin sweep, halo ni splash.
  const heroScale   = useRef(new Animated.Value(1)).current;
  const heroOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      heroScale.stopAnimation();
      heroOpacity.stopAnimation();
      heroScale.setValue(1);
      heroOpacity.setValue(1);
      return;
    }

    heroScale.setValue(0.98);
    heroOpacity.setValue(0);

    const animation = Animated.parallel([
      Animated.spring(heroScale, {
        toValue: 1,
        damping: motionSpring.enter.damping,
        stiffness: motionSpring.enter.stiffness,
        mass: motionSpring.enter.mass,
        useNativeDriver: true,
      }),
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: motionDuration.fast,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [
    heroOpacity,
    heroScale,
    phase,
    reduceMotion,
  ]);

  // Start warmup timer on mount
  useEffect(() => {
    const now = Date.now();
    setWarmupStartedAt(now);
    setWarmupElapsed(0);
  }, []);

  // Un descanso persistido gana prioridad sobre la primera serie pendiente.
  // Sin timestamp abierto no se inventa un descanso nuevo al restaurar.
  useEffect(() => {
    if (!active || restoredWorkoutId.current === active.id) return;
    const position = getResumePosition(active);
    restoredWorkoutId.current = active.id;
    setExIdx(position.exIdx);
    setSetIdx(position.setIdx);
    setPhase(position.phase);
    if (position.phase === 'rest') {
      const storedStartedAt = parseRestStartedAt(
        active.exercises[position.exIdx]?.sets[position.setIdx]?.restStartedAt,
      );
      setRestStartedAt(storedStartedAt);
      setRestElapsed(
        storedStartedAt !== null
          ? Math.max(0, Math.floor((Date.now() - storedStartedAt) / 1000))
          : 0,
      );
    } else {
      setRestStartedAt(null);
      setRestElapsed(0);
    }
  }, [active]);

  // Autofill solo en la primera entrada a una serie creada en esta pantalla.
  // Un workout ya persistido nunca es elegible: no existe metadata suficiente
  // para distinguir defaults de valores editados antes de cerrar la app.
  useEffect(() => {
    if (phase !== 'set' || !active || active.id !== autofillWorkoutId.current) return;

    const exercise = active.exercises[exIdx];
    const set = exercise?.sets[setIdx];
    if (!exercise || !set) return;

    const entryId = `${active.id}:${set.id}`;
    if (enteredSetIds.current.has(entryId)) return;
    enteredSetIds.current.add(entryId);

    if (set.isCompleted || set.isWarmup || editedSetIds.current.has(entryId)) return;

    const workingSetIndex = exercise.sets
      .slice(0, setIdx)
      .filter((candidate) => !candidate.isWarmup).length;
    const previous = getPreviousSetValue(
      history,
      active,
      exercise.exerciseId,
      workingSetIndex,
    );
    const carriedWeightKg = getCarriedWeightForSet(
      exercise,
      set.id,
      new Set(
        [...editedSetIds.current]
          .filter((id) => id.startsWith(`${active.id}:`))
          .map((id) => id.slice(active.id.length + 1)),
      ),
    );
    if (!previous && carriedWeightKg === null) return;

    const nextReps = previous?.reps ?? set.reps;
    const nextWeightKg = carriedWeightKg ?? previous?.weightKg ?? set.weightKg;
    if (set.reps !== nextReps || set.weightKg !== nextWeightKg) {
      updateSetById(exercise.id, set.id, {
        reps: nextReps,
        weightKg: nextWeightKg,
      });
    }
  }, [active, exIdx, history, phase, setIdx, updateSetById]);

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
    if (phase !== 'rest' || restStartedAt === null) return;
    const t = setInterval(() => {
      setRestElapsed(
        Math.max(0, Math.floor((Date.now() - restStartedAt) / 1000)),
      );
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

  // ---- derived state ----
  const currentEx = active?.exercises[exIdx];
  const currentSet = currentEx?.sets[setIdx];
  const totalEx = active?.exercises.length ?? 0;
  const isLastSet =
    !!active &&
    exIdx === totalEx - 1 &&
    setIdx === (currentEx?.sets.length ?? 1) - 1;
  const workingSetIndex = currentEx
    ? currentEx.sets
        .slice(0, setIdx)
        .filter((candidate) => !candidate.isWarmup).length
    : -1;
  const previousSet =
    active && currentEx && currentSet && !currentSet.isWarmup
      ? getPreviousSetValue(
          history,
          active,
          currentEx.exerciseId,
          workingSetIndex,
        )
      : null;

  if (!profile || (!active && !summaryWorkout && (!routine || !day))) {
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

  // ---- handlers ----

  const handleWarmupDone = () => {
    if (active) {
      const position = getResumePosition(active);
      setExIdx(position.exIdx);
      setSetIdx(position.setIdx);
      setPhase(position.phase);
      const storedStartedAt =
        position.phase === 'rest'
          ? parseRestStartedAt(
              active.exercises[position.exIdx]?.sets[position.setIdx]?.restStartedAt,
            )
          : null;
      setRestStartedAt(storedStartedAt);
      setRestElapsed(
        storedStartedAt !== null
          ? Math.max(0, Math.floor((Date.now() - storedStartedAt) / 1000))
          : 0,
      );
      return;
    }
    if (!routine || !day) return;
    startWorkout({
      routineDayId: day.id,
      routineName: `${routine.name} · ${day.name}`,
      exercises: day.exercises.map((e) => {
        const ex = exerciseById(e.exerciseId);
        const isBodyweight = ex?.equipment === 'bodyweight';
        return {
          id: '',
          exerciseId: e.exerciseId,
          exerciseName: ex?.name ?? e.exerciseId,
          muscleGroup: ex?.muscle ?? 'core',
          sets: Array.from({ length: e.targetSets }, () => ({
            id: Math.random().toString(36).slice(2),
            reps: e.targetRepsMin,
            weightKg: isBodyweight ? 0 : 20,
            isCompleted: false,
          })),
        };
      }),
    });
    const started = useWorkoutsStore.getState().active;
    if (started) {
      autofillWorkoutId.current = started.id;
      enteredSetIds.current.clear();
      editedSetIds.current.clear();
    }
    setPhase('set');
  };

  const handleSetDone = () => {
    // Capture duration; transition to log to review reps+weight
    if (setStartedAt && currentEx && currentSet) {
      const secs = Math.max(0, Math.round((Date.now() - setStartedAt) / 1000));
      updateSetById(currentEx.id, currentSet.id, { durationSeconds: secs });
    }
    setPhase('log');
  };

  const handleLogSave = () => {
    const latestExercise = useWorkoutsStore.getState().active?.exercises[exIdx];
    const latestSet = latestExercise?.sets[setIdx];
    if (!latestExercise || !latestSet) return;
    const wasCompleted = latestSet.isCompleted;
    const hasInvalidDuration =
      latestSet.durationSeconds !== undefined &&
      (!Number.isFinite(latestSet.durationSeconds) || latestSet.durationSeconds < 0);
    const setToValidate = hasInvalidDuration
      ? { ...latestSet, durationSeconds: undefined }
      : latestSet;
    if (hasInvalidDuration) {
      // `durationSeconds` no es editable en Log. Los snapshots antiguos que
      // contengan un valor imposible se sanea a "sin dato" para no bloquear.
      updateSetById(latestExercise.id, latestSet.id, {
        durationSeconds: undefined,
      });
    }
    const setErrors = validateSetForCompletion(setToValidate);
    if (setErrors.length) {
      Alert.alert('Revisa la serie', setErrors.join('\n'));
      return;
    }

    if (wasCompleted) {
      const repairedWorkout = useWorkoutsStore.getState().active;
      if (!repairedWorkout) return;
      const position = getResumePosition(repairedWorkout);
      setExIdx(position.exIdx);
      setSetIdx(position.setIdx);
      setPhase(position.phase);
      const storedStartedAt =
        position.phase === 'rest'
          ? parseRestStartedAt(
              repairedWorkout.exercises[position.exIdx]?.sets[position.setIdx]?.restStartedAt,
            )
          : null;
      setRestStartedAt(storedStartedAt);
      setRestElapsed(
        storedStartedAt !== null
          ? Math.max(0, Math.floor((Date.now() - storedStartedAt) / 1000))
          : 0,
      );
      return;
    }

    const latestWorkout = useWorkoutsStore.getState().active;
    if (!latestWorkout) return;
    const isLivePr = detectSetPR(history, latestWorkout, exIdx, setIdx);
    if (isLivePr) {
      setLivePr({
        setId: latestSet.id,
        exerciseName: latestExercise.exerciseName,
        weightKg: latestSet.weightKg,
        reps: latestSet.reps,
      });
    } else {
      setLivePr(null);
      void runHapticSafely(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      );
    }
    const startedAt = Date.now();
    const protectedSetIds = [...editedSetIds.current]
      .filter((id) => id.startsWith(`${latestWorkout.id}:`))
      .map((id) => id.slice(latestWorkout.id.length + 1));
    const didComplete = completeSetAndCarryWeightById(
      latestExercise.id,
      latestSet.id,
      new Date(startedAt).toISOString(),
      protectedSetIds,
    );
    if (!didComplete) return;
    setRestStartedAt(startedAt);
    setRestElapsed(0);
    setPhase('rest');
  };

  // Cambia el ejercicio actual SOLO para esta sesión (máquina ocupada, etc.).
  // La rutina guardada no se modifica.
  const handleSwapSelect = (newExerciseId: string) => {
    setSwapOpen(false);
    setLivePr(null);
    const newIdx = swapExercise(exIdx, newExerciseId);
    setExIdx(newIdx);
    setSetIdx(0);
  };

  const advancePosition = () => {
    if (!currentEx) return;
    if (setIdx + 1 < currentEx.sets.length) {
      setSetIdx(setIdx + 1);
    } else if (exIdx + 1 < totalEx) {
      setExIdx(exIdx + 1);
      setSetIdx(0);
    }
  };

  const captureRest = () => {
    const restingExercise =
      useWorkoutsStore.getState().active?.exercises[exIdx];
    const restingSet = restingExercise?.sets[setIdx];
    const storedStartedAt = parseRestStartedAt(restingSet?.restStartedAt);
    if (!restingExercise || !restingSet || storedStartedAt === null) return;

    const secs = Math.max(0, Math.round((Date.now() - storedStartedAt) / 1000));
    updateSetById(restingExercise.id, restingSet.id, {
      restAfterSeconds: secs,
      restStartedAt: undefined,
    });
  };

  const handleNext = () => {
    captureRest();
    setLivePr(null);
    setRestStartedAt(null);
    setRestElapsed(0);
    advancePosition();
    setPhase('set');
  };

  const finalize = () => {
    const current = useWorkoutsStore.getState().active;
    if (!current) return;
    const validation = validateWorkoutForFinish(current);
    if (!validation.canFinish) {
      const repairPosition = getResumePosition(current);
      if (repairPosition.phase === 'log') {
        setExIdx(repairPosition.exIdx);
        setSetIdx(repairPosition.setIdx);
        setPhase('log');
      }
      Alert.alert('Revisa el entrenamiento', validation.errors.slice(0, 3).join('\n'));
      return;
    }
    if (phase === 'rest') captureRest();
    const finished = finishWorkout({ feeling: 'good' });
    if (finished) {
      addWorkoutDay();
      addPoints(10);
      void runHapticSafely(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      );
      setSummaryWorkout(finished);
      setPhase('summary');

      // Reevalúa logros con el historial ya actualizado y encola los nuevos
      // para celebrarlos sobre la pantalla de resumen.
      const newUnlocks = useAchievementsStore.getState().sync({
        history: useWorkoutsStore.getState().history,
        weeklyGoalDays: useAppStore.getState().profile?.weeklyGoalDays,
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
      const current = useWorkoutsStore.getState().active;
      if (!current) return;
      const validation = validateWorkoutForFinish(current);
      if (!validation.canFinish) {
        const repairPosition = getResumePosition(current);
        if (repairPosition.phase === 'log') {
          setExIdx(repairPosition.exIdx);
          setSetIdx(repairPosition.setIdx);
          setPhase('log');
        }
        Alert.alert('Revisa el entrenamiento', validation.errors.slice(0, 3).join('\n'));
        return;
      }
      const pendingMessage = validation.warnings.length
        ? `\n\n${validation.warnings.join(' ')}`
        : '';
      Alert.alert(
        'Terminar entrenamiento',
        `¿Confirmas que terminaste?${pendingMessage}`,
        [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, terminar', onPress: finalize },
        ],
      );
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
    ? 'Finalizar'
    : exIdx < totalEx - 1 && setIdx === (currentEx?.sets.length ?? 1) - 1
      ? 'Siguiente ejercicio'
      : 'Siguiente serie';

  // ---- header context text ----
  let headerContext = routine?.name ?? active?.routineName ?? 'Entrenamiento';
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

  return (
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

      <View style={{ height: 1, backgroundColor: colors.border }} />

      {/* Phase content — centred, fills remaining space */}
      <Animated.View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 600,
          alignSelf: 'center',
          minHeight: 0,
          opacity: heroOpacity,
          transform: [{ scale: heroScale }],
          paddingHorizontal: spacing.lg,
          justifyContent: 'space-between',
          paddingBottom: insets.bottom + spacing.xl,
          paddingTop: spacing.xl,
        }}
      >
        {phase === 'warmup' && routine && day && (
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
            previousSet={previousSet}
            unit={profile.unit}
            onDone={handleSetDone}
            onSwap={() => setSwapOpen(true)}
            onOpenDetails={() =>
              router.push(`/exercise/${currentEx.exerciseId}` as Href)
            }
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
            previousSet={previousSet}
            onWeightChange={(v) => {
              editedSetIds.current.add(`${active.id}:${currentSet.id}`);
              updateSetById(currentEx.id, currentSet.id, {
                weightKg: fromDisplay(v, profile.unit),
              });
            }}
            onPlateWeightApply={(weightKg) => {
              editedSetIds.current.add(`${active.id}:${currentSet.id}`);
              updateSetById(currentEx.id, currentSet.id, { weightKg });
            }}
            onRepsChange={(v) => {
              editedSetIds.current.add(`${active.id}:${currentSet.id}`);
              updateSetById(currentEx.id, currentSet.id, { reps: v });
            }}
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
            livePr={livePr}
            unit={profile.unit}
            onDismissLivePr={() => setLivePr(null)}
            onConfirm={handleRestConfirm}
          />
        )}
      </Animated.View>

      {/* Cambio de ejercicio solo para esta sesión */}
      <SwapExerciseModal
        visible={swapOpen}
        currentExerciseId={currentEx?.exerciseId ?? ''}
        usedExerciseIds={usedExerciseIds}
        onClose={() => setSwapOpen(false)}
        onSelect={handleSwapSelect}
      />
    </View>
  );
}

// ---- Phase components ----

// Chip de día con "pop" elástico al quedar seleccionado.
function DayChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (active) {
      if (reduceMotion) {
        scale.stopAnimation();
        scale.setValue(1);
        return;
      }
      scale.setValue(0.9);
      const animation = Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      });
      animation.start();
      return () => animation.stop();
    }
  }, [active, reduceMotion, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 18,
          borderRadius: radius.sm,
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
  const reduceMotion = useReduceMotion();

  // El preview de ejercicios entra con fade + slide cada vez que cambia el día.
  const previewOpacity = useRef(new Animated.Value(1)).current;
  const previewY = useRef(new Animated.Value(0)).current;
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduceMotion) {
      previewOpacity.stopAnimation();
      previewY.stopAnimation();
      previewOpacity.setValue(1);
      previewY.setValue(0);
      return;
    }
    previewOpacity.setValue(0);
    previewY.setValue(14);
    const animation = Animated.parallel([
      Animated.timing(previewOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(previewY, { toValue: 0, friction: 6, tension: 140, useNativeDriver: true }),
    ]);
    animation.start();
    void runHapticSafely(() => Haptics.selectionAsync());
    return () => animation.stop();
  }, [previewOpacity, previewY, reduceMotion, selectedDayId]);

  const previewExercises = selDay?.exercises.slice(0, 4) ?? [];
  const extraCount = Math.max(0, (selDay?.exercises.length ?? 0) - previewExercises.length);

  return (
    <>
      {/* Selector de día — por si hoy toca improvisar */}
      <View>
        <Text
          variant="caption"
          weight="semibold"
          tone="muted"
          style={{
            marginBottom: spacing.md,
          }}
        >
          Hoy
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

      {/* Cronómetro y preview abiertos: el espacio crea la jerarquía. */}
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: spacing.lg }}>
        <View style={{ paddingVertical: spacing.xl }}>
          <Text
            variant="caption"
            weight="semibold"
            tone="muted"
            style={{
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            Calentamiento
          </Text>
          <Text
            variant="metricLg"
            numeric
            style={{
              color: colors.text.primary,
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
        </View>
      </View>

      <Button title="Empezar" variant="primary" size="lg" fullWidth onPress={onDone} />
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
  previousSet,
  unit,
  onDone,
  onSwap,
  onOpenDetails,
}: {
  exerciseId: string;
  exerciseName: string;
  subtitle?: string;
  setNumber: number;
  totalSets: number;
  completedCount: number;
  elapsed: number;
  previousSet: PreviousSetValue | null;
  unit: 'kg' | 'lb';
  onDone: () => void;
  onSwap: () => void;
  onOpenDetails: () => void;
}) {
  return (
    <>
      {/* Arriba: serie actual + pills de progreso */}
      <View>
        <Text
          variant="heading"
          style={{
            textAlign: 'center',
            marginBottom: spacing.md,
          }}
        >
          Serie {setNumber} de {totalSets}
        </Text>
        <SetProgressPills total={totalSets} current={setNumber - 1} completedCount={completedCount} />
        <View style={{ marginTop: spacing.md }}>
          <PreviousSetCompact value={previousSet} unit={unit} />
        </View>
      </View>

      {/* Centro: hero con imagen del ejercicio + chip del cronómetro */}
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.lg }}>
        <PressableScale
          onPress={onOpenDetails}
          accessibilityRole="button"
          accessibilityLabel={`Abrir información e historial de ${exerciseName}`}
          accessibilityHint="Muestra instrucciones, sesiones y récords del ejercicio"
          haptic={false}
          pressScale={0.985}
          style={{ flex: 1, flexShrink: 1, maxHeight: SCREEN_HEIGHT * 0.42, minHeight: 160 }}
        >
          <ExerciseHero
            exerciseId={exerciseId}
            name={exerciseName}
            subtitle={subtitle}
            style={{ flex: 1 }}
          />
        </PressableScale>

        <WorkoutMetric
          label="Tiempo"
          value={formatClock(elapsed)}
          align="center"
          prominent
        />

        {/* ¿Máquina ocupada? Cambia el ejercicio solo por hoy */}
        <PressableScale
          onPress={onSwap}
          accessibilityRole="button"
          accessibilityLabel="Cambiar ejercicio"
          accessibilityHint="Elige otro ejercicio solo para esta sesión"
          hitSlop={8}
          haptic={false}
          pressScale={0.97}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'center',
            gap: spacing.sm,
            minHeight: 44,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Icon name="swap" size={14} color={colors.text.secondary} />
          <Text variant="caption" weight="semibold" tone="secondary">
            Cambiar ejercicio
          </Text>
        </PressableScale>
      </View>

      <Button title="Registrar" variant="primary" size="lg" fullWidth onPress={onDone} />
    </>
  );
}

// ---- Swap exercise modal (cambio solo para esta sesión) ----

function SwapExerciseModal({
  visible,
  currentExerciseId,
  usedExerciseIds,
  onClose,
  onSelect,
}: {
  visible: boolean;
  currentExerciseId: string;
  usedExerciseIds: string[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const current = exerciseById(currentExerciseId);
  const defaultGroup = useMemo(
    () => MUSCLE_FILTER_GROUPS.find((g) => current && g.muscles.includes(current.muscle))?.id ?? 'all',
    [current],
  );
  const [group, setGroup] = useState(defaultGroup);

  // Cada vez que se abre, arranca filtrado por el músculo del ejercicio actual.
  useEffect(() => {
    if (visible) setGroup(defaultGroup);
  }, [visible, defaultGroup]);

  const filtered = useMemo(() => {
    const g = MUSCLE_FILTER_GROUPS.find((x) => x.id === group);
    let list = EXERCISES.filter(
      (e) => e.id !== currentExerciseId && !usedExerciseIds.includes(e.id),
    );
    if (g && g.muscles.length > 0) {
      list = list.filter((e) => g.muscles.includes(e.muscle));
    }
    if (current) {
      // Mismo músculo exacto primero: son los reemplazos más naturales.
      list = [...list].sort(
        (a, b) => Number(b.muscle === current.muscle) - Number(a.muscle === current.muscle),
      );
    }
    return list;
  }, [group, currentExerciseId, usedExerciseIds, current]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.bg.base,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            height: '85%',
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="title">Cambiar ejercicio</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Icon name="close" size={18} color={colors.text.muted} />
            </Pressable>
          </View>
          <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
            Solo para esta sesión — tu rutina queda igual.
          </Text>

          {/* Filtros de grupo muscular */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: spacing.md, flexGrow: 0 }}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {MUSCLE_FILTER_GROUPS.map((g) => {
              const active = g.id === group;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setGroup(g.id)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: radius.sm,
                    backgroundColor: active ? colors.primary.DEFAULT : colors.bg.elevated,
                    borderWidth: 1,
                    borderColor: active ? colors.primary.DEFAULT : colors.border,
                  }}
                >
                  <Text variant="caption" weight="bold" tone={active ? 'primary' : 'secondary'}>
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <FlatList
            data={filtered}
            keyExtractor={(e) => e.id}
            style={{ marginTop: spacing.md, flex: 1 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const img = exerciseImage(item.id);
              const sameMuscle = current && item.muscle === current.muscle;
              return (
                <Pressable onPress={() => onSelect(item.id)}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      minHeight: 64,
                      paddingVertical: spacing.sm,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
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
                      <View style={{ flex: 1 }}>
                        <Text weight="semibold" numberOfLines={1}>{item.name}</Text>
                        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                          {MUSCLE_GROUP_LABELS[item.muscle]} · {EQUIPMENT_LABELS[item.equipment]}
                        </Text>
                      </View>
                      {sameMuscle && (
                        <View
                          style={{
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 3,
                            borderRadius: radius.sm,
                            backgroundColor: colors.bg.raised,
                          }}
                        >
                          <Text variant="caption" weight="semibold" tone="secondary">
                            Equivalente
                          </Text>
                        </View>
                      )}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
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
  previousSet,
  onWeightChange,
  onPlateWeightApply,
  onRepsChange,
  onSave,
}: {
  set: { reps: number; weightKg: number };
  unit: 'kg' | 'lb';
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  previousSet: PreviousSetValue | null;
  onWeightChange: (v: number) => void;
  onPlateWeightApply: (weightKg: number) => void;
  onRepsChange: (v: number) => void;
  onSave: () => void;
}) {
  const displayWeight = toDisplay(set.weightKg, unit);
  const [plateCalculatorOpen, setPlateCalculatorOpen] = useState(false);
  const weightInputRef = useRef<BigStepperInputHandle>(null);
  const repsInputRef = useRef<BigStepperInputHandle>(null);
  const supportsPlateCalculator =
    exerciseById(exerciseId)?.equipment === 'barbell';
  const saveLatestDrafts = () => {
    const weightValid = weightInputRef.current?.commit() ?? false;
    const repsValid = repsInputRef.current?.commit() ?? false;
    if (!weightValid || !repsValid) return;
    Keyboard.dismiss();
    onSave();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar teclado"
              onPress={Keyboard.dismiss}
              hitSlop={8}
            >
              <Text variant="subheading" tone="brand">
                Listo
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}

      {/* Contexto compacto: qué ejercicio y qué serie se está registrando */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <ExerciseThumb exerciseId={exerciseId} size={44} />
        <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
          <Text variant="heading" numberOfLines={2}>
            {exerciseName}
          </Text>
          <Text
            variant="caption"
            tone="secondary"
            maxFontSizeMultiplier={1.4}
            numeric
          >
            Serie {setNumber} de {totalSets}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: spacing.md }}>
        <PreviousSetCompact value={previousSet} unit={unit} />
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
        <BigStepperInput
          ref={weightInputRef}
          label={`Peso · ${unit}`}
          value={displayWeight}
          step={unit === 'kg' ? 2.5 : 5}
          decimals={unit === 'kg' ? 1 : 0}
          min={0}
          max={toDisplay(1000, unit)}
          onChange={onWeightChange}
          accessoryId={LOG_ACCESSORY_ID}
        />
        {supportsPlateCalculator ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Abrir calculadora de discos"
            accessibilityHint="Calcula los discos necesarios por cada lado de la barra"
            onPress={() => {
              Keyboard.dismiss();
              setPlateCalculatorOpen(true);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: 44,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.md,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: spacing['3xl'],
                height: spacing['3xl'],
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bg.elevated,
              }}
            >
              <Icon name="barbell" size={spacing.xl} color={colors.text.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subheading" weight="bold">
                Discos
              </Text>
              <Text variant="caption" tone="secondary">
                Mira qué cargar por cada lado
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={spacing.lg}
              color={colors.text.secondary}
            />
          </PressableScale>
        ) : null}
        <BigStepperInput
          ref={repsInputRef}
          label="Reps"
          value={set.reps}
          step={1}
          decimals={0}
          min={1}
          max={999}
          onChange={onRepsChange}
          accessoryId={LOG_ACCESSORY_ID}
        />
      </ScrollView>

      <Button
        title="Guardar"
        variant="primary"
        size="lg"
        fullWidth
        onPress={saveLatestDrafts}
      />
      <PlateCalculatorModal
        visible={plateCalculatorOpen}
        unit={unit}
        currentWeightKg={set.weightKg}
        onClose={() => setPlateCalculatorOpen(false)}
        onApplyWeightKg={onPlateWeightApply}
      />
    </KeyboardAvoidingView>
  );
}

function RestPhase({
  elapsed,
  nextLabel,
  next,
  currentExercise,
  currentSetIdx,
  livePr,
  unit,
  onDismissLivePr,
  onConfirm,
}: {
  elapsed: number;
  nextLabel: string;
  next: { exercise: WorkoutExercise; setNumber: number; totalSets: number } | null;
  currentExercise: WorkoutExercise;
  currentSetIdx: number;
  livePr: LivePrState | null;
  unit: 'kg' | 'lb';
  onDismissLivePr: () => void;
  onConfirm: () => void;
}) {
  // Pills de lo que viene; si era la última serie del workout, mostramos el
  // ejercicio actual ya completo.
  const pillsEx = next ? next.exercise : currentExercise;
  const pillsTotal = next ? next.totalSets : currentExercise.sets.length;
  const pillsCurrent = next ? next.setNumber - 1 : currentSetIdx;
  const pillsCompleted = pillsEx.sets.filter((s) => s.isCompleted).length;
  const phrase =
    REST_PHRASES[
      (currentSetIdx + currentExercise.exerciseId.length) % REST_PHRASES.length
    ];

  return (
    <>
      {/* Arriba: label + pills de la serie que viene */}
      <View>
        <Text
          variant="heading"
          tone="muted"
          style={{
            textAlign: 'center',
            marginBottom: spacing.md,
          }}
        >
          Descanso
        </Text>
        <SetProgressPills total={pillsTotal} current={pillsCurrent} completedCount={pillsCompleted} />
        {livePr && (
          <View style={{ marginTop: spacing.md }}>
            <LivePrBanner
              key={livePr.setId}
              exerciseName={livePr.exerciseName}
              weightKg={livePr.weightKg}
              reps={livePr.reps}
              unit={unit}
              onDismiss={onDismissLivePr}
            />
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, alignSelf: 'stretch', minHeight: 0 }}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
      >
        <RestMascotCoach
          phrase={phrase}
          mascotSize={Math.max(88, Math.min(96, SCREEN_HEIGHT * 0.11))}
          style={{ paddingVertical: spacing.sm }}
        />
        <RestRing
          elapsed={elapsed}
          size={Math.max(152, Math.min(200, SCREEN_HEIGHT * 0.23))}
        />

        <View
          style={{
            alignSelf: 'stretch',
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
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
                Serie {next.setNumber} de {next.totalSets}
              </Text>
            </View>
          ) : (
            <Text weight="semibold" style={{ textAlign: 'center' }}>
              Entreno listo para cerrar
            </Text>
          )}
        </View>
      </ScrollView>

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
  const [publishing] = useState(false);
  const reduceMotion = useReduceMotion();

  // Success animation: ring scales+pulses in
  const ringScale   = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const checkScale  = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      ringScale.stopAnimation();
      ringOpacity.stopAnimation();
      checkScale.stopAnimation();
      textOpacity.stopAnimation();
      ringScale.setValue(1);
      ringOpacity.setValue(1);
      checkScale.setValue(1);
      textOpacity.setValue(1);
      return;
    }
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [
    checkScale,
    reduceMotion,
    ringOpacity,
    ringScale,
    textOpacity,
  ]);

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
              width: 132,
              height: 132,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
              marginBottom: spacing.lg,
            }}
          >
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <GmoMascot
                size={128}
                accessibilityLabel="GMO celebra tu entrenamiento completado"
              />
            </Animated.View>
          </Animated.View>

          <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
            <Text
              variant="title"
              weight="black"
              style={{
                textAlign: 'center',
              }}
            >
              Entreno guardado
            </Text>
            <Text variant="heading" tone="muted" numeric style={{ marginTop: spacing.sm }}>
              {duration}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
              tiempo total
            </Text>
          </Animated.View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.xl,
            paddingVertical: spacing.xl,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.lg,
          }}
        >
            <View style={{ flex: 1, minWidth: 80 }}>
              <WorkoutMetric label="Series" value={totalSets} compact />
            </View>
            <View style={{ flex: 1, minWidth: 80 }}>
              <WorkoutMetric label="Reps" value={workout.totalReps} compact />
            </View>
            {workout.avgRestSeconds !== undefined && (
              <View style={{ flex: 1, minWidth: 80 }}>
                <WorkoutMetric
                  label="Descanso medio"
                  value={Math.round(workout.avgRestSeconds)}
                  unit="s"
                  compact
                />
              </View>
            )}
        </View>

        {/* ---- Per-exercise detail ---- */}
        {workout.exercises.map((ex) => {
          const completedSets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);

          return (
            <View
              key={ex.id}
              style={{
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <Text weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                  {ex.exerciseName}
                </Text>
                <Text variant="caption" tone="muted" numeric>
                  {completedSets.length} {completedSets.length === 1 ? 'serie' : 'series'}
                </Text>
              </View>

              {/* Sets list */}
              <View style={{ gap: 4 }}>
                {completedSets.map((s, j) => (
                  <Text key={j} variant="caption" tone="secondary" numeric>
                    {j + 1}. {s.reps} reps · {formatWeight(s.weightKg, unit)}
                  </Text>
                ))}
              </View>
            </View>
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
