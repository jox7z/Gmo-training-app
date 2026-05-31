import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme/tokens';
import { useRoutinesStore } from '@/store/routines';
import { useAppStore, LOCAL_USER_ID } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { generateRoutine } from '@/lib/routineGenerator';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import { saveRoutine } from '@/lib/repos/routines';
import { isSupabaseConfigured } from '@/lib/supabase';
import { computeRoutineScore, MUSCLE_LABELS } from '@/lib/optimizationScore';

export default function Routines() {
  const router = useRouter();
  const routines = useRoutinesStore((s) => s.routines);
  const activeId = useRoutinesStore((s) => s.activeRoutineId);
  const setActive = useRoutinesStore((s) => s.setActiveRoutine);
  const upsert = useRoutinesStore((s) => s.upsertRoutine);
  const profile = useAppStore((s) => s.profile);
  const history = useWorkoutsStore((s) => s.history);

  // Una sola rutina por usuario.
  const activeRoutine = routines.find((r) => r.id === activeId) ?? routines[0] ?? null;
  const nextDay = activeRoutine?.days[history.length % (activeRoutine.days.length || 1)];

  const optScore = profile && activeRoutine ? computeRoutineScore(activeRoutine, profile) : null;
  const scoreColor = optScore
    ? optScore.score > 80
      ? colors.success
      : optScore.score >= 50
        ? colors.warning
        : colors.danger
    : colors.text.muted;

  const handleGenerate = () => {
    if (!profile) return;
    const { routine } = generateRoutine({
      level: profile.level,
      goal: profile.goal,
      daysPerWeek: profile.weeklyGoalDays,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
    });
    upsert(routine); // reemplaza la rutina actual (única)
    setActive(routine.id);
    if (isSupabaseConfigured && profile.id !== LOCAL_USER_ID) {
      saveRoutine(profile.id, routine).catch(() => {});
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({ pathname: '/routine/[id]', params: { id: routine.id } });
  };

  // "Cambiar rutina": como solo puede haber una, cambiar = editar la actual o
  // reemplazarla por una nueva (generada o desde cero).
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
        { text: 'Generar nueva con IA', onPress: handleGenerate },
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
        <Text variant="title">Mi rutina</Text>
      </View>

      {!activeRoutine ? (
        <View style={{ alignItems: 'center', marginTop: spacing['2xl'], gap: spacing.lg }}>
          <Text variant="heading" tone="muted" style={{ textAlign: 'center' }}>
            Aún no tienes una rutina
          </Text>
          <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
            Genera una con IA o créala manualmente
          </Text>
          <Card variant="glow" glowColor={colors.info.DEFAULT} padding="lg" style={{ width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Icon name="robot" size={28} color={colors.info.DEFAULT} />
              <View style={{ flex: 1 }}>
                <Text variant="heading" tone="info">¿No sabes qué hacer?</Text>
                <Text variant="caption" tone="secondary">Genera una rutina con IA en 3 segundos.</Text>
              </View>
            </View>
            <Button title="Generar rutina inteligente" variant="secondary" onPress={handleGenerate} style={{ marginTop: spacing.md }} fullWidth />
          </Card>
          <Button
            title="Crear rutina manual"
            variant="ghost"
            onPress={() => router.push({ pathname: '/routine/[id]', params: { id: 'new' } })}
            fullWidth
          />
        </View>
      ) : (
        <>
          <Card variant="glow" padding="lg" style={{ marginTop: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text variant="label" tone="brand">RUTINA ACTIVA</Text>
                <Text variant="title" style={{ marginTop: 4 }}>{activeRoutine.name}</Text>
                <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                  {activeRoutine.days.length} días · próximo: {nextDay?.name ?? '—'}
                </Text>
              </View>
              {nextDay && (
                <Button
                  title="Empezar"
                  size="sm"
                  onPress={() =>
                    router.push({
                      pathname: '/workout/active',
                      params: { routineId: activeRoutine.id, dayId: nextDay.id },
                    })
                  }
                />
              )}
            </View>
            <Button
              title="Cambiar rutina"
              variant="ghost"
              size="sm"
              onPress={handleChange}
              style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
            />
          </Card>

          {optScore && (
            <View style={{ marginTop: spacing['2xl'] }}>
              <Text variant="heading" style={{ marginBottom: spacing.md }}>Score de optimización</Text>
              <Card padding="lg">
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
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
