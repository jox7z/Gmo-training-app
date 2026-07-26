import type { Workout } from '@/store/workouts';

const MS_PER_DAY = 86_400_000;

export interface WeeklyTrainingProgress {
  /** Objetivo efectivo, normalizado al rango posible de días por semana. */
  weeklyGoalDays: number;
  /** Días locales distintos entrenados durante la semana actual. */
  daysThisWeek: number;
  /**
   * Semanas consecutivas que alcanzaron el objetivo.
   *
   * La semana actual solo se suma cuando ya cumplió el objetivo. Mientras está
   * incompleta no rompe la racha anterior; el corte definitivo ocurre al
   * comenzar el lunes siguiente.
   */
  streakWeeks: number;
}

/** Evita objetivos corruptos o imposibles; una semana admite 1..7 días. */
export function normalizeWeeklyGoalDays(value: number | undefined): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(7, Math.trunc(value as number)));
}

/**
 * Convierte una fecha absoluta a día civil LOCAL y después a un índice estable.
 *
 * `getFullYear/getMonth/getDate` respetan la zona horaria activa del dispositivo.
 * `Date.UTC` solo serializa esos componentes civiles: evita que DST convierta
 * una semana en 6,958 o 7,042 días. Si el usuario cambia la zona horaria, todo
 * el historial se reinterpreta en esa zona al volver a evaluar.
 */
function localDayIndex(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY,
  );
}

/** Índice de semana ISO civil, lunes como primer día. */
function localWeekIndex(date: Date): number {
  // 1970-01-01 fue jueves; +3 mueve el límite al lunes.
  return Math.floor((localDayIndex(date) + 3) / 7);
}

/**
 * Fuente única de progreso semanal: historial terminado + objetivo vigente.
 *
 * Cada día civil cuenta una vez aunque existan varios workouts. Todas las
 * semanas históricas deben alcanzar `weeklyGoalDays`. La semana actual tiene
 * gracia hasta terminar: si aún no cumple, devuelve la racha cerrada hasta la
 * semana anterior en vez de romperla anticipadamente.
 *
 * Cambiar `weeklyGoalDays` reevalúa todo el historial con el objetivo nuevo.
 */
export function weeklyTrainingProgress(
  history: readonly Workout[],
  weeklyGoalDays: number | undefined,
  now: Date = new Date(),
): WeeklyTrainingProgress {
  const goal = normalizeWeeklyGoalDays(weeklyGoalDays);
  const validNow = Number.isFinite(now.getTime()) ? now : new Date();
  const currentWeek = localWeekIndex(validNow);
  const daysByWeek = new Map<number, Set<number>>();

  for (const workout of history) {
    const date = new Date(workout.startedAt);
    if (!Number.isFinite(date.getTime())) continue;

    const week = localWeekIndex(date);
    const day = localDayIndex(date);
    const days = daysByWeek.get(week);
    if (days) days.add(day);
    else daysByWeek.set(week, new Set([day]));
  }

  const daysThisWeek = daysByWeek.get(currentWeek)?.size ?? 0;
  let cursor = daysThisWeek >= goal ? currentWeek : currentWeek - 1;
  let streakWeeks = 0;

  while ((daysByWeek.get(cursor)?.size ?? 0) >= goal) {
    streakWeeks++;
    cursor--;
  }

  return {
    weeklyGoalDays: goal,
    daysThisWeek,
    streakWeeks,
  };
}

/** Atajo cuando solo se necesita la racha. */
export function weeklyStreakFromHistory(
  history: readonly Workout[],
  weeklyGoalDays: number | undefined = 1,
  now: Date = new Date(),
): number {
  return weeklyTrainingProgress(history, weeklyGoalDays, now).streakWeeks;
}
