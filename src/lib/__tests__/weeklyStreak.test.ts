import { describe, expect, test } from '@jest/globals';

import { ACHIEVEMENTS } from '@/lib/achievements';
import { migrateAchievementSnapshot } from '@/lib/achievementPersistence';
import {
  normalizeWeeklyGoalDays,
  weeklyTrainingProgress,
} from '@/lib/weeklyStreak';

import { makeWorkout } from './helpers/fixtures';

function localWorkout(year: number, month: number, day: number, hour = 12) {
  return makeWorkout({
    startedAt: new Date(year, month - 1, day, hour).toISOString(),
  });
}

const NOW_THURSDAY = new Date(2026, 6, 16, 12);

describe('weeklyStreak', () => {
  test('normaliza objetivos corruptos al rango de una semana', () => {
    expect(normalizeWeeklyGoalDays(undefined)).toBe(1);
    expect(normalizeWeeklyGoalDays(Number.NaN)).toBe(1);
    expect(normalizeWeeklyGoalDays(0)).toBe(1);
    expect(normalizeWeeklyGoalDays(4.9)).toBe(4);
    expect(normalizeWeeklyGoalDays(10)).toBe(7);
  });

  test('cuenta días civiles locales únicos, no cantidad de workouts', () => {
    const progress = weeklyTrainingProgress(
      [
        localWorkout(2026, 7, 13, 8),
        localWorkout(2026, 7, 13, 20),
        localWorkout(2026, 7, 14),
      ],
      3,
      NOW_THURSDAY,
    );

    expect(progress.daysThisWeek).toBe(2);
    expect(progress.streakWeeks).toBe(0);
  });

  test('semana actual incompleta conserva racha cerrada anterior', () => {
    const history = [
      // Semana 29 jun–5 jul.
      localWorkout(2026, 6, 29),
      localWorkout(2026, 7, 1),
      localWorkout(2026, 7, 3),
      // Semana 6–12 jul.
      localWorkout(2026, 7, 6),
      localWorkout(2026, 7, 8),
      localWorkout(2026, 7, 10),
      // Semana actual todavía bajo objetivo.
      localWorkout(2026, 7, 13),
      localWorkout(2026, 7, 14),
    ];

    expect(weeklyTrainingProgress(history, 3, NOW_THURSDAY)).toEqual({
      weeklyGoalDays: 3,
      daysThisWeek: 2,
      streakWeeks: 2,
    });
  });

  test('incluye semana actual apenas alcanza objetivo', () => {
    const history = [
      localWorkout(2026, 7, 6),
      localWorkout(2026, 7, 8),
      localWorkout(2026, 7, 10),
      localWorkout(2026, 7, 13),
      localWorkout(2026, 7, 14),
      localWorkout(2026, 7, 16),
    ];

    expect(weeklyTrainingProgress(history, 3, NOW_THURSDAY).streakWeeks).toBe(2);
  });

  test('lunes siguiente rompe racha si semana anterior cerró bajo objetivo', () => {
    const history = [
      localWorkout(2026, 7, 6),
      localWorkout(2026, 7, 8),
      localWorkout(2026, 7, 10),
      localWorkout(2026, 7, 13),
      localWorkout(2026, 7, 14),
    ];
    const nextMonday = new Date(2026, 6, 20, 12);

    expect(weeklyTrainingProgress(history, 3, nextMonday).streakWeeks).toBe(0);
  });

  test('cambio de objetivo reevalúa todo historial y omite fechas inválidas', () => {
    const history = [
      localWorkout(2026, 7, 6),
      localWorkout(2026, 7, 8),
      localWorkout(2026, 7, 13),
      localWorkout(2026, 7, 14),
      makeWorkout({ startedAt: 'fecha-inválida' }),
    ];

    expect(weeklyTrainingProgress(history, 2, NOW_THURSDAY).streakWeeks).toBe(2);
    expect(weeklyTrainingProgress(history, 3, NOW_THURSDAY).streakWeeks).toBe(0);
  });

  test('logro de racha ignora contador persistido congelado', () => {
    const streakTrack = ACHIEVEMENTS.find((achievement) => achievement.id === 'streak-weeks');

    expect(streakTrack?.measure({
      history: [],
      weeklyGoalDays: 4,
      streakWeeks: 99,
    })).toBe(0);
  });

  test('migra tiers de racha antiguos sin borrar otros logros', () => {
    expect(migrateAchievementSnapshot({
      unlocked: {
        'streak-4': '2026-06-01T12:00:00.000Z',
        'workouts-10': '2026-06-02T12:00:00.000Z',
      },
      seeded: true,
    })).toEqual({
      unlocked: {
        'workouts-10': '2026-06-02T12:00:00.000Z',
      },
      seeded: false,
    });

    expect(migrateAchievementSnapshot({
      version: 2,
      unlocked: { 'streak-4': '2026-07-01T12:00:00.000Z' },
      seeded: true,
    }).unlocked).toHaveProperty('streak-4');
  });
});
