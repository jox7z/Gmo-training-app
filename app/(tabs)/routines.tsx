import { View } from 'react-native';
import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Sheet } from '@/components/ui/Sheet';
import { colors, radius, spacing } from '@/theme/tokens';
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

// Segunda pose de “Mascota principal” de la lámina de marca, sin su panel oscuro.
const GMO_START_MASCOT = require('../../assets/brand/gmo-mascot-start.webp');

export default function Routines() {
  const router = useRouter();
  const routines = useRoutinesStore((s) => s.routines);
  const activeId = useRoutinesStore((s) => s.activeRoutineId);
  const history = useWorkoutsStore((s) => s.history);
  const activeWorkout = useWorkoutsStore((s) => s.active);
  const profile = useAppStore((s) => s.profile);
  const [changeRoutineOpen, setChangeRoutineOpen] = useState(false);

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

  const openRoutineEditor = () => {
    if (!activeRoutine) return;
    setChangeRoutineOpen(false);
    router.push({ pathname: '/routine/[id]', params: { id: activeRoutine.id } });
  };

  const openTemplates = () => {
    setChangeRoutineOpen(false);
    router.push('/routine/templates');
  };

  const createRoutine = () => {
    setChangeRoutineOpen(false);
    router.push({ pathname: '/routine/[id]', params: { id: 'new' } });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text variant="title">Mi rutina</Text>
      </View>

      {!activeRoutine ? (
        <MascotState
          title="Construyamos tu primera rutina"
          description="Usa una plantilla o créala desde cero."
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
          <Card variant="section" padding="lg" style={{ marginTop: spacing.lg }}>
            <Text variant="label" tone="muted">Rutina activa</Text>
            <Text variant="headline" style={{ marginTop: spacing.xs }}>{activeRoutine.name}</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
              {activeWorkout
                ? `${activeWorkout.routineName ?? 'Sesión activa'} · en curso`
                : `${activeRoutine.days.length} días · próximo: ${nextDay?.name ?? '—'}`}
            </Text>
            {(activeWorkout || nextDay) && (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={activeWorkout ? 'Continuar entreno' : 'Empezar entreno'}
                accessibilityHint={`${activeRoutine.name}${nextDay ? `, ${nextDay.name}` : ''}`}
                onPress={openWorkout}
                pressScale={0.98}
                style={{
                  marginTop: spacing.lg,
                  minHeight: 88,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.bg.card,
                  borderWidth: 1,
                  borderColor: colors.borderEmber,
                }}
              >
                <Image
                  source={GMO_START_MASCOT}
                  contentFit="contain"
                  accessibilityLabel="GMO listo para entrenar"
                  style={{ width: 64, height: 64 }}
                />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="heading" weight="black" style={{ color: colors.accent.DEFAULT }}>
                    {activeWorkout ? 'Continuar entreno' : 'Empezar entreno'}
                  </Text>
                  <Text variant="caption" weight="semibold" numberOfLines={1} style={{ color: colors.accent.DEFAULT }}>
                    {activeRoutine.name}
                  </Text>
                  {nextDay && !activeWorkout ? (
                    <Text variant="caption" numberOfLines={1} style={{ color: colors.accent.DEFAULT }}>
                      {nextDay.name}
                    </Text>
                  ) : null}
                </View>
                <Icon name="chevron-right" size={20} color={colors.accent.DEFAULT} />
              </PressableScale>
            )}
            <Button
              title="Cambiar rutina"
              variant="ghost"
              size="sm"
              onPress={() => setChangeRoutineOpen(true)}
              flat
              style={{ marginTop: spacing.md, alignSelf: 'center' }}
            />
          </Card>

          {routineQuality ? (
            <RoutineQualityCard
              result={routineQuality}
              style={{ marginTop: spacing.xl }}
            />
          ) : null}

          <MuscleVolumeMap
            results={plannedVolume}
            title="Volumen semanal de la rutina"
            subtitle="Series equivalentes. Toca un músculo."
            frequencyUnit="días/semana"
            gender={profile?.sex ?? 'male'}
            selectorLayout="grid"
            style={{ marginTop: spacing.lg }}
          />
        </>
      )}
      <Sheet
        visible={changeRoutineOpen}
        onClose={() => setChangeRoutineOpen(false)}
        title="Cambiar rutina"
        subtitle="Elige cómo continuar con tu entreno."
      >
        <RoutineChangeAction
          icon="edit"
          title="Editar rutina actual"
          description={activeRoutine?.name ?? 'Ajusta ejercicios, series y días.'}
          onPress={openRoutineEditor}
        />
        <RoutineChangeAction
          icon="target"
          title="Elegir plantilla"
          description="Estructura ya preparada."
          onPress={openTemplates}
        />
        <RoutineChangeAction
          icon="plus"
          title="Crear desde cero"
          description="Construye tu rutina a tu manera."
          onPress={createRoutine}
        />
      </Sheet>
    </Screen>
  );
}

function RoutineChangeAction({
  icon,
  title,
  description,
  onPress,
}: {
  icon: 'edit' | 'target' | 'plus';
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      haptic={false}
      pressScale={0.98}
      style={{
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg.elevated,
        padding: spacing.md,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.sm,
          backgroundColor: colors.primary.muted,
        }}
      >
        <Icon name={icon} size={20} color={colors.primary.DEFAULT} />
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text weight="bold" numberOfLines={1}>{title}</Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>{description}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.text.muted} />
    </PressableScale>
  );
}
