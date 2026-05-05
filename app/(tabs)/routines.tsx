import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing } from '@/theme/tokens';
import { useRoutinesStore } from '@/store/routines';
import { useAppStore } from '@/store/app';
import { generateRoutine } from '@/lib/routineGenerator';
import * as Haptics from 'expo-haptics';

export default function Routines() {
  const router = useRouter();
  const routines = useRoutinesStore((s) => s.routines);
  const activeId = useRoutinesStore((s) => s.activeRoutineId);
  const setActive = useRoutinesStore((s) => s.setActiveRoutine);
  const upsert = useRoutinesStore((s) => s.upsertRoutine);
  const dup = useRoutinesStore((s) => s.duplicateRoutine);
  const del = useRoutinesStore((s) => s.deleteRoutine);
  const profile = useAppStore((s) => s.profile);

  const handleGenerate = () => {
    if (!profile) return;
    const { routine } = generateRoutine({
      level: profile.level,
      goal: profile.goal,
      daysPerWeek: profile.weeklyGoalDays,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
    });
    upsert(routine);
    setActive(routine.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({ pathname: '/routine/[id]', params: { id: routine.id } });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title">Mis rutinas</Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/routine/[id]', params: { id: 'new' } })
          }
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary.DEFAULT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22, color: '#fff' }} weight="bold">+</Text>
          </View>
        </Pressable>
      </View>

      <Card variant="glow" glowColor={colors.info.DEFAULT} padding="lg" style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text style={{ fontSize: 28 }}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text variant="heading" tone="info">¿No sabes qué hacer?</Text>
            <Text variant="caption" tone="secondary">Genera una rutina con IA en 3 segundos.</Text>
          </View>
        </View>
        <Button title="Generar rutina inteligente" variant="secondary" onPress={handleGenerate} style={{ marginTop: spacing.md }} fullWidth />
      </Card>

      <View style={{ marginTop: spacing['2xl'] }}>
        {routines.map((r) => {
          const isActive = r.id === activeId;
          return (
            <Pressable
              key={r.id}
              onPress={() => router.push({ pathname: '/routine/[id]', params: { id: r.id } })}
              style={{ marginBottom: spacing.md }}
            >
              <Card padding="lg" variant={isActive ? 'glow' : 'default'}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text variant="heading">{r.name}</Text>
                      {r.isAiGenerated && <Badge label="IA" tone="info" />}
                      {isActive && <Badge label="Activa" tone="brand" />}
                    </View>
                    {r.description && (
                      <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>{r.description}</Text>
                    )}
                    <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
                      {r.days.length} días · {r.days.reduce((a, d) => a + d.exercises.length, 0)} ejercicios totales
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  {!isActive && (
                    <Button
                      title="Activar"
                      variant="secondary"
                      size="sm"
                      onPress={() => setActive(r.id)}
                    />
                  )}
                  <Button title="Duplicar" variant="ghost" size="sm" onPress={() => dup(r.id)} />
                  <View style={{ flex: 1 }} />
                  <Button
                    title="Eliminar"
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      Alert.alert('Eliminar', '¿Seguro?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => del(r.id) },
                      ])
                    }
                  />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
