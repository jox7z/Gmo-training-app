import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type HostInstance,
} from 'react-native';

import { Icon } from '@/components/Icon';
import { WorkoutResultsModal } from '@/components/WorkoutResultsModal';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Sheet } from '@/components/ui/Sheet';
import { Stat } from '@/components/ui/Stat';
import { Text } from '@/components/ui/Text';
import {
  buildTrainingCalendarMonth,
  canNavigateToNextTrainingMonth,
  clampTrainingMonth,
  shiftTrainingMonth,
  type TrainingCalendarDay,
  type TrainingDensity,
} from '@/lib/trainingCalendar';
import type { Workout } from '@/store/workouts';
import { colors, radius, spacing } from '@/theme/tokens';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

const DENSITY_COLORS: Readonly<Record<TrainingDensity, string>> = {
  0: colors.surfaceVeil,
  1: colors.info.soft,
  2: colors.accent.soft,
  3: colors.primary.muted,
};

interface Props {
  history: readonly Workout[];
  streakWeeks: number;
  daysThisWeek: number;
  weeklyGoalDays: number;
}

export function MonthlyTrainingCalendar({
  history,
  streakWeeks,
  daysThisWeek,
  weeklyGoalDays,
}: Props) {
  const { fontScale } = useWindowDimensions();
  const stackStats = fontScale >= 1.35;
  const [now, setNow] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() =>
    clampTrainingMonth(new Date()),
  );
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [dayChoices, setDayChoices] = useState<TrainingCalendarDay | null>(null);
  const daySheetReturnFocusTarget = useRef<HostInstance | null>(null);

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>;

    const refreshDate = () => {
      const nextNow = new Date();
      setNow(nextNow);
      setVisibleMonth((current) => clampTrainingMonth(current, nextNow));
    };
    const scheduleMidnight = () => {
      const current = new Date();
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
        0,
        0,
        1,
      );
      midnightTimer = setTimeout(() => {
        refreshDate();
        scheduleMidnight();
      }, Math.max(1_000, nextMidnight.getTime() - current.getTime()));
    };

    scheduleMidnight();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      clearTimeout(midnightTimer);
      refreshDate();
      scheduleMidnight();
    });

    return () => {
      clearTimeout(midnightTimer);
      subscription.remove();
    };
  }, []);

  const calendar = useMemo(
    () => buildTrainingCalendarMonth(history, visibleMonth, now),
    [history, now, visibleMonth],
  );
  const canGoNext = canNavigateToNextTrainingMonth(visibleMonth, now);

  const openDay = (
    day: TrainingCalendarDay,
    returnFocusTarget: HostInstance,
  ) => {
    if (!day.inMonth || day.isFuture || day.workouts.length === 0) return;
    if (day.workouts.length === 1) {
      setSelectedWorkout(day.workouts[0]);
      return;
    }
    daySheetReturnFocusTarget.current = returnFocusTarget;
    setDayChoices(day);
  };

  return (
    <>
      <Card variant="section" padding={0} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text variant="heading">Calendario de entrenamiento</Text>
            <Text variant="caption" tone="muted">
              Sesiones terminadas por día
            </Text>
          </View>
          <View style={styles.monthNavigation}>
            <IconButton
              name="chevron-left"
              accessibilityLabel="Ver mes anterior"
              onPress={() =>
                setVisibleMonth((current) =>
                  shiftTrainingMonth(current, -1, now),
                )
              }
              variant="surface"
              size="md"
              haptic={false}
            />
            <IconButton
              name="chevron-right"
              accessibilityLabel="Ver mes siguiente"
              onPress={() =>
                setVisibleMonth((current) =>
                  shiftTrainingMonth(current, 1, now),
                )
              }
              variant="surface"
              size="md"
              disabled={!canGoNext}
              haptic={false}
            />
          </View>
        </View>

        <View style={styles.monthTitleRow}>
          <Text
            variant="subheading"
            weight="bold"
            style={styles.monthTitle}
          >
            {formatMonth(calendar.anchor)}
          </Text>
          <Text variant="caption" tone="secondary" numeric>
            {calendar.workoutCount}{' '}
            {calendar.workoutCount === 1 ? 'sesión' : 'sesiones'}
          </Text>
        </View>

        <View style={[styles.stats, stackStats && styles.statsStacked]}>
          <Stat
            label="Racha actual"
            value={streakWeeks}
            unit={streakWeeks === 1 ? 'semana' : 'semanas'}
            icon="fire"
            tone="accent"
            size="md"
            labelNumberOfLines={2}
            style={styles.stat}
          />
          <View
            style={[
              styles.statDivider,
              stackStats && styles.statDividerStacked,
            ]}
          />
          <Stat
            label="Días del mes"
            value={calendar.daysTrained}
            icon="calendar"
            tone="brand"
            size="md"
            labelNumberOfLines={2}
            style={styles.stat}
          />
        </View>
        <Text variant="caption" tone="muted" style={styles.goal}>
          Semana actual: {daysThisWeek} de {weeklyGoalDays}{' '}
          {weeklyGoalDays === 1 ? 'día' : 'días'} del objetivo
        </Text>

        <View style={styles.calendar} accessibilityLabel="Calendario mensual">
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((weekday) => (
              <Text
                key={weekday}
                variant="label"
                tone="muted"
                style={styles.weekday}
              >
                {weekday}
              </Text>
            ))}
          </View>

          {Array.from({ length: 6 }, (_, rowIndex) => (
            <View key={rowIndex} style={styles.weekRow}>
              {calendar.days
                .slice(rowIndex * 7, rowIndex * 7 + 7)
                .map((day) => (
                  <CalendarDay
                    key={day.key}
                    day={day}
                    onPress={(event) => openDay(day, event.currentTarget)}
                  />
                ))}
            </View>
          ))}
        </View>

        <View
          style={styles.legend}
          accessibilityLabel="Intensidad por cantidad de sesiones"
        >
          {(
            [
              { density: 0, label: '0' },
              { density: 1, label: '1' },
              { density: 2, label: '2' },
              { density: 3, label: '3+' },
            ] as const
          ).map((item) => (
            <View key={item.density} style={styles.legendItem}>
              <View
                style={[
                  styles.legendSwatch,
                  { backgroundColor: DENSITY_COLORS[item.density] },
                ]}
              />
              <Text variant="caption" tone="secondary" numeric>
                {item.label}
              </Text>
            </View>
          ))}
          <Text variant="caption" tone="muted" style={styles.legendLabel}>
            sesiones por día
          </Text>
        </View>
      </Card>

      <Sheet
        visible={dayChoices !== null}
        onClose={() => setDayChoices(null)}
        title={dayChoices ? formatLongDate(dayChoices.date) : 'Sesiones del día'}
        subtitle={
          dayChoices
            ? `${dayChoices.workoutCount} sesiones registradas`
            : undefined
        }
        scroll
        maxHeightRatio={0.7}
        returnFocusTarget={daySheetReturnFocusTarget.current}
      >
        {dayChoices?.workouts.map((workout) => (
          <PressableScale
            key={workout.id}
            accessibilityRole="button"
            accessibilityLabel={`${workout.routineName ?? 'Entrenamiento libre'}, ${formatTime(workout.startedAt)}`}
            accessibilityHint="Abre el registro de esta sesión"
            onPress={() => {
              daySheetReturnFocusTarget.current = null;
              setDayChoices(null);
              setSelectedWorkout(workout);
            }}
            haptic={false}
            pressScale={0.98}
            style={styles.workoutRow}
          >
            <View style={styles.workoutIcon}>
              <Icon
                name="dumbbell"
                size={spacing.lg}
                color={colors.primary.DEFAULT}
              />
            </View>
            <View style={styles.workoutCopy}>
              <Text weight="bold" numberOfLines={1}>
                {workout.routineName ?? 'Entrenamiento libre'}
              </Text>
              <Text variant="caption" tone="muted">
                {formatTime(workout.startedAt)} · {workout.exercises.length}{' '}
                {workout.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={spacing.lg}
              color={colors.text.secondary}
            />
          </PressableScale>
        ))}
      </Sheet>

      <WorkoutResultsModal
        visible={selectedWorkout !== null}
        workout={selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
      />
    </>
  );
}

