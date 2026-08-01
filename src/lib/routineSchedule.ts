import type { Routine, RoutineDay } from '@/store/routines';
import type { Workout } from '@/store/workouts';

export function nextRoutineDay(
  routine: Routine | null | undefined,
  history: Workout[],
): RoutineDay | null {
  if (!routine?.days.length) return null;

  const dayIds = new Set(routine.days.map((day) => day.id));
  let latest: Workout | null = null;
  let latestStartedAt = Number.NEGATIVE_INFINITY;

  for (const workout of history) {
    if (!workout.routineDayId || !dayIds.has(workout.routineDayId)) continue;
    const startedAt = new Date(workout.startedAt).getTime();
    if (!Number.isFinite(startedAt) || startedAt <= latestStartedAt) continue;
    latest = workout;
    latestStartedAt = startedAt;
  }

  if (!latest?.routineDayId) return routine.days[0];
  const previousIndex = routine.days.findIndex(
    (day) => day.id === latest.routineDayId,
  );
  return routine.days[(previousIndex + 1) % routine.days.length] ?? routine.days[0];
}
