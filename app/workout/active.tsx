import { useEffect, useRef, useState } from 'react';
import { Animated, View, Pressable, Alert, TextInput, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { colors, spacing, radius, fontSize } from '@/theme/tokens';
import { useRoutinesStore } from '@/store/routines';
import { useWorkoutsStore, Workout } from '@/store/workouts';
import { useAppStore, LOCAL_USER_ID } from '@/store/app';
import { exerciseById } from '@/data/exercises';
import { formatDuration, toDisplay, fromDisplay } from '@/lib/units';
import { Icon } from '@/components/Icon';
import { saveWorkout } from '@/lib/repos/workouts';
import { isSupabaseConfigured } from '@/lib/supabase';

const REST_GREEN_FROM = 120;
const REST_GREEN_TO = 300;

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

function formatClock(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function restColor(s: number) {
  if (s >= REST_GREEN_FROM && s < REST_GREEN_TO) return colors.success;
  return colors.text.muted;
}

// Ghost button: transparent bg, border, text in secondary tone
function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: pressed ? colors.text.secondary : colors.border,
        borderRadius: radius.lg,
        paddingVertical: 22,
        alignItems: 'center',
        backgroundColor: pressed ? 'rgba(255,255,255,0.04)' : 'transparent',
      })}
    >
      <Text
        style={{
          fontSize: fontSize.md,
          fontWeight: '600',
          color: colors.text.secondary,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
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

  const [phase, setPhase] = useState<Phase>('warmup');
  const [summaryWorkout, setSummaryWorkout] = useState<Workout | null>(null);
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
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
  const splashSweep   = useRef(new Animated.Value(0)).current;    // unused legacy, kept for type safety

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
      const phrase = SET_SPLASH_PHRASES[Math.floor(Math.random() * SET_SPLASH_PHRASES.length)];
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
    }
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
  const totalEx    = active?.exercises.length ?? 0;
  const isLastSet  =
    !!active &&
    exIdx === totalEx - 1 &&
    setIdx === (currentEx?.sets.length ?? 1) - 1;

  // ---- handlers ----

  const handleWarmupDone = () => {
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
    setRestStartedAt(Date.now());
    setRestElapsed(0);
    setPhase('rest');
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
      addWorkoutDay();
      addPoints(10);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSummaryWorkout(finished);
      setPhase('summary');
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
      <Summary
        workout={summaryWorkout}
        onClose={() => router.replace('/(tabs)')}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.base }}>
      {/* Minimal header */}
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable onPress={handleCancel} hitSlop={14}>
          <Icon name="close" size={18} color={colors.text.muted} />
        </Pressable>
        <Text variant="caption" tone="muted" style={{ flex: 1, textAlign: 'center', marginHorizontal: spacing.md }}>
          {headerContext}
        </Text>
        {/* Total timer — small, unobtrusive, only when active */}
        {active && phase !== 'summary' ? (
          <Text variant="caption" tone="muted" numeric style={{ minWidth: 36, textAlign: 'right' }}>
            {formatDuration(elapsed)}
          </Text>
        ) : (
          <View style={{ width: 36 }} />
        )}
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
          paddingTop: spacing['2xl'],
        }}
      >
        {phase === 'warmup' && (
          <WarmupPhase elapsed={warmupElapsed} onDone={handleWarmupDone} />
        )}

        {phase === 'set' && currentEx && currentSet && (
          <SetPhase
            exerciseName={currentEx.exerciseName}
            setNumber={setIdx + 1}
            totalSets={currentEx.sets.length}
            elapsed={setTimerElapsed}
            onDone={handleSetDone}
          />
        )}

        {phase === 'log' && currentEx && currentSet && (
          <LogPhase
            set={currentSet}
            unit={profile.unit}
            exIdx={exIdx}
            setIdx={setIdx}
            onWeightChange={(v) => updateSet(exIdx, setIdx, { weightKg: fromDisplay(v, profile.unit) })}
            onRepsChange={(v) => updateSet(exIdx, setIdx, { reps: v })}
            onSave={handleLogSave}
          />
        )}

        {phase === 'rest' && currentEx && currentSet && (
          <RestPhase
            elapsed={restElapsed}
            nextLabel={nextLabel}
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
              style={{
                fontSize: 38,
                fontWeight: '900',
                color: colors.text.primary,
                letterSpacing: -0.5,
                textAlign: 'center',
                lineHeight: 44,
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
    </View>
  );
}

// ---- Phase components ----

function WarmupPhase({ elapsed, onDone }: { elapsed: number; onDone: () => void }) {
  return (
    <>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: '700',
            color: colors.text.muted,
            letterSpacing: 4,
            marginBottom: spacing.xl,
          }}
        >
          CALENTAMIENTO
        </Text>
        <Text
          style={{
            fontSize: 124,
            fontWeight: '900',
            color: colors.text.secondary,
            letterSpacing: -4,
            fontVariant: ['tabular-nums'],
            lineHeight: 124,
          }}
        >
          {formatClock(elapsed)}
        </Text>
      </View>
      <GhostButton label="Terminé de calentar" onPress={onDone} />
    </>
  );
}