function CalendarDay({
  day,
  onPress,
}: {
  day: TrainingCalendarDay;
  onPress: (event: GestureResponderEvent) => void;
}) {
  const canOpen =
    day.inMonth && !day.isFuture && day.workoutCount > 0;
  const countLabel =
    day.workoutCount >= 3 ? '3+' : day.workoutCount > 0 ? day.workoutCount : '';

  return (
    <PressableScale
      accessible={day.inMonth}
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={
        day.inMonth
          ? `${formatLongDate(day.date)}, ${
              day.workoutCount === 0
                ? 'sin sesiones'
                : `${day.workoutCount} ${
                    day.workoutCount === 1 ? 'sesión' : 'sesiones'
                  }`
            }${day.isToday ? ', hoy' : ''}`
          : undefined
      }
      accessibilityHint={
        canOpen
          ? day.workoutCount === 1
            ? 'Abre el registro de la sesión'
            : 'Permite elegir una sesión de este día'
          : undefined
      }
      onPress={onPress}
      disabled={!canOpen}
      haptic={false}
      pressScale={0.94}
      style={[
        styles.day,
        day.inMonth && {
          backgroundColor: DENSITY_COLORS[day.density],
        },
        !day.inMonth && styles.dayOutside,
        day.isFuture && styles.dayFuture,
        day.isToday && styles.dayToday,
      ]}
    >
      <Text
        variant="caption"
        tone={
          !day.inMonth || day.isFuture
            ? 'muted'
            : 'primary'
        }
        weight={day.isToday ? 'bold' : 'semibold'}
        numeric
      >
        {day.dayOfMonth}
      </Text>
      <Text
        variant="caption"
        tone={day.workoutCount > 0 ? 'primary' : 'secondary'}
        weight="bold"
        numeric
        style={styles.dayCount}
      >
        {countLabel}
      </Text>
    </PressableScale>
  );
}

