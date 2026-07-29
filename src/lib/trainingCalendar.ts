import type { Workout } from '@/store/workouts';

export type TrainingDensity = 0 | 1 | 2 | 3;

export interface TrainingCalendarDay {
  /** Clave de día civil local, estable y ordenable (`YYYY-MM-DD`). */
  key: string;
  date: Date;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  workoutCount: number;
  /** 3 representa tres o más sesiones. */
  density: TrainingDensity;
  workouts: Workout[];
}

export interface TrainingCalendarMonth {
  /** Primer día del mes mostrado, al mediodía local. */
  anchor: Date;
  year: number;
  month: number;
  /** Siempre seis semanas por siete días, con lunes primero. */
  days: TrainingCalendarDay[];
  daysTrained: number;
  workoutCount: number;
}

const GRID_DAYS = 42;

function validDate(value: Date, fallback: Date): Date {
  return Number.isFinite(value.getTime()) ? value : fallback;
}

function monthIndex(value: Date): number {
  return value.getFullYear() * 12 + value.getMonth();
}

/** Normaliza a día 1 al mediodía local para evitar bordes de DST. */
export function startOfTrainingMonth(
  value: Date,
  fallback: Date = new Date(),
): Date {
  const safeFallback = Number.isFinite(fallback.getTime())
    ? fallback
    : new Date();
  const safe = validDate(value, safeFallback);
  return new Date(safe.getFullYear(), safe.getMonth(), 1, 12);
}

/** Nunca permite que el mes visible avance más allá del mes civil actual. */
export function clampTrainingMonth(
  value: Date,
  now: Date = new Date(),
): Date {
  const current = startOfTrainingMonth(now);
  const candidate = startOfTrainingMonth(value, current);
  return monthIndex(candidate) > monthIndex(current) ? current : candidate;
}

export function shiftTrainingMonth(
  value: Date,
  delta: number,
  now: Date = new Date(),
): Date {
  const anchor = clampTrainingMonth(value, now);
  const safeDelta = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  return clampTrainingMonth(
    new Date(anchor.getFullYear(), anchor.getMonth() + safeDelta, 1, 12),
    now,
  );
}

export function canNavigateToNextTrainingMonth(
  value: Date,
  now: Date = new Date(),
): boolean {
  const anchor = clampTrainingMonth(value, now);
  const current = startOfTrainingMonth(now);
  return monthIndex(anchor) < monthIndex(current);
}

export function localTrainingDayKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Construye un calendario factual desde sesiones terminadas del store local.
 *
 * Agrupa por día civil del dispositivo, ignora fechas inválidas/futuras y
 * conserva las sesiones del mismo día para abrir su ledger exacto.
 */
export function buildTrainingCalendarMonth(
  history: readonly Workout[],
  requestedMonth: Date,
  now: Date = new Date(),
): TrainingCalendarMonth {
  const safeNow = Number.isFinite(now.getTime()) ? now : new Date();
  const anchor = clampTrainingMonth(requestedMonth, safeNow);
  const todayKey = localTrainingDayKey(safeNow);
  const workoutsByDay = new Map<string, Workout[]>();

  for (const workout of history) {
    const startedAt = new Date(workout.startedAt);
    const startedMs = startedAt.getTime();
    if (!Number.isFinite(startedMs) || startedMs > safeNow.getTime()) continue;

    const key = localTrainingDayKey(startedAt);
    const workouts = workoutsByDay.get(key);
    if (workouts) workouts.push(workout);
    else workoutsByDay.set(key, [workout]);
  }

  for (const workouts of workoutsByDay.values()) {
    workouts.sort(
      (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
    );
  }

  const mondayOffset = (anchor.getDay() + 6) % 7;
  const gridStart = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    1 - mondayOffset,
    12,
  );
  const days: TrainingCalendarDay[] = [];

  for (let index = 0; index < GRID_DAYS; index++) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
      12,
    );
    const key = localTrainingDayKey(date);
    const isFuture = key > todayKey;
    const workouts = isFuture ? [] : [...(workoutsByDay.get(key) ?? [])];
    const workoutCount = workouts.length;

    days.push({
      key,
      date,
      dayOfMonth: date.getDate(),
      inMonth:
        date.getFullYear() === anchor.getFullYear() &&
        date.getMonth() === anchor.getMonth(),
      isToday: key === todayKey,
      isFuture,
      workoutCount,
      density: Math.min(3, workoutCount) as TrainingDensity,
      workouts,
    });
  }

  const currentMonthDays = days.filter((day) => day.inMonth);

  return {
    anchor,
    year: anchor.getFullYear(),
    month: anchor.getMonth(),
    days,
    daysTrained: currentMonthDays.filter((day) => day.workoutCount > 0).length,
    workoutCount: currentMonthDays.reduce(
      (total, day) => total + day.workoutCount,
      0,
    ),
  };
}
