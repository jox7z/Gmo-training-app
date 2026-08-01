import { makeExercise, makeWorkout } from '@/lib/__tests__/helpers/fixtures';
import { recentExerciseIds, sortByRecentExercise } from '@/lib/recentExercises';

describe('recentExerciseIds', () => {
  it('ordena por la sesión válida más reciente y elimina duplicados', () => {
    const history = [
      makeWorkout({
        startedAt: '2026-07-05T10:00:00.000Z',
        exercises: [
          makeExercise({ exerciseId: 'bench-press' }),
          makeExercise({ exerciseId: 'barbell-row' }),
        ],
      }),
      makeWorkout({
        startedAt: '2026-07-20T10:00:00.000Z',
        exercises: [
          makeExercise({ exerciseId: 'bench-press' }),
          makeExercise({ exerciseId: 'squat' }),
        ],
      }),
    ];

    expect(recentExerciseIds(history)).toEqual([
      'bench-press',
      'squat',
      'barbell-row',
    ]);
  });

  it('ignora sesiones sin fecha válida y no inventa ejercicios legacy al ordenar catálogo', () => {
    const history = [
      makeWorkout({
        startedAt: 'fecha rota',
        exercises: [makeExercise({ exerciseId: 'legacy-pulley' })],
      }),
      makeWorkout({
        startedAt: '2026-07-20T10:00:00.000Z',
        exercises: [makeExercise({ exerciseId: 'squat' })],
      }),
    ];

    expect(recentExerciseIds(history)).toEqual(['squat']);
    expect(
      sortByRecentExercise(
        [{ id: 'bench-press' }, { id: 'squat' }],
        ['legacy-pulley', 'squat'],
      ),
    ).toEqual([{ id: 'squat' }, { id: 'bench-press' }]);
  });
});
