/**
 * fixtures — builders compartidos para las suites de `src/lib`.
 *
 * NO termina en `.test.ts`, así que jest no lo ejecuta como suite. Cada builder
 * trae defaults sensatos (serie completada, no calentamiento, 8 reps, 60 kg) y
 * acepta overrides parciales para armar historiales de prueba con poco ruido.
 */
import { uuidv4 } from '@/lib/ids';
import type { Workout, WorkoutExercise, SetEntry } from '@/store/workouts';

/** Serie de trabajo por defecto: completada, no calentamiento, 8 reps a 60 kg. */
export function makeSet(overrides: Partial<SetEntry> = {}): SetEntry {
  return {
    id: uuidv4(),
    reps: 8,
    weightKg: 60,
    isCompleted: true,
    isWarmup: false,
    ...overrides,
  };
}

/** Ejercicio por defecto: press de banca con una serie de trabajo. */
export function makeExercise(overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: uuidv4(),
    exerciseId: 'bench-press',
    exerciseName: 'Press de banca',
    muscleGroup: 'chest',
    sets: [makeSet()],
    ...overrides,
  };
}

/**
 * Workout por defecto: id único, fecha ISO fija y un ejercicio con una serie.
 * Los totales se dejan en 0 (se recalculan al cerrar la sesión real); los tests
 * que dependan de `totalReps` deben pasarlo explícito por override.
 */
export function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: uuidv4(),
    startedAt: '2026-07-14T10:00:00.000Z',
    totalReps: 0,
    totalRestSeconds: 0,
    totalActiveSeconds: 0,
    exercises: [makeExercise()],
    ...overrides,
  };
}
