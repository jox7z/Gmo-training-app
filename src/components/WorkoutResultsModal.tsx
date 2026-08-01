/**
 * Registro factual de una sesión terminada.
 *
 * Muestra lo guardado por el usuario sin estimar máximos, declarar mejoras ni
 * convertir una sesión plana o peor en una recomendación automática.
 */

import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Text } from '@/components/ui/Text';
import { formatCompactDuration, formatDecimal } from '@/lib/format';
import { hasValidSetPerformance } from '@/lib/workoutValidation';
import { formatWeight, toDisplay } from '@/lib/units';
import { useAppStore } from '@/store/app';
import { useWorkoutsStore, type Workout } from '@/store/workouts';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';

interface Props {
  visible: boolean;
  workout: Workout | null;
  onClose: () => void;
}

export function WorkoutResultsModal({ visible, workout, onClose }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const unit = useAppStore((state) => state.profile?.unit ?? 'kg');
  const activeWorkout = useWorkoutsStore((state) => state.active);
  const startWorkoutFromHistory = useWorkoutsStore(
    (state) => state.startWorkoutFromHistory,
  );

  const data = useMemo(() => {
    if (!workout) return null;

    const exercises = workout.exercises
      .map((exercise) => ({
        exercise,
        sets: exercise.sets.filter(
          (set) =>
            set.isCompleted === true &&
            set.isWarmup !== true &&
            hasValidSetPerformance(set),
        ),
      }))
      .filter((entry) => entry.sets.length > 0);
    const sets = exercises.flatMap((entry) => entry.sets);
    const durationSeconds = recordedDurationSeconds(workout);

    return {
      exercises,
      durationSeconds,
      setCount: sets.length,
      totalReps: sets.reduce((total, set) => total + set.reps, 0),
      workKg: sets.reduce(
        (total, set) => total + Math.max(0, set.weightKg) * set.reps,
        0,
      ),
    };
  }, [workout]);

  if (!workout || !data) return null;

  const handleRepeat = async () => {
    if (!workout.exercises.length) return;
    if (activeWorkout) {
      const accepted = await confirm({
        title: 'Reemplazar sesión activa',
        message:
          'Se descartará el entrenamiento en curso antes de crear la repetición.',
        confirmLabel: 'Reemplazar',
        destructive: true,
      });
      if (!accepted) return;
    }
    if (!startWorkoutFromHistory(workout)) return;
    onClose();
    router.push('/workout/active');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text variant="caption" tone="muted">HISTORIAL</Text>
            <Text weight="bold" style={styles.headerTitle}>Registro de la sesión</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar registro de la sesión"
            onPress={onClose}
            hitSlop={spacing.sm}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Icon name="close" size={spacing.lg} color={colors.text.secondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Icon name="dumbbell" size={spacing['2xl']} color={colors.primary.DEFAULT} />
            </View>
            <View style={styles.heroCopy}>
              <Text variant="title" numberOfLines={2}>
                {workout.routineName ?? 'Entrenamiento libre'}
              </Text>
              <Text variant="caption" tone="muted" style={styles.heroDate}>
                {formatDateEs(workout.startedAt)}
              </Text>
            </View>
          </View>

          <Card variant="section" padding="lg">
            <View style={styles.statRow}>
              <SessionStat label="Duración" value={formatCompactDuration(data.durationSeconds)} />
              <SessionStat label="Ejercicios" value={String(data.exercises.length)} />
              <SessionStat label="Series" value={String(data.setCount)} />
            </View>
            <View style={styles.secondaryStats}>
              <SessionStat label="Repeticiones" value={formatDecimal(data.totalReps)} />
              {data.workKg > 0 ? (
                <SessionStat label="Trabajo" value={formatWork(data.workKg, unit)} />
              ) : null}
            </View>
          </Card>

          <View style={styles.listHeader}>
            <Text variant="heading">Ejercicios registrados</Text>
            <Text variant="caption" tone="muted">
              Solo series efectivas completadas
            </Text>
          </View>

          <View style={styles.exerciseList}>
            {data.exercises.map(({ exercise, sets }, exerciseIndex) => (
              <View key={exercise.id} style={styles.exerciseSection}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseIndex}>
                    <Text variant="caption" tone="brand" weight="bold" numeric>
                      {String(exerciseIndex + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <View style={styles.exerciseCopy}>
                    <Text weight="bold" numberOfLines={1}>{exercise.exerciseName}</Text>
                    <Text variant="caption" tone="muted">
                      {sets.length} {sets.length === 1 ? 'serie' : 'series'}
                    </Text>
                  </View>
                </View>

                <View style={styles.setList}>
                  {sets.map((set, index) => (
                    <View key={set.id ?? `${exercise.id}-set-${index}`} style={styles.setRow}>
                      <Text variant="caption" tone="muted" style={styles.setLabel}>
                        SERIE {index + 1}
                      </Text>
                      <Text variant="caption" weight="semibold" numeric style={styles.setValue}>
                        {set.reps} reps · {formatWeight(set.weightKg, unit)}
                        {isValidDuration(set.durationSeconds)
                          ? ` · ${formatCompactDuration(set.durationSeconds)}`
                          : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <Text variant="caption" tone="muted" style={styles.footerNote}>
            Valores guardados en esta sesión.
          </Text>
          {workout.exercises.length > 0 ? (
            <Button
              title="Repetir sesión"
              variant="secondary"
              onPress={() => void handleRepeat()}
              style={styles.repeatButton}
              fullWidth
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SessionStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="heading" numeric numberOfLines={1} style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

function elapsedSeconds(workout: Workout): number {
  if (!workout.endedAt) return 0;
  const start = Date.parse(workout.startedAt);
  const end = Date.parse(workout.endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

function recordedDurationSeconds(workout: Workout): number {
  return isValidDuration(workout.durationSeconds)
    ? workout.durationSeconds
    : elapsedSeconds(workout);
}

function isValidDuration(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function formatDateEs(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatWork(workKg: number, unit: 'kg' | 'lb'): string {
  return `${formatDecimal(toDisplay(workKg, unit))} ${unit}·rep`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    marginTop: 2,
    fontSize: fontSize.lg,
  },
  closeButton: {
    width: spacing['2xl'] + spacing.md,
    height: spacing['2xl'] + spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: spacing['3xl'],
    height: spacing['3xl'],
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.muted,
  },
  heroCopy: {
    flex: 1,
  },
  heroDate: {
    marginTop: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    marginTop: spacing.xs,
  },
  listHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  exerciseList: {
    gap: spacing.md,
  },
  exerciseSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseIndex: {
    width: spacing['2xl'],
    height: spacing['2xl'],
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.muted,
  },
  exerciseCopy: {
    flex: 1,
  },
  setList: {
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: spacing.xl,
  },
  setLabel: {
    width: spacing['4xl'],
  },
  setValue: {
    flex: 1,
  },
  footerNote: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  repeatButton: {
    marginTop: spacing.md,
  },
});
