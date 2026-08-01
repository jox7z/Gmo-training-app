import { parseWorkoutSnapshot } from '@/lib/workoutPersistence';

const validWorkout = {
  id: 'workout-1',
  startedAt: '2026-07-22T10:00:00.000Z',
  exercises: [
    {
      id: 'entry-1',
      exerciseId: 'bench-press',
      exerciseName: 'Press banca',
      muscleGroup: 'chest',
      sets: [{ id: 'set-1', reps: 8, weightKg: 80, isCompleted: true }],
    },
  ],
};

describe('parseWorkoutSnapshot', () => {
  it('migra totales ausentes desde las series válidas', () => {
    const snapshot = parseWorkoutSnapshot(JSON.stringify({ history: [validWorkout], active: null }));

    expect(snapshot.history[0]).toMatchObject({
      totalReps: 8,
      totalActiveSeconds: 0,
      totalRestSeconds: 0,
    });
    expect(snapshot.recoveredEntries).toBe(0);
  });

  it('descarta workouts incompletos sin exponer objetos corruptos', () => {
    const invalidDate = { ...validWorkout, id: 'workout-invalid-date', startedAt: 'ayer quizá' };
    const snapshot = parseWorkoutSnapshot(
      JSON.stringify({ history: [validWorkout, null, invalidDate], active: {} }),
    );

    expect(snapshot.history).toHaveLength(1);
    expect(snapshot.active).toBeNull();
    expect(snapshot.recoveredEntries).toBe(3);
  });

  it('rechaza un contenedor sin historial', () => {
    expect(() => parseWorkoutSnapshot(JSON.stringify({ active: null }))).toThrow('Formato de historial inválido');
  });

  it('preserva privacidad y metadata de superseries válidas', () => {
    const supersetWorkout = {
      ...validWorkout,
      visibility: 'followers',
      exercises: [
        {
          ...validWorkout.exercises[0],
          supersetGroupId: '9abf5396-48b5-4c98-a647-a15ada1e6450',
          groupRestEnabled: true,
        },
        {
          ...validWorkout.exercises[0],
          id: 'entry-2',
          exerciseId: 'barbell-row',
          exerciseName: 'Remo con barra',
          muscleGroup: 'back',
          supersetGroupId: '9abf5396-48b5-4c98-a647-a15ada1e6450',
          groupRestEnabled: true,
        },
      ],
    };

    const snapshot = parseWorkoutSnapshot(
      JSON.stringify({ history: [supersetWorkout], active: null }),
    );

    expect(snapshot.history[0].visibility).toBe('followers');
    expect(snapshot.history[0].exercises).toHaveLength(2);
    expect(snapshot.history[0].exercises[0]).toMatchObject({
      supersetGroupId: '9abf5396-48b5-4c98-a647-a15ada1e6450',
      groupRestEnabled: true,
    });
    expect(snapshot.history[0].exercises[1]).toMatchObject({
      supersetGroupId: '9abf5396-48b5-4c98-a647-a15ada1e6450',
      groupRestEnabled: true,
    });
  });

  it('disuelve metadata de superserie inválida sin perder el workout', () => {
    const invalidSuperset = {
      ...validWorkout,
      exercises: [
        {
          ...validWorkout.exercises[0],
          supersetGroupId: '9abf5396-48b5-4c98-a647-a15ada1e6450',
          groupRestEnabled: true,
        },
      ],
    };

    const snapshot = parseWorkoutSnapshot(
      JSON.stringify({ history: [invalidSuperset], active: null }),
    );

    expect(snapshot.history).toHaveLength(1);
    expect(snapshot.history[0].exercises[0]).not.toHaveProperty(
      'supersetGroupId',
    );
    expect(snapshot.history[0].exercises[0]).not.toHaveProperty(
      'groupRestEnabled',
    );
  });
});
