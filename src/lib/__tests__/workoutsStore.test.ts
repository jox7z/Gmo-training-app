import AsyncStorage from '@react-native-async-storage/async-storage';

import { makeWorkout } from '@/lib/__tests__/helpers/fixtures';
import { useWorkoutsStore } from '@/store/workouts';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => ({
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  }),
);

describe('workouts store set updates', () => {
  beforeEach(() => {
    useWorkoutsStore.setState({ history: [], active: null });
  });

  it('actualiza por ids estables', () => {
    const workout = makeWorkout();
    useWorkoutsStore.setState({ active: workout, history: [] });
    const exercise = workout.exercises[0];
    const set = exercise.sets[0];

    expect(
      useWorkoutsStore
        .getState()
        .updateSetById(exercise.id, set.id, { weightKg: 82.5 }),
    ).toBe(true);
    expect(
      useWorkoutsStore.getState().active?.exercises[0].sets[0].weightKg,
    ).toBe(82.5);
  });

  it('ignora ids obsoletos y números inválidos sin lanzar', () => {
    const workout = makeWorkout();
    useWorkoutsStore.setState({ active: workout, history: [] });
    const exercise = workout.exercises[0];
    const set = exercise.sets[0];

    expect(
      useWorkoutsStore
        .getState()
        .updateSetById('exercise-missing', set.id, { reps: 10 }),
    ).toBe(false);
    expect(
      useWorkoutsStore
        .getState()
        .updateSetById(exercise.id, set.id, { weightKg: Infinity }),
    ).toBe(false);
    expect(
      useWorkoutsStore
        .getState()
        .updateSetById(exercise.id, set.id, { reps: 1000 }),
    ).toBe(false);
    expect(
      useWorkoutsStore
        .getState()
        .updateSetById(
          exercise.id,
          set.id,
          { id: 'reemplazo-prohibido' } as never,
        ),
    ).toBe(false);
    expect(
      useWorkoutsStore
        .getState()
        .updateSetById(
          exercise.id,
          set.id,
          { reps: undefined } as never,
        ),
    ).toBe(false);
    expect(
      useWorkoutsStore
        .getState()
        .updateSetById(
          exercise.id,
          set.id,
          { isCompleted: 'sí' } as never,
        ),
    ).toBe(false);
    expect(useWorkoutsStore.getState().active).toEqual(workout);
  });

  it('persiste el peso en la siguiente serie laboral del mismo ejercicio', async () => {
    const workout = makeWorkout({
      exercises: [
        {
          id: 'press-entry',
          exerciseId: 'bench-press',
          exerciseName: 'Press de banca',
          muscleGroup: 'chest',
          sets: [
            {
              id: 'press-1',
              reps: 8,
              weightKg: 72.5,
              isCompleted: false,
            },
            {
              id: 'warmup',
              reps: 5,
              weightKg: 30,
              isWarmup: true,
              isCompleted: false,
            },
            {
              id: 'press-2',
              reps: 6,
              weightKg: 20,
              isCompleted: false,
            },
          ],
        },
        {
          id: 'remo-entry',
          exerciseId: 'barbell-row',
          exerciseName: 'Remo',
          muscleGroup: 'back',
          sets: [
            {
              id: 'remo-1',
              reps: 10,
              weightKg: 40,
              isCompleted: false,
            },
          ],
        },
      ],
    });
    useWorkoutsStore.setState({ active: workout, history: [] });

    expect(
      useWorkoutsStore
        .getState()
        .completeSetAndCarryWeightById(
          'press-entry',
          'press-1',
          '2026-07-29T12:00:00.000Z',
        ),
    ).toBe(true);

    const active = useWorkoutsStore.getState().active;
    expect(active?.exercises[0].sets).toEqual([
      expect.objectContaining({ id: 'press-1', isCompleted: true }),
      expect.objectContaining({ id: 'warmup', weightKg: 30 }),
      expect.objectContaining({
        id: 'press-2',
        reps: 6,
        weightKg: 72.5,
        isCompleted: false,
      }),
    ]);
    expect(active?.exercises[1].sets[0].weightKg).toBe(40);

    const snapshot = JSON.stringify({ history: [], active });
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(snapshot);
    useWorkoutsStore.setState({ active: null, history: [] });
    await useWorkoutsStore.getState().hydrate();
    expect(
      useWorkoutsStore.getState().active?.exercises[0].sets[2].weightKg,
    ).toBe(72.5);
  });

  it('no sobrescribe el siguiente target editado o completado', () => {
    const workout = makeWorkout({
      exercises: [
        {
          id: 'press-entry',
          exerciseId: 'bench-press',
          exerciseName: 'Press de banca',
          muscleGroup: 'chest',
          sets: [
            {
              id: 'press-1',
              reps: 8,
              weightKg: 80,
              isCompleted: false,
            },
            {
              id: 'press-2',
              reps: 5,
              weightKg: 85,
              isCompleted: false,
            },
          ],
        },
      ],
    });
    useWorkoutsStore.setState({ active: workout, history: [] });
    expect(
      useWorkoutsStore
        .getState()
        .completeSetAndCarryWeightById(
          'press-entry',
          'press-1',
          '2026-07-29T12:00:00.000Z',
          ['press-2'],
        ),
    ).toBe(true);
    expect(
      useWorkoutsStore.getState().active?.exercises[0].sets[1],
    ).toMatchObject({ reps: 5, weightKg: 85, isCompleted: false });

    const completedTarget = makeWorkout({
      exercises: [
        {
          ...workout.exercises[0],
          sets: [
            { ...workout.exercises[0].sets[0], isCompleted: false },
            { ...workout.exercises[0].sets[1], isCompleted: true },
            {
              id: 'press-3',
              reps: 4,
              weightKg: 20,
              isCompleted: false,
            },
          ],
        },
      ],
    });
    useWorkoutsStore.setState({ active: completedTarget, history: [] });
    expect(
      useWorkoutsStore
        .getState()
        .completeSetAndCarryWeightById(
          'press-entry',
          'press-1',
          '2026-07-29T12:00:00.000Z',
        ),
    ).toBe(true);
    expect(
      useWorkoutsStore.getState().active?.exercises[0].sets[1],
    ).toMatchObject({ weightKg: 85, isCompleted: true });
    expect(
      useWorkoutsStore.getState().active?.exercises[0].sets[2],
    ).toMatchObject({ reps: 4, weightKg: 80, isCompleted: false });
  });

  it('completa un calentamiento sin arrastrar su peso', () => {
    const workout = makeWorkout({
      exercises: [
        {
          id: 'press-entry',
          exerciseId: 'bench-press',
          exerciseName: 'Press de banca',
          muscleGroup: 'chest',
          sets: [
            {
              id: 'warmup',
              reps: 10,
              weightKg: 30,
              isWarmup: true,
              isCompleted: false,
            },
            {
              id: 'press-1',
              reps: 8,
              weightKg: 70,
              isCompleted: false,
            },
          ],
        },
      ],
    });
    useWorkoutsStore.setState({ active: workout, history: [] });

    expect(
      useWorkoutsStore
        .getState()
        .completeSetAndCarryWeightById(
          'press-entry',
          'warmup',
          '2026-07-29T12:00:00.000Z',
        ),
    ).toBe(true);
    expect(
      useWorkoutsStore.getState().active?.exercises[0].sets,
    ).toEqual([
      expect.objectContaining({ id: 'warmup', isCompleted: true }),
      expect.objectContaining({
        id: 'press-1',
        weightKg: 70,
        isCompleted: false,
      }),
    ]);
  });
});

