import { View, Alert } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, spacing, radius } from '@/theme/tokens';
import { useRoutinesStore } from '@/store/routines';
import { useAppStore } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { Icon } from '@/components/Icon';
import { computeRoutineScore, MUSCLE_LABELS, analyzeRoutineMuscles } from '@/lib/optimizationScore';
import { MuscleOptimizationTable, STATUS_COLOR } from '@/components/MuscleOptimizationTable';
import { MuscleMap, type MuscleKey } from '@/components/MuscleMap';

const MAP_VIEW_OPTIONS: { value: 'front' | 'back'; label: string }[] = [
  { value: 'front', label: 'Frente' },
  { value: 'back', label: 'Espalda' },
];

export default function Routines() {
  const router = useRouter();
  const routines = useRoutinesStore((s) => s.routines);
  const activeId = useRoutinesStore((s) => s.activeRoutineId);
  const profile = useAppStore((s) => s.profile);
  const history = useWorkoutsStore((s) => s.history);

  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [muscleOpen, setMuscleOpen] = useState(false);
  const [mapView, setMapView] = useState<'front' | 'back'>('front');

  // Una sola rutina por usuario.
  const activeRoutine = routines.find((r) => r.id === activeId) ?? routines[0] ?? null;
  const nextDay = activeRoutine?.days[history.length % (activeRoutine.days.length || 1)];

  // Al cambiar de rutina, vuelve a "Todos" para no quedar con un músculo que ya
  // no existe (filtro stale → tabla vacía).
  useEffect(() => {
    setSelectedMuscle('all');
  }, [activeRoutine?.id]);

  const optScore = profile && activeRoutine ? computeRoutineScore(activeRoutine, profile) : null;

  const muscleStats = useMemo(
    () => (activeRoutine ? analyzeRoutineMuscles(activeRoutine) : []),
    [activeRoutine],
  );
  const scoreColor = optScore
    ? optScore.score > 80
      ? colors.success
      : optScore.score >= 50
        ? colors.warning
        : colors.danger
    : colors.text.muted;

  const muscleDropdownOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [{ id: 'all', label: 'Todos' }];
    for (const m of muscleStats) {
      options.push({ id: m.muscle, label: m.label });
    }
    return options;
  }, [muscleStats]);

  const currentMuscleLabel =
    muscleDropdownOptions.find((o) => o.id === selectedMuscle)?.label ?? 'Todos';

  const muscleColors = useMemo(() => {
    // Parte de "todos sin entrenar" (gris) y sobreescribe los músculos presentes
    // en la rutina con el color de su estado. Así el mapa colorea TODO el cuerpo y
    // queda consistente con la leyenda (incluye el estado "sin entrenar").
    const out: Record<MuscleKey, string> = {
      chest: STATUS_COLOR.untrained,
      back: STATUS_COLOR.untrained,
      front_delt: STATUS_COLOR.untrained,
      lateral_delt: STATUS_COLOR.untrained,
      rear_delt: STATUS_COLOR.untrained,
      biceps: STATUS_COLOR.untrained,
      triceps: STATUS_COLOR.untrained,
      quads: STATUS_COLOR.untrained,
      hamstrings: STATUS_COLOR.untrained,
      glutes: STATUS_COLOR.untrained,
      calves: STATUS_COLOR.untrained,
      core: STATUS_COLOR.untrained,
    };
    for (const a of muscleStats) {
      if (a.muscle in out) out[a.muscle as MuscleKey] = STATUS_COLOR[a.status];
    }
    return out;
  }, [muscleStats]);

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
        <EmptyState
          icon="dumbbell"
          tone="primary"
          title="Aún no tienes una rutina"
          subtitle="Crea tu rutina de entrenamiento"
          action={{ label: 'Elegir plantilla', size: 'lg', onPress: () => router.push('/routine/templates') }}
          secondaryAction={{
            label: 'Crear rutina manual',
            onPress: () => router.push({ pathname: '/routine/[id]', params: { id: 'new' } }),
          }}
          style={{ marginTop: spacing['2xl'] }}
        />
      ) : (
        <>
          <Card variant="raised" padding="xl" style={{ marginTop: spacing.lg }}>
            <Text variant="label" tone="brand">RUTINA ACTIVA</Text>
            <Text variant="title" style={{ marginTop: 4 }}>{activeRoutine.name}</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
              {activeRoutine.days.length} días · próximo: {nextDay?.name ?? '—'}
            </Text>
            {nextDay && (
              <Button
                title="Empezar"
                size="lg"
                leftIcon={<Icon name="dumbbell" size={18} color={colors.text.primary} />}
                onPress={() =>
                  router.push({
                    pathname: '/workout/active',
                    params: { routineId: activeRoutine.id, dayId: nextDay.id },
                  })
                }
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

          {/* Score de optimización — entra con fade escalonado */}
          {optScore && (
            <Animated.View
              entering={FadeInDown.delay(50).springify().damping(18)}
              layout={LinearTransition.springify().damping(18)}
              style={{ marginTop: spacing['2xl'], alignItems: 'center' }}
            >
              <Text variant="heading" style={{ marginBottom: spacing.md, alignSelf: 'stretch' }}>Score de optimización</Text>
              <Card variant="raised" padding="lg" style={{ alignSelf: 'stretch' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 34,
                      backgroundColor: scoreColor + '22',
                      borderWidth: 2,
                      borderColor: scoreColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: '700', color: scoreColor, lineHeight: 26 }}>
                      {optScore.score}
                    </Text>
                    <Text style={{ fontSize: 10, color: scoreColor, opacity: 0.8 }}>/100</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {optScore.weakGroups.length > 0 ? (
                      <>
                        <Text variant="label" tone="muted">Grupos más débiles</Text>
                        <Text weight="semibold" style={{ marginTop: 4 }}>
                          {optScore.weakGroups.map((g) => MUSCLE_LABELS[g] ?? g).join(' · ')}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                          {(['coverage', 'balance', 'volume', 'frequency', 'separation'] as const).map((key) => {
                            const val = optScore.breakdown[key];
                            const barColor = val > 80 ? colors.success : val >= 50 ? colors.warning : colors.danger;
                            return (
                              <View key={key} style={{ flex: 1 }}>
                                <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.border }}>
                                  <View style={{ height: 3, borderRadius: 2, backgroundColor: barColor, width: `${val}%` as any }} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    ) : (
                      <Text variant="caption" tone="muted">
                        Agrega ejercicios a tu rutina para ver el análisis
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Mapa muscular — entra con fade escalonado */}
          {muscleStats.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(100).springify().damping(18)}
              layout={LinearTransition.springify().damping(18)}
              style={{ marginTop: spacing['2xl'] }}
            >
              <Text variant="heading" style={{ marginBottom: spacing.md }}>Mapa muscular</Text>
              <Card variant="raised" padding="lg">
                {/* Toggle frente / espalda */}
                <SegmentedControl
                  options={MAP_VIEW_OPTIONS}
                  value={mapView}
                  onChange={setMapView}
                  variant="pill"
                  style={{ marginBottom: spacing.lg }}
                />

                {/* Silueta */}
                <View style={{ alignItems: 'center' }}>
                  <MuscleMap view={mapView} colors={muscleColors} size={180} gender={profile?.sex ?? 'male'} />
                </View>

                {/* Leyenda */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg, justifyContent: 'center' }}>
                  {(
                    [
                      { status: 'optimal', label: 'Óptimo' },
                      { status: 'low', label: 'Bajo' },
                      { status: 'high', label: 'Exceso' },
                      { status: 'untrained', label: 'Sin entrenar' },
                    ] as const
                  ).map(({ status, label }) => (
                    <View key={status} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: STATUS_COLOR[status],
                        }}
                      />
                      <Text variant="caption" tone="secondary">{label}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Tabla por músculo — entra con fade escalonado */}
          {muscleStats.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(150).springify().damping(18)}
              layout={LinearTransition.springify().damping(18)}
              style={{ marginTop: spacing['2xl'], alignItems: 'center' }}
            >
              <Text variant="heading" style={{ marginBottom: spacing.md, alignSelf: 'stretch' }}>Por músculo</Text>

              {/* Desplegable de filtro por músculo */}
              <View style={{ marginBottom: spacing.md, zIndex: 10, alignSelf: 'stretch' }}>
                {/* Selector de músculo — escala leve al abrir */}
                <PressableScale
                  onPress={() => setMuscleOpen((o) => !o)}
                  pressScale={0.97}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 10,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: muscleOpen ? colors.primary.DEFAULT : colors.border,
                    backgroundColor: colors.bg.card,
                  }}
                >
                  <Text variant="caption" weight="bold" style={{ flex: 1, color: colors.text.primary }}>
                    {currentMuscleLabel}
                  </Text>
                  <View style={{ transform: [{ rotate: muscleOpen ? '-90deg' : '90deg' }] }}>
                    <Icon name="chevron-right" size={16} color={colors.text.muted} />
                  </View>
                </PressableScale>

                {muscleOpen && (
                  <View
                    style={{
                      marginTop: spacing.xs,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.bg.card,
                      overflow: 'hidden',
                    }}
                  >
                    {muscleDropdownOptions.map((opt, i) => {
                      const active = selectedMuscle === opt.id;
                      return (
                        // Opción del desplegable — escala pequeña, sin háptico propio (ya está en el trigger)
                        <PressableScale
                          key={opt.id}
                          onPress={() => {
                            setSelectedMuscle(opt.id);
                            setMuscleOpen(false);
                          }}
                          pressScale={0.97}
                          haptic={false}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.sm,
                            paddingHorizontal: spacing.md,
                            paddingVertical: 11,
                            borderBottomWidth: i < muscleDropdownOptions.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                            backgroundColor: active ? colors.primary.muted : 'transparent',
                          }}
                        >
                          <Text
                            variant="caption"
                            weight={active ? 'bold' : 'semibold'}
                            style={{ flex: 1, color: active ? colors.primary.DEFAULT : colors.text.secondary }}
                          >
                            {opt.label}
                          </Text>
                          {active && <Icon name="check" size={15} color={colors.primary.DEFAULT} />}
                        </PressableScale>
                      );
                    })}
                  </View>
                )}
              </View>

              <Card variant="raised" padding="lg" style={{ alignSelf: 'stretch' }}>
                <MuscleOptimizationTable
                  items={selectedMuscle === 'all' ? muscleStats : muscleStats.filter((m) => m.muscle === selectedMuscle)}
                  grouped={selectedMuscle === 'all'}
                />
              </Card>
            </Animated.View>
          )}
        </>
      )}
    </Screen>
  );
}
