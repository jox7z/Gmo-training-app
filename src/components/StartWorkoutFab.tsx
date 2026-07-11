/**
 * StartWorkoutFab — botón flotante para empezar (o reanudar) un entreno desde
 * el feed. Comparte la identidad 3D de la app (cara + capa "edge" inferior que
 * se hunde al pulsar, como `Button`) envuelto en PressableScale con háptico.
 *
 * Lógica de destino:
 *  1. Hay un workout en curso → reanuda ese entreno (si la rutina existe).
 *  2. Hay rutina activa con próximo día → empieza ese día.
 *  3. Sin rutina → lleva al tab de Rutinas.
 */
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { PressableScale } from '@/components/ui/PressableScale';
import { Icon } from '@/components/Icon';
import { colors, radius, depth, shadow } from '@/theme/tokens';
import { useWorkoutsStore } from '@/store/workouts';
import { useRoutinesStore } from '@/store/routines';
import { goToTab, TAB_INDEX } from '@/lib/tabsNav';

const SIZE = 60;

export function StartWorkoutFab({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  // Selectores primitivos (no el objeto `active` completo): el workout activo
  // cambia de referencia en cada updateSet (cada tecla del stepper de peso/reps
  // en active.tsx), y este FAB vive montado de fondo en el Feed (PagerView
  // mantiene los 4 tabs montados). Suscribirse al objeto entero re-renderiza
  // este componente invisible en cada edición de serie durante la sesión.
  const hasActiveWorkout = useWorkoutsStore((s) => s.active !== null);
  const activeRoutineDayId = useWorkoutsStore((s) => s.active?.routineDayId);
  const history = useWorkoutsStore((s) => s.history);
  const routines = useRoutinesStore((s) => s.routines);
  const activeId = useRoutinesStore((s) => s.activeRoutineId);
  const [pressed, setPressed] = useState(false);

  // Rutina para reanudar el workout en curso (algún día coincide con routineDayId).
  const resumeRoutine = hasActiveWorkout
    ? routines.find((r) => r.days.some((d) => d.id === activeRoutineDayId)) ?? null
    : null;

  // Si hay un workout en curso pero no encontramos su rutina, no mostramos el FAB
  // (no podríamos reanudar de forma coherente).
  if (hasActiveWorkout && !resumeRoutine) return null;

  const activeRoutine = routines.find((r) => r.id === activeId) ?? routines[0] ?? null;
  const nextDay = activeRoutine?.days[history.length % (activeRoutine.days.length || 1)];

  const handlePress = () => {
    if (hasActiveWorkout && resumeRoutine) {
      router.push({
        pathname: '/workout/active',
        params: { routineId: resumeRoutine.id, dayId: activeRoutineDayId },
      });
      return;
    }
    if (activeRoutine && nextDay) {
      router.push({
        pathname: '/workout/active',
        params: { routineId: activeRoutine.id, dayId: nextDay.id },
      });
      return;
    }
    goToTab(TAB_INDEX.routines);
  };

  return (
    <PressableScale
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      haptic={Haptics.ImpactFeedbackStyle.Medium}
      pressScale={0.94}
      style={[{ width: SIZE, paddingBottom: depth.edge }, style]}
    >
      {/* Capa inferior (edge) que da profundidad 3D */}
      <View style={styles.edge} pointerEvents="none" />
      {/* Cara: se hunde translateY al pulsar */}
      <View
        style={[
          styles.face,
          shadow.glowPrimary,
          pressed && { transform: [{ translateY: depth.edge }] },
        ]}
      >
        <Icon name="dumbbell" size={26} color={colors.text.primary} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: depth.edge,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: colors.primary.dark,
  },
  face: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