describe('startWorkoutFromHistory', () => {
  beforeEach(() => {
    useWorkoutsStore.setState({ history: [], active: null });
  });

  it('repite estructura, calentamientos y notas con ids nuevos sin mutar el ledger', () => {
    const source = makeWorkout({
      id: 'finished-source',
      routineDayId: 'day-source',
      routineName: 'Torso',
      endedAt: '2026-07-20T11:00:00.000Z',
      durationSeconds: 3600,
      isPublished: true,
      visibility: 'public',
      photoUri: 'file://photo.jpg',
      exercises: [
        {
          id: 'press-entry',
          exerciseId: 'bench-press',
          exerciseName: 'Press de banca',
          muscleGroup: 'chest',
          notes: 'Pausa abajo',
          supersetGroupId: 'source-superset',
          groupRestEnabled: true,
          sets: [
            {
              id: 'warmup-source',
              reps: 10,
              weightKg: 20,
              isWarmup: true,
              isCompleted: true,
              durationSeconds: 48,
              restStartedAt: '2026-07-20T10:10:00.000Z',
              restAfterSeconds: 90,
            },
            {
              id: 'work-source',
              reps: 8,
              weightKg: 80,
              isCompleted: true,
              rpe: 9,
              durationSeconds: 36,
              restAfterSeconds: 120,
            },
          ],
        },
        {
          id: 'row-entry',
          exerciseId: 'barbell-row',
          exerciseName: 'Remo con barra',
          muscleGroup: 'back',
          supersetGroupId: 'source-superset',
          groupRestEnabled: true,
          sets: [{ id: 'row-source', reps: 10, weightKg: 60, isCompleted: true }],
        },
      ],
    });
    const snapshot = JSON.stringify(source);
    useWorkoutsStore.setState({ history: [source], active: null });

    const repeated = useWorkoutsStore.getState().startWorkoutFromHistory(source);

    expect(repeated).not.toBeNull();
    expect(repeated).toMatchObject({
      routineDayId: 'day-source',
      routineName: 'Torso',
      totalReps: 0,
      totalRestSeconds: 0,
      totalActiveSeconds: 0,
    });
    expect(repeated).not.toHaveProperty('endedAt');
    expect(repeated).not.toHaveProperty('durationSeconds');
    expect(repeated).not.toHaveProperty('isPublished');
    expect(repeated).not.toHaveProperty('visibility');
    expect(repeated).not.toHaveProperty('photoUri');
    expect(repeated?.id).not.toBe(source.id);
    expect(repeated?.exercises[0]).toMatchObject({
      exerciseId: 'bench-press',
      notes: 'Pausa abajo',
      groupRestEnabled: true,
    });
    expect(repeated?.exercises[0].id).not.toBe('press-entry');
    expect(repeated?.exercises[0].sets).toEqual([
      expect.objectContaining({ reps: 10, weightKg: 20, isWarmup: true, isCompleted: false }),
      expect.objectContaining({ reps: 8, weightKg: 80, isCompleted: false }),
    ]);
    expect(repeated?.exercises[0].sets[0]).not.toHaveProperty('durationSeconds');
    expect(repeated?.exercises[0].sets[0]).not.toHaveProperty('restStartedAt');
    expect(repeated?.exercises[0].sets[0]).not.toHaveProperty('restAfterSeconds');
    expect(repeated?.exercises[0].sets[0]).not.toHaveProperty('rpe');
    expect(repeated?.exercises[0].supersetGroupId).toBe(repeated?.exercises[1].supersetGroupId);
    expect(repeated?.exercises[0].supersetGroupId).not.toBe('source-superset');
    expect(JSON.stringify(source)).toBe(snapshot);
    expect(useWorkoutsStore.getState().history).toEqual([source]);
  });

  it('usa defaults seguros en valores legacy no plausibles y conserva identificadores personalizados', () => {
    const source = makeWorkout({
      exercises: [
        {
          id: 'legacy-entry',
          exerciseId: 'legacy-custom-machine',
          exerciseName: 'Máquina personalizada',
          muscleGroup: 'legacy',
          sets: [{ id: 'invalid', reps: 0, weightKg: Number.POSITIVE_INFINITY, isCompleted: true }],
        },
        {
          id: 'bodyweight-entry',
          exerciseId: 'push-up',
          exerciseName: 'Flexiones',
          muscleGroup: 'chest',
          sets: [{ id: 'invalid-bodyweight', reps: 1000, weightKg: -1, isCompleted: true }],
        },
      ],
    });

    const repeated = useWorkoutsStore.getState().startWorkoutFromHistory(source);

    expect(repeated?.exercises[0]).toMatchObject({
      exerciseId: 'legacy-custom-machine',
      exerciseName: 'Máquina personalizada',
      muscleGroup: 'legacy',
      sets: [expect.objectContaining({ reps: 8, weightKg: 20, isCompleted: false })],
    });
    expect(repeated?.exercises[1].sets[0]).toMatchObject({
      reps: 8,
      weightKg: 0,
      isCompleted: false,
    });
  });

  it('no reemplaza la sesión activa cuando la fuente no contiene ejercicios', () => {
    const active = makeWorkout({ id: 'active-existing' });
    const source = makeWorkout({ exercises: [] });
    useWorkoutsStore.setState({ active, history: [source] });

    expect(useWorkoutsStore.getState().startWorkoutFromHistory(source)).toBeNull();
    expect(useWorkoutsStore.getState().active).toBe(active);
  });
});
