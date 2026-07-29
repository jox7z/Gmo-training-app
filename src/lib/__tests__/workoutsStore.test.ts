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