function formatMonth(date: Date): string {
  const label = date.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toLocaleUpperCase('es') + label.slice(1);
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Hora sin datos';
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: -spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  monthNavigation: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  monthTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  monthTitle: {
    flexShrink: 1,
    minWidth: 0,
  },
  stats: {
    alignItems: 'stretch',
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
    minWidth: 0,
  },
  statDivider: {
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    width: StyleSheet.hairlineWidth,
  },
  statsStacked: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  statDividerStacked: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
    width: '100%',
  },
  goal: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  calendar: {
    marginTop: spacing.lg,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
  },
  weekday: {
    flex: 1,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
  },
  day: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 0,
    paddingVertical: spacing.xs,
  },
  dayOutside: {
    backgroundColor: 'transparent',
    opacity: 0.35,
  },
  dayFuture: {
    backgroundColor: 'transparent',
  },
  dayToday: {
    borderColor: colors.text.primary,
  },
  dayCount: {
    minHeight: 18,
  },
  legend: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendSwatch: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: spacing.md,
    width: spacing.md,
  },
  legendLabel: {
    flexShrink: 1,
  },
  workoutRow: {
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: spacing['4xl'],
    padding: spacing.md,
  },
  workoutIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary.muted,
    borderRadius: radius.sm,
    height: spacing['2xl'],
    justifyContent: 'center',
    width: spacing['2xl'],
  },
  workoutCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
});
