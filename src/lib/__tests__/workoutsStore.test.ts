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
});
