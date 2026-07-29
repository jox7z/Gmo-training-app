import { describe, expect, test } from '@jest/globals';

import {
  buildTrainingCalendarMonth,
  canNavigateToNextTrainingMonth,
  shiftTrainingMonth,
} from '@/lib/trainingCalendar';

import { makeWorkout } from './helpers/fixtures';

function localWorkout(
  id: string,
  year: number,
  month: number,
  day: number,
  hour = 12,
) {
  return makeWorkout({
    id,
    startedAt: new Date(year, month - 1, day, hour).toISOString(),
  });
}

describe('trainingCalendar', () => {
  const now = new Date(2026, 6, 19, 12);

  test('siempre construye 6x7 con lunes primero', () => {
    const calendar = buildTrainingCalendarMonth(
      [],
      new Date(2026, 6, 15),
      now,
    );

    expect(calendar.days).toHaveLength(42);
    expect(calendar.days[0]).toEqual(
      expect.objectContaining({
        key: '2026-06-29',
        inMonth: false,
      }),
    );
    expect(calendar.days[2]).toEqual(
      expect.objectContaining({
        key: '2026-07-01',
        inMonth: true,
      }),
    );
    expect(calendar.days[41].key).toBe('2026-08-09');
  });

  test('agrupa sesiones por día local en bins 0/1/2/3+', () => {
    const history = [
      localWorkout('uno', 2026, 7, 2, 8),
      localWorkout('dos-mañana', 2026, 7, 3, 8),
      localWorkout('dos-tarde', 2026, 7, 3, 18),
      localWorkout('tres-1', 2026, 7, 4, 7),
      localWorkout('tres-2', 2026, 7, 4, 9),
      localWorkout('tres-3', 2026, 7, 4, 11),
      localWorkout('tres-4', 2026, 7, 4, 13),
    ];
    const calendar = buildTrainingCalendarMonth(
      history,
      new Date(2026, 6, 1),
      now,
    );
    const byKey = new Map(calendar.days.map((day) => [day.key, day]));

    expect(byKey.get('2026-07-02')).toEqual(
      expect.objectContaining({ workoutCount: 1, density: 1 }),
    );
    expect(byKey.get('2026-07-03')).toEqual(
      expect.objectContaining({ workoutCount: 2, density: 2 }),
    );
    expect(byKey.get('2026-07-03')?.workouts.map((workout) => workout.id)).toEqual([
      'dos-tarde',
      'dos-mañana',
    ]);
    expect(byKey.get('2026-07-04')).toEqual(
      expect.objectContaining({ workoutCount: 4, density: 3 }),
    );
    expect(calendar.daysTrained).toBe(3);
    expect(calendar.workoutCount).toBe(7);
  });

  test('omite fechas inválidas y sesiones futuras', () => {
    const calendar = buildTrainingCalendarMonth(
      [
        localWorkout('hoy', 2026, 7, 19, 8),
        localWorkout('más-tarde', 2026, 7, 19, 18),
        localWorkout('mañana', 2026, 7, 20, 8),
        makeWorkout({ id: 'inválido', startedAt: 'fecha-inválida' }),
      ],
      new Date(2026, 6, 1),
      now,
    );
    const today = calendar.days.find((day) => day.key === '2026-07-19');
    const tomorrow = calendar.days.find((day) => day.key === '2026-07-20');

    expect(today?.workouts.map((workout) => workout.id)).toEqual(['hoy']);
    expect(tomorrow).toEqual(
      expect.objectContaining({
        isFuture: true,
        workoutCount: 0,
      }),
    );
  });

  test('navega hacia atrás pero nunca después del mes actual', () => {
    const future = buildTrainingCalendarMonth(
      [],
      new Date(2027, 0, 1),
      now,
    );

    expect([future.year, future.month]).toEqual([2026, 6]);
    expect(canNavigateToNextTrainingMonth(new Date(2026, 5, 1), now)).toBe(true);
    expect(canNavigateToNextTrainingMonth(new Date(2026, 6, 1), now)).toBe(false);
    expect(shiftTrainingMonth(new Date(2026, 5, 1), 1, now).getMonth()).toBe(6);
    expect(shiftTrainingMonth(new Date(2026, 6, 1), 1, now).getMonth()).toBe(6);
    expect(shiftTrainingMonth(new Date(2026, 6, 1), -1, now).getMonth()).toBe(5);
  });

  test('incluye el 29 de febrero de un año bisiesto', () => {
    const leapNow = new Date(2024, 2, 10, 12);
    const calendar = buildTrainingCalendarMonth(
      [localWorkout('bisiesto', 2024, 2, 29, 18)],
      new Date(2024, 1, 1, 12),
      leapNow,
    );

    expect(calendar.days).toHaveLength(42);
    expect(
      calendar.days.find((day) => day.key === '2024-02-29'),
    ).toEqual(
      expect.objectContaining({
        inMonth: true,
        workoutCount: 1,
      }),
    );
  });

  test('mantiene 42 días civiles únicos alrededor de cambios horarios', () => {
    const calendar = buildTrainingCalendarMonth(
      [],
      new Date(2026, 2, 1, 12),
      new Date(2026, 3, 15, 12),
    );
    const keys = calendar.days.map((day) => day.key);

    expect(keys).toHaveLength(42);
    expect(new Set(keys).size).toBe(42);
    expect(keys).toContain('2026-03-08');
    expect(keys).toContain('2026-03-09');
  });
});
