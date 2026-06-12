/**
 * Modal selector de rutinas famosas predefinidas.
 * Accesible desde el estado vacío de la pestaña Rutinas y desde el Alert "Cambiar rutina".
 */
import { ScrollView, View, Pressable } from 'react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { colors, spacing } from '@/theme/tokens';
import { famousRoutineOptions } from '@/data/routineTemplates';
import { useRoutinesStore } from '@/store/routines';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import { saveRoutine } from '@/lib/repos/routines';

export default function TemplatesModal() {
  const router = useRouter();
  // Una sola generación con ids frescos; evita regenerar (y remontar) en cada render.
  const options = useMemo(() => famousRoutineOptions(), []);

  const handleSelect = async (idx: number) => {
    const opt = options[idx];
    if (!opt) return;

    const { upsertRoutine, setActiveRoutine } = useRoutinesStore.getState();
    upsertRoutine(opt.routine);
    setActiveRoutine(opt.routine.id);

    if (isSupabaseConfigured) {
      const userId = await getCurrentUserId();
      if (userId) {
        saveRoutine(userId, opt.routine).catch(() => {});
      }
    }

    router.back();
  };

  return (
    <Screen scroll={false} padded={false}>
      {/* Cabecera */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing.md,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Icon name="chevron-left" size={24} color={colors.text.secondary} />
        </Pressable>
        <Text variant="title" style={{ flex: 1 }}>
          Plantillas famosas
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing['3xl'],
          gap: spacing.md,
        }}
      >
        {options.map((opt, i) => (
          <Card key={opt.routine.id} variant="raised" padding="lg" style={{ gap: spacing.sm }}>
            {/* Badge "Famosa" */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  backgroundColor: colors.primary.muted,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  variant="caption"
                  weight="bold"
                  style={{ color: colors.primary.DEFAULT, fontSize: 10 }}
                >
                  FAMOSA
                </Text>
              </View>
              <Text variant="heading">{opt.label}</Text>
            </View>

            <Text variant="caption" tone="secondary">
              {opt.summary}
            </Text>

            {/* Lista de días */}
            <View style={{ gap: 4, marginTop: spacing.xs }}>
              {opt.routine.days.map((day) => (
                <View
                  key={day.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.primary.DEFAULT,
                    }}
                  />
                  <Text variant="caption" tone="secondary">
                    <Text variant="caption" weight="semibold">
                      {day.name}
                    </Text>
                    {' · '}
                    {day.exercises.length} ejercicios
                  </Text>
                </View>
              ))}
            </View>

            <Button
              title="Elegir esta rutina"
              onPress={() => handleSelect(i)}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
