/**
 * Test de humo: confirma que el mock oficial de AsyncStorage (cableado vía
 * jest.setup.ts + "setupFiles") está realmente activo. Guardia de regresión
 * permanente — si un futuro cambio a jest.setup.ts/"setupFiles" rompe el
 * mock, este falla primero y con un mensaje claro en vez de corromper
 * silenciosamente cualquier test de store que corra antes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('setup de testing — AsyncStorage mock', () => {
  it('setItem/getItem funcionan contra el mock oficial', async () => {
    await AsyncStorage.setItem('k', 'v');
    const value = await AsyncStorage.getItem('k');

    expect(value).toBe('v');
  });
});
