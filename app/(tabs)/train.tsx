import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme/tokens';
import { useRoutinesStore } from '@/store/routines';
import { useWorkoutsStore } from '@/store/workouts';

export default function Train() {
  const router = useRouter();
  const routines = useRoutinesStore((s) => s.routines);
  const active = useWorkoutsStore((s) => s.active);

  if (active) {
    return (
      <Screen>
        <Card variant="glow" padding="xl">
          <Text variant="label" tone="brand">EN CURSO</Text>
          <Text variant="title" style={{ marginTop: 4 }}>{active.routineName ?? 'Workout libre'}</Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.sm }}>
            Continúa donde lo dejaste.
          </Text>
          <Button
            title="Continuar workout"
            onPress={() => router.push('/workout/active')}
            style={{ marginTop: spacing.lg }}
            fullWidth
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">Empezar workout</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
        Elige el día de tu rutina o entrena libre.
      </Text>

      <View style={{ marginTop: spacing.xl }}>
        {routines.map((r) => (
          <View key={r.id} style={{ marginBottom: spacing.xl }}>
            <Text variant="heading">{r.name}</Text>
            {r.days.map((d) => (
              <Pressable
                key={d.id}
                onPress={() =>
                  router.push({ pathname: '/workout/active', params: { routineId: r.id, dayId: d.id } })
                }
              >
                <Card padding="lg" style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.primary.muted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text weight="black" tone="brand">{d.name[0]}</Text>
                  </View>
                  <View style={{ marginLeft: spacing.md, flex: 1 }}>
                    <Text variant="heading">{d.name}</Text>
                    <Text variant="caption" tone="secondary">{d.exercises.length} ejercicios</Text>
                  </View>
                  <Text variant="heading" tone="muted">›</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
