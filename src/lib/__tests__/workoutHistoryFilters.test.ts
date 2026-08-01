import { makeExercise, makeWorkout } from '@/lib/__tests__/helpers/fixtures';
import {
  DEFAULT_WORKOUT_HISTORY_FILTERS,
  filterWorkoutHistory,
  hasWorkoutHistoryFilters,
  workoutExerciseOptions,
  workoutRoutineOptions,
} from '@/lib/workoutHistoryFilters';

const now = new Date('2026-08-01T12:00:00.000Z');

const history = [
  makeWorkout({
    id: 'push-recent',
    routineName: 'Empuje',
    startedAt: '2026-07-20T12:00:00.000Z',
    isPublished: true,
    exercises: [makeExercise({ exerciseId: 'bench-press', exerciseName: 'Press de banca' })],
  }),
  makeWorkout({
    id: 'pull-old',
    routineName: 'Tirón',
    startedAt: '2026-04-15T12:00:00.000Z',
    exercises: [makeExercise({ exerciseId: 'legacy-row', exerciseName: 'Remo clásico' })],
  }),
  makeWorkout({
    id: 'free-recent',
    startedAt: '2026-07-10T12:00:00.000Z',
    exercises: [makeExercise({ exerciseId: 'squat', exerciseName: 'Sentadilla' })],
  }),
  makeWorkout({
    id: 'broken-date',
    routineName: 'Rota',
    startedAt: 'ayer',
    exercises: [makeExercise({ exerciseId: 'legacy-broken', exerciseName: 'Legacy roto' })],
  }),
];

describe('workout activity filters', () => {
  it('combina ejercicio, rutina, periodo y publicadas sin mutar historial', () => {
    const snapshot = JSON.stringify(history);
    expect(
      filterWorkoutHistory(
        history,
        {
          exerciseId: 'bench-press',
          routineName: 'Empuje',
          period: '30d',
          publishedOnly: true,
        },
        now,
      ).map((workout) => workout.id),
    ).toEqual(['push-recent']);
    expect(JSON.stringify(history)).toBe(snapshot);
  });

  it('aplica periodos, omite fechas inválidas y conserva todo el historial válido en Todo', () => {
    expect(
      filterWorkoutHistory(history, { ...DEFAULT_WORKOUT_HISTORY_FILTERS, period: '30d' }, now)
        .map((workout) => workout.id),
    ).toEqual(['push-recent', 'free-recent']);
    expect(
      filterWorkoutHistory(history, { ...DEFAULT_WORKOUT_HISTORY_FILTERS, period: '90d' }, now)
        .map((workout) => workout.id),
    ).toEqual(['push-recent', 'free-recent']);
    expect(
      filterWorkoutHistory(history, DEFAULT_WORKOUT_HISTORY_FILTERS, now).map((workout) => workout.id),
    ).toEqual(['push-recent', 'pull-old', 'free-recent']);
  });

  it('deriva opciones con nombres legacy y distingue filtros activos o vacíos', () => {
    expect(workoutExerciseOptions(history)).toEqual([
      { value: 'legacy-broken', label: 'Legacy roto' },
      { value: 'bench-press', label: 'Press de banca' },
      { value: 'legacy-row', label: 'Remo clásico' },
      { value: 'squat', label: 'Sentadilla' },
    ]);
    expect(workoutRoutineOptions(history)).toEqual([
      { value: 'Empuje', label: 'Empuje' },
      { value: 'Entrenamiento libre', label: 'Entrenamiento libre' },
      { value: 'Rota', label: 'Rota' },
      { value: 'Tirón', label: 'Tirón' },
    ]);
    expect(hasWorkoutHistoryFilters(DEFAULT_WORKOUT_HISTORY_FILTERS)).toBe(false);
    expect(hasWorkoutHistoryFilters({ ...DEFAULT_WORKOUT_HISTORY_FILTERS, publishedOnly: true })).toBe(true);
    expect(filterWorkoutHistory([], DEFAULT_WORKOUT_HISTORY_FILTERS, now)).toEqual([]);
  });
});
