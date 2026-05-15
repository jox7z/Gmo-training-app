import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { StreakRing } from '@/components/StreakRing';
import { RankBadge } from '@/components/RankBadge';
import { colors, spacing } from '@/theme/tokens';
import { Loader } from '@/components/ui/Loader';
import { useAppStore } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { useRoutinesStore } from '@/store/routines';
import { Icon } from '@/components/Icon';
import { canStartWorkout } from '@/lib/workoutGuards';

export default function Home() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const streakWeeks = useAppStore((s) => s.streakWeeks);
  const daysThisWeek = useAppStore((s) => s.daysThisWeek);
  const history = useWorkoutsStore((s) => s.history);
  const routines = useRoutinesStore((s) => s.routines);
  const activeRoutineId = useRoutinesStore((s) => s.activeRoutineId);

  if (!profile) return <Loader />;

  const activeRoutine = routines.find((r) => r.id === activeRoutineId) ?? routines[0];
  const weekdayMon0 = (new Date().getDay() + 6) % 7;
  const dayCount = activeRoutine?.days.length ?? 0;
  const todayDay = dayCount > 0 ? activeRoutine!.days[weekdayMon0 % dayCount] : undefined;
  const isRestDay = !todayDay || todayDay.exercises.length === 0;

  const weeklySets = history
    .filter((w) => Date.now() - new Date(w.startedAt).getTime() < 7 * 24 * 3600 * 1000)
    .reduce(
      (acc, w) =>
        acc + w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length, 0),
      0,
    );

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const todayWorkouts = history.filter((w) => {
    const d = new Date(w.startedAt);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return k === todayKey;
  });

  const handleStart = () => {
    if (!activeRoutine || !todayDay) return;
    const guard = canStartWorkout(history);
    if (!guard.allowed) {
      Alert.alert('Espera un momento', guard.reason);
      return;
    }
    router.push({
      pathname: '/workout/active',
      params: { routineId: activeRoutine.id, dayId: todayDay.id },
    });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <View>
          <Text variant="caption" tone="muted">Hola,</Text>
          <Text variant="title">{profile.displayName}</Text>
        </View>
        <Pressable onPress={() => router.push('/coach')}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.info.soft,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.info.DEFAULT,
            }}
          >
            <Icon name="robot" size={20} color={colors.info.DEFAULT} />
          </View>
        </Pressable>
      </View>

      {/* Hero card: racha + rango */}
      <Card variant="elevated" padding="xl" style={{ overflow: 'hidden' }}>
        <LinearGradient
          colors={[colors.primary.muted, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <StreakRing
            weeks={streakWeeks}
            daysThisWeek={daysThisWeek}
            weeklyGoal={profile.weeklyGoalDays}
          />
        </View>
        <RankBadge points={profile.rankPoints} size="md" showProgress />
      </Card>

      {/* CTA principal */}
      {activeRoutine && (isRestDay ? (
        <Card padding="lg" style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="label" tone="muted">Hoy toca</Text>
              <Text variant="title" style={{ marginTop: 4 }}>Descanso</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                Recuperarte también es parte del plan.
              </Text>
            </View>
            <Button title="Entrenar libre" variant="ghost" size="sm" onPress={() => router.push('/(tabs)/train')} />
          </View>
        </Card>
      ) : todayDay ? (
        <Card variant="glow" padding="lg" style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="label" tone="brand">Hoy toca</Text>
              <Text variant="title" style={{ marginTop: 4 }}>{todayDay.name}</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                {todayDay.exercises.length} ejercicios · ~{todayDay.exercises.length * 15} min
              </Text>
            </View>
            <Button title="Empezar" onPress={handleStart} />
          </View>
        </Card>
      ) : null)}

      {/* Stats semanales */}
      <View style={{ marginTop: spacing['2xl'] }}>
        <Text variant="heading" style={{ marginBottom: spacing.md }}>
          Esta semana
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Card padding="lg" style={{ flex: 1 }}>
            <Stat label="Workouts" value={daysThisWeek} unit={`/ ${profile.weeklyGoalDays}`} tone="brand" />
          </Card>
          <Card padding="lg" style={{ flex: 1 }}>
            <Stat
              label="Sets"
              value={weeklySets}
              unit="completados"
              tone="info"
            />
          </Card>
        </View>
      </View>

      {/* Historial de hoy */}
      <View style={{ marginTop: spacing['2xl'] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text variant="heading">Hoy</Text>
          <Pressable onPress={() => router.push('/profile')}>
            <Text variant="caption" tone="brand" weight="semibold">Ver todo</Text>
          </Pressable>
        </View>

        {todayWorkouts.length === 0 ? (
          <Card padding="xl" style={{ alignItems: 'center' }}>
            <Icon name="dumbbell" size={40} color={colors.text.muted} />
            <Text variant="heading" style={{ marginTop: spacing.sm }}>Aún no entrenaste hoy</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 4, textAlign: 'center' }}>
              Empieza tu workout cuando estés listo.
            </Text>
          </Card>
        ) : (
          todayWorkouts.map((w) => {
            const setsDone = w.exercises.reduce(
              (a, e) => a + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
              0,
            );
            return (
              <Card key={w.id} padding="md" style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold">{w.routineName ?? 'Entrenamiento libre'}</Text>
                    <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                      {new Date(w.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {Math.round((w.durationSeconds ?? 0) / 60)} min · {w.exercises.length} ejercicios
                    </Text>
                  </View>
                  <Badge label={`${setsDone} sets`} tone="info" />
                </View>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}
