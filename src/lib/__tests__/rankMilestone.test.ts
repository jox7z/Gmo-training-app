import {
  normalizeRankId,
  resolveRankMilestone,
  resolveUserRank,
} from '@/lib/rankMilestone';

describe('rankMilestone', () => {
  test('acepta metadata camelCase de una promoción real', () => {
    const milestone = resolveRankMilestone({
      fromRank: 'silver',
      toRank: 'gold',
    });

    expect(milestone).toMatchObject({
      fromRank: { id: 'silver', label: 'Silver' },
      toRank: { id: 'gold', label: 'Gold' },
    });
  });

  test('acepta metadata snake_case y saltos de más de un rango', () => {
    const milestone = resolveRankMilestone({
      from_rank: 'bronze',
      to_rank: 'diamond',
    });

    expect(milestone?.fromRank.id).toBe('bronze');
    expect(milestone?.toRank.id).toBe('diamond');
  });

  test('mapea legend legacy a olympus', () => {
    expect(normalizeRankId(' legend ')).toBe('olympus');
    expect(
      resolveRankMilestone({ from_rank: 'titan', to_rank: 'legend' })?.toRank.id,
    ).toBe('olympus');
  });

  test('normaliza rangos visibles legacy y desconocidos', () => {
    expect(resolveUserRank('legend')).toBe('olympus');
    expect(resolveUserRank('desconocido')).toBe('rookie');
  });

  test('prefiere los puntos cuando están disponibles', () => {
    expect(resolveUserRank('legend', 2_500)).toBe('platinum');
    expect(resolveUserRank('bronze', 12_000)).toBe('titan');
  });

  test.each([
    [{ fromRank: 'gold', toRank: 'silver' }, 'downgrade'],
    [{ fromRank: 'gold', toRank: 'gold' }, 'no-op'],
    [{ fromRank: 'gold', toRank: 'unknown' }, 'destino inválido'],
    [{ fromRank: 'unknown', toRank: 'gold' }, 'origen inválido'],
    [{ toRank: 'gold' }, 'origen ausente'],
    [
      {
        fromRank: 'silver',
        from_rank: 'bronze',
        toRank: 'gold',
        to_rank: 'gold',
      },
      'variantes en conflicto',
    ],
    [null, 'metadata ausente'],
  ])('degrada %s (%s) a estado neutral', (metadata, _caseLabel) => {
    expect(resolveRankMilestone(metadata)).toBeNull();
  });

  test('no sustituye metadata inválida con el rango actual', () => {
    const metadata = { from_rank: 'silver' };
    const currentRank = 'olympus';

    expect(resolveRankMilestone({ ...metadata, currentRank })).toBeNull();
  });
});
