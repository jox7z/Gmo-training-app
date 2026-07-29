import { runHapticSafely } from '@/lib/haptics';

describe('runHapticSafely', () => {
  it('resuelve aunque el dispositivo rechace el feedback', async () => {
    const effect = jest.fn(async () => {
      throw new Error('Haptics unavailable');
    });

    await expect(runHapticSafely(effect)).resolves.toBeUndefined();
    expect(effect).toHaveBeenCalledTimes(1);
  });
});
