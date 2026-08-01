import { describe, expect, test } from '@jest/globals';

import { nextRoutineDay } from '@/lib/routineSchedule';
import type { Routine, RoutineDay } from '@/store/routines';

import { makeWorkout } from './helpers/fixtures';

const days: RoutineDay[] = [
  { id: 'push', name: 'Empuje', exercises: [] },
  { id: 'pull', name: 'Tirón', exercises: [] },
  { id: 'legs', name: 'Piernas', exercises: [] },
];

const routine: Routine = {
  id: 'ppl',
  name: 'PPL',
  splitType: 'ppl',
  days,
  createdAt: '2026-07-01T00:00:00.000Z',
};

describe('routineSchedule', () => {
  test.each([null, undefined])('devuelve null sin rutina: %p', (value) => {
    expect(nextRoutineDay(value, [])).toBeNull();
  });

  test('devuelve null si la rutina no tiene días', () => {
    expect(nextRoutineDay({ ...routine, days: [] }, [])).toBeNull();
  });

  test('empieza en el primer día con historial vacío o irrelevante', () => {
    expect(nextRoutineDay(routine, [])).toBe(days[0]);
    expect(
      nextRoutineDay(routine, [
        makeWorkout({
          routineDayId: 'full-body',
          startedAt: '2026-07-19T12:00:00.000Z',
        }),
        makeWorkout({ routineDayId: 'push', startedAt: 'fecha-inválida' }),
      ]),
    ).toBe(days[0]);
  });

  test('rota desde la sesión válida más reciente sin depender del orden', () => {
    const history = [
      makeWorkout({
        routineDayId: 'push',
        startedAt: '2026-07-17T12:00:00.000Z',
      }),
      makeWorkout({
        routineDayId: 'pull',
        startedAt: '2026-07-18T12:00:00.000Z',
      }),
      makeWorkout({
        routineDayId: 'push',
        startedAt: '2026-07-16T12:00:00.000Z',
      }),
    ];

    expect(nextRoutineDay(routine, history)).toBe(days[2]);
  });

  test('vuelve al primer día al completar el último', () => {
    expect(
      nextRoutineDay(routine, [
        makeWorkout({
          routineDayId: 'legs',
          startedAt: '2026-07-19T12:00:00.000Z',
        }),
      ]),
    ).toBe(days[0]);
  });
});
