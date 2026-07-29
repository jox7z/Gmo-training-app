/**
 * Modal selector de rutinas famosas predefinidas.
 * Accesible desde el estado vacío de la pestaña Rutinas y desde el Alert "Cambiar rutina".
 */
import { Alert, ScrollView, View } from 'react-native';
import { useMemo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/theme/tokens';
import { famousRoutineOptions } from '@/data/routineTemplates';
import { useRoutinesStore } from '@/store/routines';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import { saveRoutine } from '@/lib/repos/routines';

export default function TemplatesModal() {
  const router = useRouter();
  // Una sola generación con ids frescos; evita regenerar (y remontar) en cada render.
  const options = useMemo(() => famousRoutineOptions(), []);

  const applyTemplate = async (idx: number) => {
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

  const handleSelect = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    const current = useRoutinesStore.getState().routines[0];
    if (!current || current.id === opt.routine.id) {
      void applyTemplate(idx);
      return;
    }

    Alert.alert(
      'Reemplazar rutina',
      `“${opt.label}” reemplazará “${current.name}”. Tu historial no se borra y un entrenamiento en curso seguirá disponible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reemplazar',
          style: 'destructive',
          onPress: () => void applyTemplate(idx),
        },
      ],
    );
  };

  return (
    <Screen scroll={false} padded={false}>
      <ScreenHeader
        title="Plantillas famosas"
        subtitle="Rutinas base que puedes copiar y editar a tu gusto"
        border
      />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing['3xl'],
          gap: spacing.md,
        }}
      >
        {options.map((opt, i) => (
          // Card de plantilla con entrada escalonada
          <Animated.View
            key={opt.routine.id}
            entering={FadeInDown.delay(Math.min(i, 8) * 60).springify().damping(18)}
          >
            <Card variant="raised" padding="lg" style={{ gap: spacing.sm }}>
              {/* Badge "Famosa" */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View
                  style={{
                    backgroundColor: colors.primary.muted,
                    borderRadius: radius.sm,
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
                        borderRadius: radius.full,
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
          </Animated.View>
        ))}
      </ScrollView>
    </Screen>
  );
}
