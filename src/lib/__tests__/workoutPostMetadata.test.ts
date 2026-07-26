import type { SetEntry, Workout, WorkoutExercise } from '@/store/workouts';
import {
  buildWorkoutPostMetadata,
  parseWorkoutPostMetadata,
} from '@/lib/workoutPostMetadata';

function set(id: string, patch: Partial<SetEntry> = {}): SetEntry {
  return {
    id,
    reps: 8,
    weightKg: 20,
    isCompleted: true,
    ...patch,
  };
}

function exercise(
  id: string,
  exerciseId: string,
  exerciseName: string,
  muscleGroup: string,
  sets: SetEntry[],
): WorkoutExercise {
  return { id, exerciseId, exerciseName, muscleGroup, sets };
}

function workout(patch: Partial<Workout> = {}): Workout {
  return {
    id: 'workout-1',
    startedAt: '2026-07-22T10:00:00.000Z',
    endedAt: '2026-07-22T11:00:00.000Z',
    totalReps: 0,
    totalRestSeconds: 0,
    totalActiveSeconds: 0,
    exercises: [],
    ...patch,
  };
}

describe('buildWorkoutPostMetadata', () => {
  it('agrega solo series efectivas completadas y plausibles', () => {
    const result = buildWorkoutPostMetadata(
      workout({
        durationSeconds: 3661.9,
        exercises: [
          exercise('we-1', 'bench-press', 'Nombre viejo', 'legacy', [
            set('s-1', { reps: 5, weightKg: 100 }),
            set('s-2', { reps: 10, weightKg: 80 }),
            set('s-3', { reps: 10, weightKg: 20, isWarmup: true }),
            set('s-4', { reps: 8, weightKg: 80, isCompleted: false }),
            set('s-5', { reps: 1_000, weightKg: 1 }),
          ]),
          exercise('we-2', 'squat', 'Sentadilla', 'quads', [
            set('s-6', { reps: 10, weightKg: 0 }),
          ]),
          exercise('we-3', 'unknown', 'Inválido', 'back', [
            set('s-7', { reps: 8, weightKg: 1_001 }),
          ]),
        ],
      }),
    );

    expect(result).toMatchObject({
      exerciseCount: 2,
      durationSeconds: 3661,
      workingSetCount: 3,
      totalReps: 25,
      volumeKg: 1_300,
      muscleGroups: ['chest', 'quads'],
      prs: [],
    });
    expect(result.exercises).toEqual([
      {
        exerciseId: 'bench-press',
        name: 'Press de banca',
        muscleGroup: 'chest',
        workingSetCount: 2,
        totalReps: 15,
        volumeKg: 1_300,
      },
      {
        exerciseId: 'squat',
        name: 'Sentadilla',
        muscleGroup: 'quads',
        workingSetCount: 1,
        totalReps: 10,
        volumeKg: 0,
      },
    ]);
  });

  it('deriva duración desde timestamps y rechaza intervalos negativos', () => {
    expect(buildWorkoutPostMetadata(workout()).durationSeconds).toBe(3_600);
    expect(
      buildWorkoutPostMetadata(
        workout({ endedAt: '2026-07-22T09:59:59.000Z' }),
      ).durationSeconds,
    ).toBeUndefined();
  });
});

describe('parseWorkoutPostMetadata', () => {
  it('normaliza metadata enriquecida y descarta entradas imposibles', () => {
    const result = parseWorkoutPostMetadata({
      exercise_count: 2,
      duration_seconds: 3_661,
      duration_min: 1,
      working_set_count: 3,
      total_reps: 25,
      volume_kg: 1_300.5,
      muscle_groups: ['chest', 'quads', 'chest', ''],
      exercises: [
        {
          exercise_id: 'bench-press',
          name: 'Press de banca',
          muscle_group: 'chest',
          working_set_count: 2,
          total_reps: 15,
          volume_kg: 1_300.5,
        },
        { name: '   ' },
      ],
      prs: [
        {
          exercise_id: 'bench-press',
          exercise_name: 'Press de banca',
          weight_kg: 100,
          reps: 5,
        },
        { exercise_name: 'Dato imposible', weight_kg: 1_001, reps: 5 },
      ],
    });

    expect(result).toEqual({
      exerciseCount: 2,
      durationSeconds: 3_661,
      workingSetCount: 3,
      totalReps: 25,
      volumeKg: 1_300.5,
      muscleGroups: ['chest', 'quads'],
      exercises: [
        {
          exerciseId: 'bench-press',
          name: 'Press de banca',
          muscleGroup: 'chest',
          workingSetCount: 2,
          totalReps: 15,
          volumeKg: 1_300.5,
        },
      ],
      prs: [
        {
          exerciseId: 'bench-press',
          exerciseName: 'Press de banca',
          weightKg: 100,
          reps: 5,
        },
      ],
    });
  });

  it('mantiene compatibilidad con claves y ejercicios legacy', () => {
    expect(
      parseWorkoutPostMetadata({
        exercise_count: 2,
        duration_min: 45,
        muscle_group: 'back',
        exercises: ['Jalón al pecho', { name: 'Remo sentado' }],
      }),
    ).toEqual({
      exerciseCount: 2,
      durationSeconds: 2_700,
      workingSetCount: undefined,
      totalReps: undefined,
      volumeKg: undefined,
      muscleGroups: ['back'],
      exercises: [{ name: 'Jalón al pecho' }, { name: 'Remo sentado' }],
      prs: [],
    });
  });

  it('devuelve forma segura para metadata desconocida', () => {
    expect(parseWorkoutPostMetadata(null)).toEqual({
      muscleGroups: [],
      exercises: [],
      prs: [],
    });
    expect(parseWorkoutPostMetadata([])).toEqual({
      muscleGroups: [],
      exercises: [],
      prs: [],
    });
  });
});
