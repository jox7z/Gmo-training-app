import {
  formatCompactDuration,
  formatDecimal,
  formatRelative,
  formatRelativeCompact,
  normalizeSearchText,
} from '@/lib/format';

describe('format helpers', () => {
  const now = Date.UTC(2026, 0, 31, 12, 0, 0);
  let nowSpy: jest.SpyInstance<number, []>;

  beforeAll(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterAll(() => {
    nowSpy.mockRestore();
  });

  test('formats long relative time and rejects invalid dates', () => {
    expect(formatRelative('invalid')).toBe('');
    expect(formatRelative(new Date(now - 30_000).toISOString())).toBe('ahora');
    expect(formatRelative(new Date(now - 5 * 60_000).toISOString())).toBe('hace 5min');
    expect(formatRelative(new Date(now - 2 * 3_600_000).toISOString())).toBe('hace 2h');
    expect(formatRelative(new Date(now - 3 * 86_400_000).toISOString())).toBe('hace 3d');
    expect(formatRelative(new Date(now - 14 * 86_400_000).toISOString())).toBe('hace 2sem');

    const olderDate = new Date(Date.UTC(2025, 10, 15, 12, 0, 0));
    expect(formatRelative(olderDate.toISOString(), 'device')).toBe(
      olderDate.toLocaleDateString(),
    );
  });

  test('formats compact relative time for dense rows', () => {
    expect(formatRelativeCompact('invalid')).toBe('');
    expect(formatRelativeCompact(new Date(now - 45_000).toISOString())).toBe('ahora');
    expect(formatRelativeCompact(new Date(now - 12 * 60_000).toISOString())).toBe('12m');
    expect(formatRelativeCompact(new Date(now - 6 * 3_600_000).toISOString())).toBe('6h');
    expect(formatRelativeCompact(new Date(now - 4 * 86_400_000).toISOString())).toBe('4d');
  });

  test.each([
    [0, '0s'],
    [59, '59s'],
    [60, '1m'],
    [3599, '59m'],
    [3600, '1h 0m'],
    [-5, '0s'],
  ])('formats %s seconds as %s', (seconds, expected) => {
    expect(formatCompactDuration(seconds)).toBe(expected);
  });

  test('formats one decimal with the Spanish locale', () => {
    expect(formatDecimal(12.34)).toBe('12,3');
    expect(formatDecimal(12)).toBe('12');
  });

  test('normalizes accents, case and repeated whitespace', () => {
    expect(normalizeSearchText('  EXTENSIÓN   de Bíceps ')).toBe(
      'extension de biceps',
    );
  });
});
