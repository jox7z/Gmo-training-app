import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, View, Pressable, Alert, Dimensions, ScrollView, Keyboard, KeyboardAvoidingView, Platform, InputAccessoryView, Modal, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [showSetSplash, setShowSetSplash] = useState(false);
  const [splashPhrase, setSplashPhrase] = useState('');
  const prevPhaseRef = useRef<Phase>('warmup');
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
  const splashAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Energetic full-screen splash with a phrase. Reused when entering a set
  // from rest and when the user swaps the exercise mid-session.
  const playSplash = useCallback((phrase: string) => {
    splashAnimationRef.current?.stop();
    if (reduceMotion) {
      setShowSetSplash(false);
      return;
    }
    setSplashPhrase(phrase);
    // Reset all values
    splashScale.setValue(0.72);
    splashOpacity.setValue(0);
    splashY.setValue(28);
    splashRing.setValue(0);
    splashPulse.setValue(1);
    setShowSetSplash(true);
    void runHapticSafely(() =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    );

    const animation = Animated.sequence([
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
    ]);
    splashAnimationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) setShowSetSplash(false);
    });
  }, [
    reduceMotion,
    splashOpacity,
    splashPulse,
    splashRing,
    splashScale,
    splashY,
  ]);

  useEffect(() => {
    const fromRest = prevPhaseRef.current === 'rest' && phase === 'set';
    prevPhaseRef.current = phase;

    if (reduceMotion) {
      heroScale.stopAnimation();
      heroOpacity.stopAnimation();
      accentProgress.stopAnimation();
      splashAnimationRef.current?.stop();
      heroScale.setValue(1);
      heroOpacity.setValue(1);
      accentProgress.setValue(0);
      setShowSetSplash(false);
      return;
    }

    // Reset state for incoming phase
    heroScale.setValue(0.88);
    heroOpacity.setValue(0);
    accentProgress.setValue(0);

    const animation = Animated.sequence([
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
    ]);
    animation.start();

    // Show energetic splash when entering set from rest (not the very first set)
    if (fromRest) {
      playSplash(SET_SPLASH_PHRASES[Math.floor(Math.random() * SET_SPLASH_PHRASES.length)]);
    }
    return () => animation.stop();
  }, [
    accentProgress,
    heroOpacity,
    heroScale,
    phase,
    playSplash,
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
    if (!previous) return;

    if (set.reps !== previous.reps || set.weightKg !== previous.weightKg) {
      updateSetById(exercise.id, set.id, {
        reps: previous.reps,
        weightKg: previous.weightKg,
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
    const isLivePr = latestWorkout
      ? detectSetPR(history, latestWorkout, exIdx, setIdx)
      : false;
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
    updateSetById(latestExercise.id, latestSet.id, {
      isCompleted: true,
      restStartedAt: new Date(startedAt).toISOString(),
      restAfterSeconds: undefined,
    });
    setRestStartedAt(startedAt);
    setRestElapsed(0);
    setPhase('rest');
  };

  // Cambia el ejercicio actual SOLO para esta sesión (máquina ocupada, etc.).
  // La rutina guardada no se modifica. El splash a pantalla completa cubre el
  // cambio de contenido, así que no hace falta re-disparar la transición del hero.
  const handleSwapSelect = (newExerciseId: string) => {
    setSwapOpen(false);
    setLivePr(null);
    const newIdx = swapExercise(exIdx, newExerciseId);
    setExIdx(newIdx);
    setSetIdx(0);
    const name = exerciseById(newExerciseId)?.name ?? 'el nuevo ejercicio';
    playSplash(`¡Vamos con ${name}!`);
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
    ? 'Ya descansé · Terminar workout'
    : exIdx < totalEx - 1 && setIdx === (currentEx?.sets.length ?? 1) - 1
      ? 'Ya descansé · Siguiente ejercicio'
      : 'Ya descansé · Siguiente serie';

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
            <Text
              variant="metric"
              style={{
                textAlign: 'center',
              }}
            >
              {splashPhrase}
            </Text>
            {/* Red accent pill beneath the phrase */}
            <View
              style={{
                width: 48,
                height: 3,
                backgroundColor: colors.primary.DEFAULT,
                marginTop: spacing.md,
                borderRadius: radius.sm,
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
          variant="eyebrow"
          tone="muted"
          style={{
            marginBottom: spacing.md,
          }}
        >
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
        <Card variant="section" padding="xl">
          <Text
            variant="eyebrow"
            tone="muted"
            style={{
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            CALENTAMIENTO
          </Text>
          <Text
            variant="metricLg"
            numeric
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
          variant="eyebrow"
          tone="brand"
          style={{
            textAlign: 'center',
            marginBottom: spacing.md,
          }}
        >
          SERIE {setNumber}/{totalSets}
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
          <Text
            variant="timer"
            numeric
            style={{
              textAlign: 'center',
            }}
          >
            {formatClock(elapsed)}
          </Text>
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs, letterSpacing: 1 }}>
            tiempo en la serie
          </Text>
        </View>

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
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg.elevated,
          }}
        >
          <Icon name="swap" size={14} color={colors.text.secondary} />
          <Text variant="caption" weight="semibold" tone="secondary">
            Cambiar ejercicio
          </Text>
        </PressableScale>
      </View>

      <Button title="Terminé la serie" variant="primary" size="lg" fullWidth onPress={onDone} />
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
                  <Card padding="md" style={{ marginBottom: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
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
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: spacing.md,
              paddingVertical: 5,
              borderRadius: radius.sm,
              backgroundColor: colors.primary.muted,
              borderWidth: 1,
              borderColor: colors.primary.DEFAULT,
            }}
          >
            <Text
              variant="caption"
              weight="bold"
              maxFontSizeMultiplier={1.4}
              style={{ color: colors.primary.DEFAULT }}
              numeric
            >
              Serie {setNumber}/{totalSets}
            </Text>
          </View>
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
          label={unit.toUpperCase()}
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
              padding: spacing.lg,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.primary.glow,
              backgroundColor: colors.primary.muted,
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
              <Icon name="barbell" size={spacing.xl} color={colors.primary.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subheading" weight="bold">
                Calculadora de discos
              </Text>
              <Text variant="caption" tone="secondary">
                Mira qué cargar por cada lado
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={spacing.lg}
              color={colors.primary.DEFAULT}
            />
          </PressableScale>
        ) : null}
        <BigStepperInput
          ref={repsInputRef}
          label="REPS"
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
        title="Guardar serie"
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

function RestPhrase() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const phraseOpacity = useRef(new Animated.Value(1)).current;
  const phraseScale   = useRef(new Animated.Value(1)).current;
  const phraseY       = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      phraseOpacity.stopAnimation();
      phraseScale.stopAnimation();
      phraseY.stopAnimation();
      phraseOpacity.setValue(1);
      phraseScale.setValue(1);
      phraseY.setValue(0);
      return;
    }
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
  }, [phraseOpacity, phraseScale, phraseY, reduceMotion]);

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
        variant="subheading"
        tone="secondary"
        style={{
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

  return (
    <>
      {/* Arriba: label + pills de la serie que viene */}
      <View>
        <Text
          variant="eyebrow"
          tone="muted"
          style={{
            textAlign: 'center',
            marginBottom: spacing.md,
          }}
        >
          DESCANSO
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

      {/* Centro: anillo de descanso + tarjeta de lo que sigue */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md }}>
        <RestRing elapsed={elapsed} size={Math.min(260, SCREEN_HEIGHT * 0.3)} />
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.md, textAlign: 'center', maxWidth: 260 }}
        >
          Descansa hasta sentirte completamente recuperado (2–5 min)
        </Text>

        {/* Qué toca después del descanso */}
        <Card variant="section" padding="md" style={{ alignSelf: 'stretch', marginTop: spacing.lg }}>
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
        <Card variant="section" padding="xl" style={{ marginBottom: spacing.lg }}>
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

        </Card>

        {/* ---- Per-exercise detail ---- */}
        {workout.exercises.map((ex) => {
          const completedSets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);

          return (
            <Card key={ex.id} variant="section" padding="md" style={{ marginBottom: spacing.sm }}>
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
