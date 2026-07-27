/**
 * RankBadge — label del rango actual + progreso hacia el siguiente rango.
 * rankFromPoints/nextRank (src/theme/tokens.ts) son la fuente de verdad de los
 * 9 tiers; acá se usan reales (sin mockear) para no duplicar los thresholds.
 */
import { render, screen } from '@testing-library/react-native';
import { RankBadge } from '@/components/RankBadge';

describe('RankBadge', () => {
  it('con showProgress y points bajos muestra el rango actual y el progreso al siguiente', async () => {
    await render(<RankBadge points={150} showProgress />);
    expect(screen.getByText('Rookie')).toBeTruthy();
    expect(screen.getByText('150 / 200 pts → Bronze')).toBeTruthy();
  });

  it('en el rango máximo (Olympus) muestra "rango máximo" y no la barra de progreso', async () => {
    await render(<RankBadge points={20000} showProgress />);
    expect(screen.getByText('Olympus')).toBeTruthy();
    expect(screen.getByText('Rango máximo alcanzado · 20000 pts')).toBeTruthy();
    expect(screen.queryByText(/pts →/)).toBeNull();
  });

  it('con showProgress=false no renderiza la sección de progreso', async () => {
    await render(<RankBadge points={150} />);
    expect(screen.queryByText('Rookie')).toBeNull();
    expect(screen.queryByText(/pts →/)).toBeNull();
  });
});
