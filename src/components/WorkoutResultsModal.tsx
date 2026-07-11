/**
 * WorkoutResultsModal — ventana visual de resultados al tocar un workout en el historial.
 *
 * Muestra un héroe (bíceps), una frase motivadora y, por cada ejercicio,
 * el detalle serie a serie (reps × peso). Incluye badge PR/▲ Mejora donde aplica.
 */

import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing, fontSize } from '@/theme/tokens';
import { useWorkoutsStore, type Workout } from '@/store/workouts';
import { useAppStore } from '@/store/app';
import {
  findPreviousSession,
  comparePerExercise,
  detectPRs,
  summarizeProgress,
} from '@/lib/workoutCompare';
import { formatWeight } from '@/lib/units';

const GOLD = '#FFD700';

const PROGRESS_LABEL = {
  pr:     '¡Nuevo récord personal!',
  weight: '¡Más fuerte que antes!',
  reps:   '¡Una rep más!',
  none:   '¡Sigue así, cada entreno cuenta!',
};

function formatDateEs(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

interface Props {
  visible: boolean;
  workout: Workout | null;
  onClose: () => void;
}

export function WorkoutResultsModal({ visible, workout, onClose }: Props) {
  const history = useWorkoutsStore((s) => s.history);
  const unit    = useAppStore((s) => s.profile?.unit ?? 'kg');

  // Cálculos derivados (solo cuando hay workout). Memoizado para no recomputar
  // en cada render mientras el modal está montado.
  const data = useMemo(() => {
    if (!workout) return null;
    const previousSession = findPreviousSession(history, workout);
    const comparisons     = comparePerExercise(workout, previousSession);
    const prs             = detectPRs(history, workout);
    const progress        = summarizeProgress(comparisons, prs);
    // Ejercicios con al menos una serie completada, con sus series.
    const exercises = workout.exercises
      .map((ex) => ({
        ex,
        sets: ex.sets.filter((s) => s.isCompleted && !s.isWarmup),
      }))
      .filter((e) => e.sets.length > 0);
    return { comparisons, prs, progress, exercises };
  }, [history, workout]);

  if (!workout || !data) return null;

  const { comparisons, prs, progress, exercises } = data;
  const hasProgress = progress.improvedCount > 0 || progress.prCount > 0;

  const progressPhrase = progress.prCount > 0
    ? PROGRESS_LABEL.pr
    : progress.gainedWeight
    ? PROGRESS_LABEL.weight
    : progress.gainedReps
    ? PROGRESS_LABEL.reps
    : PROGRESS_LABEL.none;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
        {/* Header bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text weight="bold" style={{ fontSize: fontSize.lg }}>Resultados</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.bg.elevated : 'transparent',
            })}
          >
            <Icon name="close" size={18} color={colors.text.secondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingTop: spacing['2xl'],
            paddingBottom: spacing['3xl'],
            paddingHorizontal: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ---- Hero ---- */}
          <View style={{ alignItems: 'center', marginBottom: spacing['2xl'] }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                borderWidth: 2,
                borderColor: colors.primary.DEFAULT,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Icon name="muscle" size={40} color={colors.primary.DEFAULT} filled />
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: fontSize['2xl'],
                  fontWeight: '800',
                  color: colors.text.primary,
                  textAlign: 'center',
                  letterSpacing: -0.5,
                }}
                numberOfLines={2}
              >
                {workout.routineName ?? 'Entrenamiento libre'}
              </Text>
              <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
                {formatDateEs(workout.startedAt)}
              </Text>
            </View>
          </View>

          {/* ---- Frase motivadora ---- */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text
              style={{
                fontSize: fontSize.md,
                fontWeight: '700',
                color: progress.prCount > 0 ? GOLD : hasProgress ? colors.success : colors.text.primary,
                textAlign: 'center',
              }}
            >
              {progressPhrase}
            </Text>
          </View>

          {/* ---- Detalle por ejercicio (series: reps × peso) ---- */}
          <View style={{ gap: spacing.md }}>
            {exercises.map(({ ex, sets }) => {
              const isPR  = prs.has(ex.exerciseId);
              const comp  = comparisons.find((c) => c.exerciseId === ex.exerciseId);
              const badge = isPR
                ? { label: 'PR', color: GOLD, bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.45)' }
                : comp?.improved
                ? { label: '▲ Mejora', color: colors.success, bg: colors.bg.elevated, border: colors.border }
                : null;

              return (
                <Card
                  key={ex.id}
                  padding="md"
                  style={isPR ? { borderWidth: 1, borderColor: 'rgba(255,215,0,0.5)' } : undefined}
                >
                  {/* Encabezado: nombre + badge */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <Icon name="dumbbell" size={15} color={colors.text.secondary} />
                    <Text style={{ flex: 1 }} numberOfLines={1} weight="bold">
                      {ex.exerciseName}
                    </Text>
                    {badge && (
                      <View
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 2,
                          borderRadius: radius.full,
                          backgroundColor: badge.bg,
                          borderWidth: 1,
                          borderColor: badge.border,
                        }}
                      >
                        <Text variant="caption" weight="bold" style={{ color: badge.color }}>
                          {badge.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Series: reps × peso */}
                  <View style={{ gap: 4 }}>
                    {sets.map((s, j) => (
                      <View
                        key={s.id ?? `${ex.id}-set-${j}`}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                      >
                        <Text variant="caption" tone="muted" style={{ width: 56 }}>
                          Serie {j + 1}
                        </Text>
                        <Text variant="caption" weight="semibold" numeric>
                          {s.reps} reps · {formatWeight(s.weightKg, unit)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

