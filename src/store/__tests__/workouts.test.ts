/**
 * workouts (store) — 3 áreas con reglas de dominio no obvias:
 *
 * 1. Los totales que arma `finishWorkout` (calcTotalReps/calcTotalActiveSeconds/
 *    calcTotalRestSeconds/calcAvgRest, internas, no exportadas) tienen criterios de
 *    inclusión DISTINTOS entre sí: reps excluye warmups, segundos activos exige
 *    `isCompleted` pero SÍ cuenta warmups, y descanso ni siquiera exige `isCompleted`.
 * 2. `swapExercise` conserva/limpia `supersetGroupId`/`groupRestEnabled` según haya o
 *    no series completadas, y corre el resultado por `dissolveNonContiguousGroups`
 *    real (no mockeado) porque swapear el miembro del medio de un grupo puede partir
 *    la corrida contigua en dos.
 * 3. `addWarmupSets` prepende sin tocar el orden de las series ya existentes.
 */
import { useWorkoutsStore } from '@/store/workouts';
import { makeExercise, makeSet } from '@/lib/__tests__/fixtures';

function resetStore() {
  useWorkoutsStore.setState({ active: null, history: [] });
}

beforeEach(resetStore);

describe('finishWorkout — totales (asimetría entre reps / activo / descanso)', () => {
  it('sobre el mismo fixture: reps excluye warmup, activo excluye no-completada (pero SÍ cuenta warmup), descanso no exige isCompleted', () => {
    const work = makeSet({ reps: 8, durationSeconds: 40, restAfterSeconds: 60 });
    const warmup = makeSet({
      reps: 5,
      isWarmup: true,
      durationSeconds: 20,
      restAfterSeconds: 30,
    });
    const pending = makeSet({
      reps: 10,
      isCompleted: false,
      durationSeconds: 999, // NO debe contar: la serie no está completada.
      restAfterSeconds: 15, // SÍ debe contar: el descanso no exige isCompleted.
    });
    const exercise = makeExercise({ sets: [work, warmup, pending] });

    useWorkoutsStore.getState().startWorkout({ exercises: [exercise] });
    const finished = useWorkoutsStore.getState().finishWorkout({});

    expect(finished).not.toBeNull();
    // totalReps: solo la serie de trabajo completada (8) — warmup y pendiente fuera.
    expect(finished!.totalReps).toBe(8);
    // totalActiveSeconds: work (40) + warmup (20), ambas completadas; pending queda
    // afuera pese a tener durationSeconds, únicamente por NO estar completada.
    expect(finished!.totalActiveSeconds).toBe(60);
    // totalRestSeconds: suma las 3 (60+30+15) — ni siquiera exige isCompleted.
    expect(finished!.totalRestSeconds).toBe(105);
    // avgRestSeconds: promedio redondeado de los 3 descansos (todos > 0).
    expect(finished!.avgRestSeconds).toBe(35);
  });

  it('avgRestSeconds es undefined sin descansos positivos, aunque totalRestSeconds sí cuente un 0 explícito', () => {
    const zeroRest = makeSet({ restAfterSeconds: 0 });
    const noRest = makeSet({ restAfterSeconds: undefined });
    const exercise = makeExercise({ sets: [zeroRest, noRest] });

    useWorkoutsStore.getState().startWorkout({ exercises: [exercise] });
    const finished = useWorkoutsStore.getState().finishWorkout({});

    // El 0 explícito es `typeof === 'number'`, así que cuenta para el total...
    expect(finished!.totalRestSeconds).toBe(0);
    // ...pero calcAvgRest filtra `v > 0`, así que no hay descansos positivos que promediar.
    expect(finished!.avgRestSeconds).toBeUndefined();
  });
});