function SetPhase({
  exerciseName,
  setNumber,
  totalSets,
  elapsed,
  onDone,
}: {
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  elapsed: number;
  onDone: () => void;
}) {
  return (
    <>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* Exercise name — large, bold */}
        <Text
          style={{
            fontSize: fontSize['2xl'],
            fontWeight: '900',
            color: colors.text.primary,
            letterSpacing: -0.5,
            textAlign: 'center',
            marginBottom: spacing.sm,
          }}
        >
          {exerciseName}
        </Text>
        {/* Serie counter */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: '700',
            color: colors.primary.DEFAULT,
            letterSpacing: 2,
            marginBottom: spacing['2xl'],
          }}
        >
          SERIE {setNumber}/{totalSets}
        </Text>
        {/* Hero: per-set chronometer */}
        <Text
          style={{
            fontSize: 128,
            fontWeight: '900',
            color: colors.text.primary,
            letterSpacing: -5,
            fontVariant: ['tabular-nums'],
            lineHeight: 128,
          }}
        >
          {formatClock(elapsed)}
        </Text>
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: '500',
            color: colors.text.muted,
            marginTop: spacing.lg,
            letterSpacing: 1,
          }}
        >
          tiempo en la serie
        </Text>
      </View>
      <GhostButton label="Terminé la serie" onPress={onDone} />
    </>
  );
}

function LogPhase({
  set,
  unit,
  exIdx: _exIdx,
  setIdx: _setIdx,
  onWeightChange,
  onRepsChange,
  onSave,
}: {
  set: { reps: number; weightKg: number };
  unit: 'kg' | 'lb';
  exIdx: number;
  setIdx: number;
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
  onSave: () => void;
}) {
  const displayWeight = toDisplay(set.weightKg, unit);

  return (
    <>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: '700',
            color: colors.text.muted,
            letterSpacing: 4,
            marginBottom: spacing['2xl'],
          }}
        >
          REGISTRAR SERIE
        </Text>
        <View
          style={{
            flexDirection: 'row',
            gap: spacing['2xl'],
            alignItems: 'flex-start',
          }}
        >
          <BigNumeric
            label={unit.toUpperCase()}
            value={displayWeight}
            step={unit === 'kg' ? 2.5 : 5}
            decimals={unit === 'kg' ? 1 : 0}
            onChange={onWeightChange}
          />
          <View
            style={{
              width: 1,
              height: 80,
              backgroundColor: colors.border,
              alignSelf: 'center',
            }}
          />
          <BigNumeric
            label="REPS"
            value={set.reps}
            step={1}
            decimals={0}
            onChange={onRepsChange}
          />
        </View>
      </View>
      <GhostButton label="Guardar serie" onPress={onSave} />
    </>
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
        marginTop: spacing.xl,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: fontSize.md,
          fontWeight: '600',
          color: colors.text.secondary,
          letterSpacing: 0.3,
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
  onConfirm,
}: {
  elapsed: number;
  nextLabel: string;
  onConfirm: () => void;
}) {
  const color = restColor(elapsed);

  return (
    <>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: '700',
            color: colors.text.muted,
            letterSpacing: 4,
            marginBottom: spacing.xl,
          }}
        >
          DESCANSO
        </Text>
        {/* Hero: rest chronometer, colour transitions to green in the window */}
        <Text
          style={{
            fontSize: 128,
            fontWeight: '900',
            color,
            letterSpacing: -5,
            fontVariant: ['tabular-nums'],
            lineHeight: 128,
          }}
        >
          {formatClock(elapsed)}
        </Text>
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: '400',
            color: colors.text.muted,
            marginTop: spacing.xl,
            textAlign: 'center',
            maxWidth: 260,
            lineHeight: 20,
          }}
        >
          Descansa hasta sentirte completamente recuperado (2–5 min)
        </Text>
        {/* Rotating motivational phrase — lively, cycles every ~4.5s */}
        <RestPhrase />
      </View>
      <GhostButton label={nextLabel} onPress={onConfirm} />
    </>
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
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontSize: fontSize.sm,
          fontWeight: '700',
          color: colors.text.muted,
          letterSpacing: 3,
          marginBottom: spacing.sm,
        }}
      >
        {label}
      </Text>
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
          fontSize: 60,
          fontWeight: '900',
          textAlign: 'center',
          minWidth: 110,
          paddingHorizontal: spacing.xs,
        }}
        selectTextOnFocus
      />
      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
        <Pressable
          onPress={() => bump(-step)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ fontSize: fontSize.xl, fontWeight: '700', color: colors.text.secondary }}
          >
            −
          </Text>
        </Pressable>
        <Pressable
          onPress={() => bump(step)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ fontSize: fontSize.xl, fontWeight: '700', color: colors.text.secondary }}
          >
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---- Summary screen ----

function Summary({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  // Success animation: ring scales+pulses in
  const ringScale   = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const checkScale  = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Ring appears
      Animated.parallel([
        Animated.spring(ringScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Check pops in
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      // Text fades in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const duration = formatDuration(workout.durationSeconds ?? 0);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.base,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: insets.top + spacing['3xl'],
        paddingBottom: insets.bottom + spacing['2xl'],
        paddingHorizontal: spacing.lg,
      }}
    >
      {/* Hero: animated ring + check */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 2,
            borderColor: colors.success,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
            marginBottom: spacing['2xl'],
          }}
        >
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Icon name="check" size={48} color={colors.success} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: fontSize['4xl'],
              fontWeight: '900',
              color: colors.text.primary,
              textAlign: 'center',
              letterSpacing: -1,
            }}
          >
            ¡Bien hecho!
          </Text>
          <Text
            variant="heading"
            tone="muted"
            numeric
            style={{ marginTop: spacing.lg }}
          >
            {duration}
          </Text>
          <Text
            variant="caption"
            tone="muted"
            style={{ marginTop: spacing.xs }}
          >
            tiempo total
          </Text>
        </Animated.View>
      </View>

      {/* Bottom area */}
      <View style={{ width: '100%', gap: spacing.md }}>
        <Text
          variant="caption"
          tone="muted"
          style={{ textAlign: 'center', marginBottom: spacing.xs }}
        >
          Verás el detalle en Progreso
        </Text>
        <GhostButton label="Listo" onPress={onClose} />
      </View>
    </View>
  );
}
