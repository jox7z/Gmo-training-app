/**
 * ConfirmDialog — confirmación única para acciones destructivas.
 *
 * Sustituye los `Alert.alert` de dos botones repartidos por la app, que
 * renderizan el diálogo claro del sistema dentro de una app dark-only y no
 * comparten copy ni jerarquía de botones.
 *
 * Uso:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Eliminar rutina', destructive: true }))) return;
 *
 * Si el proveedor no está montado, degrada a `Alert.alert` en vez de fallar.
 */
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface ConfirmOptions {
  title: string;
  /** Consecuencia concreta de continuar. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Marca la acción como destructiva: botón en rojo. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

function alertFallback({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOptions(null);
    resolve?.(value);
  }, []);

  const confirm = useCallback<ConfirmFn>((next) => {
    // Una confirmación pendiente se resuelve como cancelada antes de abrir otra.
    resolverRef.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        visible={options !== null}
        onClose={() => settle(false)}
        variant="center"
        title={options?.title}
        showClose={false}
        closeAccessibilityLabel={options?.cancelLabel ?? 'Cancelar'}
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title={options?.cancelLabel ?? 'Cancelar'}
              variant="secondary"
              onPress={() => settle(false)}
              style={{ flex: 1 }}
            />
            <Button
              title={options?.confirmLabel ?? 'Confirmar'}
              variant={options?.destructive ? 'danger' : 'primary'}
              onPress={() => settle(true)}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <Text variant="body" tone="secondary">
          {options?.message ?? '¿Quieres continuar?'}
        </Text>
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  return ctx ?? alertFallback;
}
