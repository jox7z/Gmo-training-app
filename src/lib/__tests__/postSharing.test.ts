import { formatPostShareMessage } from '@/lib/postSharing';
import type { Post } from '@/lib/repos/posts';

function post(patch: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    userId: 'user-1',
    user: {
      displayName: 'Atleta',
      username: 'atleta',
      currentRank: 'rookie',
    },
    type: 'workout',
    title: 'Pierna pesada',
    caption: 'Sesión del martes',
    shareCount: 0,
    commentCount: 0,
    metadata: {},
    createdAt: '2026-07-22T12:00:00.000Z',
    reactions: { props: 0, respect: 0, fire: 0, muscle: 0, heart: 0 },
    myReactions: {
      props: false,
      respect: false,
      fire: false,
      muscle: false,
      heart: false,
    },
    ...patch,
  };
}

describe('formatPostShareMessage', () => {
  test('comparte datos reales del entrenamiento en la unidad elegida', () => {
    const message = formatPostShareMessage(
      post({
        metadata: {
          duration_seconds: 3_900,
          working_set_count: 12,
          total_reps: 96,
          volume_kg: 1_000,
          muscle_groups: ['quads', 'glutes'],
        },
      }),
      'lb',
    );

    expect(message).toContain('Pierna pesada');
    expect(message).toContain('1h 5m · 12 series · 96 reps · 2204,6 lb·rep');
    expect(message).toContain('Cuádriceps · Glúteos');
    expect(message).toContain('Sesión del martes');
    expect(message).toContain('Compartido desde GMO Training');
  });

  test('una publicación manual no inventa métricas', () => {
    expect(
      formatPostShareMessage(
        post({ type: 'manual', title: undefined, caption: 'Foto del gym' }),
        'kg',
      ),
    ).toBe('Mira esto en GMO\n\nFoto del gym\n\nCompartido desde GMO Training');
  });
});
