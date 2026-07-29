import { View, Alert } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme/tokens';
import { useRoutinesStore } from '@/store/routines';
import { useWorkoutsStore } from '@/store/workouts';
import { useAppStore } from '@/store/app';
import { Icon } from '@/components/Icon';
import { nextRoutineDay } from '@/lib/routineSchedule';
import { MascotState } from '@/components/GmoMascot';
import { calculatePlannedMuscleVolume } from '@/lib/muscleVolume';
import { MuscleVolumeMap } from '@/components/MuscleVolumeMap';
import { computeRoutineQualityScore } from '@/lib/routineQualityScore';
import { RoutineQualityCard } from '@/components/routines/RoutineQualityCard';

export default function Routines() {
  const router = useRouter();
  const routines = useRoutinesStore((s) => s.routines);
  const activeId = useRoutinesStore((s) => s.activeRoutineId);
  const history = useWorkoutsStore((s) => s.history);
  const activeWorkout = useWorkoutsStore((s) => s.active);
  const profile = useAppStore((s) => s.profile);

  // Una sola rutina por usuario.
  const activeRoutine = routines.find((r) => r.id === activeId) ?? routines[0] ?? null;
  const nextDay = nextRoutineDay(activeRoutine, history);
  const plannedVolume = useMemo(
    () => (activeRoutine ? calculatePlannedMuscleVolume(activeRoutine) : []),
    [activeRoutine],
  );
  const routineQuality = useMemo(
    () => (activeRoutine ? computeRoutineQualityScore(activeRoutine) : null),
    [activeRoutine],
  );
  const activeWorkoutDay = activeRoutine?.days.find(
    (day) => day.id === activeWorkout?.routineDayId,
  );

  const openWorkout = () => {
    if (activeWorkout) {
      if (activeWorkoutDay && activeRoutine) {
        router.push({
          pathname: '/workout/active',
          params: { routineId: activeRoutine.id, dayId: activeWorkoutDay.id },
        });
      } else {
        router.push('/workout/active');
      }
      return;
    }
    if (!activeRoutine || !nextDay) return;
    router.push({
      pathname: '/workout/active',
      params: { routineId: activeRoutine.id, dayId: nextDay.id },
    });
  };

  // "Cambiar rutina": como solo puede haber una, cambiar = editar la actual,
  // elegir plantilla famosa o crear desde cero.
  const handleChange = () => {
    Alert.alert(
      'Cambiar rutina',
      'Solo puedes tener una rutina a la vez. ¿Qué quieres hacer?',
      [
        {
          text: 'Editar la actual',
          onPress: () =>
            activeRoutine &&
            router.push({ pathname: '/routine/[id]', params: { id: activeRoutine.id } }),
        },
        {
          text: 'Elegir plantilla',
          onPress: () => router.push('/routine/templates'),
        },
        {
          text: 'Crear desde cero',
          onPress: () => router.push({ pathname: '/routine/[id]', params: { id: 'new' } }),
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text variant="title">Mi rutina</Text>
      </View>

      {!activeRoutine ? (
        <MascotState
          title="Construyamos tu primera rutina"
          description="Elige una plantilla probada o créala desde cero."
          mascotSize={168}
          style={{ marginTop: spacing.xl }}
        >
          <Button
            title="Elegir plantilla"
            size="lg"
            onPress={() => router.push('/routine/templates')}
            fullWidth
          />
          <Button
            title="Crear rutina manual"
            variant="ghost"
            onPress={() => router.push({ pathname: '/routine/[id]', params: { id: 'new' } })}
            fullWidth
          />
        </MascotState>
      ) : (
        <>
          <Card variant="section" padding="xl" style={{ marginTop: spacing.lg }}>
            <Text variant="label" tone="brand">RUTINA ACTIVA</Text>
            <Text variant="title" style={{ marginTop: 4 }}>{activeRoutine.name}</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
              {activeWorkout
                ? `${activeWorkout.routineName ?? 'Sesión activa'} · en curso`
                : `${activeRoutine.days.length} días · próximo: ${nextDay?.name ?? '—'}`}
            </Text>
            {(activeWorkout || nextDay) && (
              <Button
                title={activeWorkout ? 'Continuar entrenamiento' : 'Empezar'}
                size="lg"
                leftIcon={<Icon name="dumbbell" size={18} color={colors.text.primary} />}
                onPress={openWorkout}
                fullWidth
                style={{ marginTop: spacing.lg }}
              />
            )}
            <Button
              title="Cambiar rutina"
              variant="ghost"
              size="sm"
              onPress={handleChange}
              style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
            />
          </Card>

          {routineQuality ? (
            <RoutineQualityCard
              result={routineQuality}
              style={{ marginTop: spacing['2xl'] }}
            />
          ) : null}

          <MuscleVolumeMap
            results={plannedVolume}
            title="Volumen semanal de la rutina"
            subtitle="Estimación por series principales y secundarias. Toca un músculo."
            frequencyUnit="días/semana"
            gender={profile?.sex ?? 'male'}
            style={{ marginTop: spacing.lg }}
          />
        </>
      )}
    </Screen>
  );
}
