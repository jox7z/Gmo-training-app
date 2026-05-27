import { useState } from 'react';
import { View, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, radius } from '@/theme/tokens';
import { useRoutinesStore } from '@/store/routines';
import { useAppStore, LOCAL_USER_ID } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { generateRoutine } from '@/lib/routineGenerator';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import { saveRoutine, deleteRoutineRemote } from '@/lib/repos/routines';
import { isSupabaseConfigured } from '@/lib/supabase';
import { computeOptimizationScore, MUSCLE_LABELS } from '@/lib/optimizationScore';

export default function Routines() {
  const router = useRouter();
  const routines = useRoutinesStore((s) => s.routines);
  const activeId = useRoutinesStore((s) => s.activeRoutineId);
  const setActive = useRoutinesStore((s) => s.setActiveRoutine);
  const upsert = useRoutinesStore((s) => s.upsertRoutine);
  const dup = useRoutinesStore((s) => s.duplicateRoutine);
  const del = useRoutinesStore((s) => s.deleteRoutine);
  const profile = useAppStore((s) => s.profile);
  const history = useWorkoutsStore((s) => s.history);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeRoutine = routines.find((r) => r.id === activeId) ?? routines[0];
  const nextDay = activeRoutine?.days[history.length % (activeRoutine?.days.length || 1)];

  const optScore = profile
    ? computeOptimizationScore(history, profile)
    : null;
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
    upsert(routine);
    setActive(routine.id);
    if (isSupabaseConfigured && profile.id !== LOCAL_USER_ID) {
      saveRoutine(profile.id, routine).catch(() => {});
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({ pathname: '/routine/[id]', params: { id: routine.id } });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
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
          <Text variant="title">Mis rutinas</Text>
        </View>
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

      {activeRoutine && (
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
            onPress={() => setPickerOpen(true)}
            style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
          />
        </Card>
      )}

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
                      {(['frequency', 'volumeBalance', 'recovery', 'progression', 'variety'] as const).map((key) => {
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
                    Completa workouts para ver tu análisis
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </View>
      )}

      <Card variant="glow" glowColor={colors.info.DEFAULT} padding="lg" style={{ marginTop: spacing['2xl'] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Icon name="robot" size={28} color={colors.info.DEFAULT} />
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
                  <Button
                    title="Duplicar"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      const copy = dup(r.id);
                      if (copy && isSupabaseConfigured && profile?.id !== LOCAL_USER_ID) {
                        saveRoutine(profile!.id, copy).catch(() => {});
                      }
                    }}
                  />
                  <View style={{ flex: 1 }} />
                  <Button
                    title="Eliminar"
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      Alert.alert('Eliminar', '¿Seguro?', [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Eliminar',
                          style: 'destructive',
                          onPress: () => {
                            del(r.id);
                            if (isSupabaseConfigured && profile?.id !== LOCAL_USER_ID) {
                              deleteRoutineRemote(r.id).catch(() => {});
                            }
                          },
                        },
                      ])
                    }
                  />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg.overlay, justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.bg.base,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              maxHeight: '80%',
              padding: spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="title">Cambiar rutina</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={12}>
                <Icon name="close" size={22} color={colors.text.muted} />
              </Pressable>
            </View>
            <ScrollView style={{ marginTop: spacing.md }}>
              {routines.map((r) => {
                const selected = r.id === activeId;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      setActive(r.id);
                      Haptics.selectionAsync();
                      setPickerOpen(false);
                    }}
                    style={{ marginBottom: spacing.sm }}
                  >
                    <Card padding="md" variant={selected ? 'glow' : 'default'}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text weight="bold">{r.name}</Text>
                          <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                            {r.days.length} días · {r.days.reduce((a, d) => a + d.exercises.length, 0)} ejercicios
                          </Text>
                        </View>
                        {selected && <Icon name="check" size={20} color={colors.primary.DEFAULT} />}
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