describe('swapExercise', () => {
  it('sin series completadas: reemplaza in-place heredando supersetGroupId y groupRestEnabled', () => {
    const groupId = 'group-a';
    const a = makeExercise({
      exerciseId: 'bench-press',
      exerciseName: 'Press de banca',
      supersetGroupId: groupId,
      groupRestEnabled: true,
      sets: [makeSet({ isCompleted: false })],
    });
    const b = makeExercise({
      exerciseId: 'barbell-row',
      exerciseName: 'Remo con barra',
      supersetGroupId: groupId,
      groupRestEnabled: true,
      sets: [makeSet({ isCompleted: false })],
    });
    useWorkoutsStore.getState().startWorkout({ exercises: [a, b] });

    const newIndex = useWorkoutsStore.getState().swapExercise(0, 'push-up');
    const active = useWorkoutsStore.getState().active!;

    expect(newIndex).toBe(0);
    expect(active.exercises).toHaveLength(2);
    expect(active.exercises[0].exerciseId).toBe('push-up');
    expect(active.exercises[0].supersetGroupId).toBe(groupId);
    expect(active.exercises[0].groupRestEnabled).toBe(true);
    expect(active.exercises[0].sets.every((s) => !s.isCompleted)).toBe(true);
    // El grupo sigue contiguo e intacto — dissolveNonContiguousGroups no toca nada.
    expect(active.exercises[1].supersetGroupId).toBe(groupId);
  });

  it('con series completadas: el original queda solo con las completadas (grupo limpiado) y el nuevo se inserta después heredando el grupo', () => {
    const groupId = 'group-b';
    const a = makeExercise({
      exerciseId: 'bench-press',
      exerciseName: 'Press de banca',
      supersetGroupId: groupId,
      groupRestEnabled: true,
      sets: [makeSet({ reps: 8, isCompleted: true }), makeSet({ reps: 10, isCompleted: false })],
    });
    const b = makeExercise({
      exerciseId: 'barbell-row',
      exerciseName: 'Remo con barra',
      supersetGroupId: groupId,
      groupRestEnabled: true,
      sets: [makeSet({ isCompleted: false })],
    });
    useWorkoutsStore.getState().startWorkout({ exercises: [a, b] });

    const newIndex = useWorkoutsStore.getState().swapExercise(0, 'pull-up');
    const active = useWorkoutsStore.getState().active!;

    expect(newIndex).toBe(1);
    expect(active.exercises).toHaveLength(3);
    // El original (índice 0) conserva SOLO la serie completada y pierde el grupo.
    expect(active.exercises[0].exerciseId).toBe('bench-press');
    expect(active.exercises[0].sets).toHaveLength(1);
    expect(active.exercises[0].sets[0].isCompleted).toBe(true);
    expect(active.exercises[0].supersetGroupId).toBeUndefined();
    expect(active.exercises[0].groupRestEnabled).toBeUndefined();
    // El nuevo se inserta justo después, heredando el grupo (queda contiguo con B).
    expect(active.exercises[1].exerciseId).toBe('pull-up');
    expect(active.exercises[1].supersetGroupId).toBe(groupId);
    expect(active.exercises[1].groupRestEnabled).toBe(true);
    expect(active.exercises[1].sets).toEqual([
      expect.objectContaining({ reps: 10, weightKg: 0, isCompleted: false }), // pull-up es bodyweight
    ]);
    // B (ahora contigua con el nuevo, ya no con el remanente) sigue en el grupo.
    expect(active.exercises[2].supersetGroupId).toBe(groupId);
  });

  it('swap del miembro del medio de un trío: dissolveNonContiguousGroups real parte la corrida — el extremo aislado se disuelve, el par nuevo sobrevive', () => {
    const groupId = 'group-c';
    const a = makeExercise({
      exerciseId: 'bench-press',
      supersetGroupId: groupId,
      sets: [makeSet({ isCompleted: false })],
    });
    const b = makeExercise({
      exerciseId: 'barbell-row',
      supersetGroupId: groupId,
      sets: [makeSet({ reps: 8, isCompleted: true }), makeSet({ isCompleted: false })],
    });
    const c = makeExercise({
      exerciseId: 'push-up',
      supersetGroupId: groupId,
      sets: [makeSet({ isCompleted: false })],
    });
    useWorkoutsStore.getState().startWorkout({ exercises: [a, b, c] });

    // Antes de disolver: [A(g), B_remanente(sin grupo), B_nuevo(g), C(g)] — A queda
    // como corrida de 1 (se disuelve), B_nuevo+C miden 2 contiguos (sobreviven).
    const newIndex = useWorkoutsStore.getState().swapExercise(1, 'pull-up');
    const active = useWorkoutsStore.getState().active!;

    expect(newIndex).toBe(2);
    expect(active.exercises).toHaveLength(4);
    expect(active.exercises[0].exerciseId).toBe('bench-press');
    expect(active.exercises[0].supersetGroupId).toBeUndefined(); // A aislada → disuelta
    expect(active.exercises[1].exerciseId).toBe('barbell-row'); // remanente de B
    expect(active.exercises[1].sets).toHaveLength(1);
    expect(active.exercises[1].supersetGroupId).toBeUndefined();
    expect(active.exercises[2].exerciseId).toBe('pull-up'); // B_nuevo
    expect(active.exercises[3].exerciseId).toBe('push-up'); // C
    expect(active.exercises[2].supersetGroupId).toBeDefined();
    expect(active.exercises[2].supersetGroupId).toBe(active.exercises[3].supersetGroupId);
  });
});

describe('addWarmupSets', () => {
  it('inserta las sugerencias al FRENTE preservando el orden de las series ya existentes', () => {
    const existing1 = makeSet({ reps: 8, weightKg: 60 });
    const existing2 = makeSet({ reps: 6, weightKg: 65 });
    const exercise = makeExercise({ sets: [existing1, existing2] });
    useWorkoutsStore.getState().startWorkout({ exercises: [exercise] });

    useWorkoutsStore.getState().addWarmupSets(0, [
      { weightKg: 20, reps: 8 },
      { weightKg: 30, reps: 5 },
    ]);
    const sets = useWorkoutsStore.getState().active!.exercises[0].sets;

    expect(sets).toHaveLength(4);
    expect(sets.map((s) => [s.weightKg, s.reps, s.isWarmup, s.isCompleted])).toEqual([
      [20, 8, true, false],
      [30, 5, true, false],
      [60, 8, false, true], // existing1 intacta, mismo orden relativo
      [65, 6, false, true], // existing2 intacta, mismo orden relativo
    ]);
  });

  it('no-op si no hay workout activo', () => {
    // active ya es null por el resetStore del beforeEach.
    useWorkoutsStore.getState().addWarmupSets(0, [{ weightKg: 20, reps: 8 }]);
    expect(useWorkoutsStore.getState().active).toBeNull();
  });

  it('no-op si suggestions está vacío', () => {
    const exercise = makeExercise({ sets: [makeSet()] });
    useWorkoutsStore.getState().startWorkout({ exercises: [exercise] });
    const before = useWorkoutsStore.getState().active;

    useWorkoutsStore.getState().addWarmupSets(0, []);

    // Ni siquiera llama a `set()`: la referencia de `active` queda intacta.
    expect(useWorkoutsStore.getState().active).toBe(before);
  });
});
