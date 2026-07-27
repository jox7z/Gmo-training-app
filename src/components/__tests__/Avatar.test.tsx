/**
 * Avatar — fallback de inicial cuando no hay foto de perfil.
 * Sin "uri" se muestra la primera letra de "name" en mayúscula; sin "name"
 * (undefined o vacío) cae al fallback "?".
 */
import { render, screen } from '@testing-library/react-native';
import { Avatar } from '@/components/Avatar';

describe('Avatar', () => {
  it('muestra la primera letra de name en mayúscula', async () => {
    await render(<Avatar name="Juan Pérez" />);
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('sin name cae al fallback "?"', async () => {
    await render(<Avatar />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('con name vacío también cae al fallback "?"', async () => {
    await render(<Avatar name="" />);
    expect(screen.getByText('?')).toBeTruthy();
  });
});
