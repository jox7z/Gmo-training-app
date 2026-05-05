import { View, Pressable } from 'react-native';
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
import { colors, spacing, radius, rankFromPoints } from '@/theme/tokens';
import { useAppStore } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { useRoutinesStore } from '@/store/routines';
import { exerciseById } from '@/data/exercises';

export default function Home() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const streakWeeks = useAppStore((s) => s.streakWeeks);
  const daysThisWeek = useAppStore((s) => s.daysThisWeek);
  const history = useWorkoutsStore((s) => s.history);
  const routines = useRoutinesStore((s) => s.routines);
  const activeRoutineId = useRoutinesStore((s) => s.activeRoutineId);

  if (!profile) return null;

  const rank = rankFromPoints(profile.rankPoints);
  const activeRoutine = routines.find((r) => r.id === activeRoutineId) ?? routines[0];
  const nextDay = activeRoutine?.days[history.length % (activeRoutine?.days.length || 1)];

  const weeklyVolume = history
    .filter((w) => Date.now() - new Date(w.startedAt).getTime() < 7 * 24 * 3600 * 1000)
    .reduce((acc, w) => acc + w.totalVolumeKg, 0);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <View>
          <Text variant="caption" tone="muted">Hola,</Text>
          <Text variant="title">{profile.displayName} 👋</Text>
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
            <Text style={{ fontSize: 20 }}>🤖</Text>
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
      {nextDay && (
        <Card variant="glow" padding="lg" style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="label" tone="brand">Hoy toca</Text>
              <Text variant="title" style={{ marginTop: 4 }}>{nextDay.name}</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                {nextDay.exercises.length} ejercicios · ~{nextDay.exercises.length * 15} min
              </Text>
            </View>
            <Button
              title="Empezar"
              onPress={() =>
                router.push({
                  pathname: '/workout/active',
                  params: { routineId: activeRoutine.id, dayId: nextDay.id },
                })
              }
            />
          </View>
        </Card>
      )}

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
              label="Volumen"
              value={Math.round(weeklyVolume).toLocaleString()}
              unit={profile.unit}
              tone="info"
            />
          </Card>
        </View>
      </View>

      {/* Historial reciente */}
      <View style={{ marginTop: spacing['2xl'] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text variant="heading">Historial reciente</Text>
          <Pressable onPress={() => router.push('/profile')}>
            <Text variant="caption" tone="brand" weight="semibold">Ver todo</Text>
          </Pressable>
        </View>

        {history.length === 0 ? (
          <Card padding="xl" style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 40 }}>💪</Text>
            <Text variant="heading" style={{ marginTop: spacing.sm }}>Sin entrenamientos aún</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 4, textAlign: 'center' }}>
              Empieza tu primer workout y comienza tu racha.
            </Text>
          </Card>
        ) : (
          history.slice(0, 3).map((w) => (
            <Card key={w.id} padding="md" style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text weight="semibold">{w.routineName ?? 'Entrenamiento libre'}</Text>
                  <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    {new Date(w.startedAt).toLocaleDateString()} · {Math.round((w.durationSeconds ?? 0) / 60)} min · {w.exercises.length} ejercicios
                  </Text>
                </View>
                <Badge label={`${Math.round(w.totalVolumeKg)} ${profile.unit}`} tone="info" />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
