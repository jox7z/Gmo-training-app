import type {
  SetEntry,
  Workout,
  WorkoutExercise,
} from '@/store/workouts';

let sequence = 0;

export function makeSet(overrides: Partial<SetEntry> = {}): SetEntry {
  sequence += 1;
  return {
    id: `set-${sequence}`,
    reps: 8,
    weightKg: 50,
    isCompleted: true,
    ...overrides,
  };
}

export function makeExercise(
  overrides: Partial<WorkoutExercise> = {},
): WorkoutExercise {
  sequence += 1;
  return {
    id: `workout-exercise-${sequence}`,
    exerciseId: 'bench-press',
    exerciseName: 'Press de banca',
    muscleGroup: 'chest',
    sets: [makeSet()],
    ...overrides,
  };
}

export function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  sequence += 1;
  return {
    id: `workout-${sequence}`,
    startedAt: '2026-07-19T12:00:00.000Z',
    totalReps: 8,
    totalRestSeconds: 0,
    totalActiveSeconds: 0,
    exercises: [makeExercise()],
    ...overrides,
  };
}
