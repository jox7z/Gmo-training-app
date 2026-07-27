import { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme/tokens';
import {
  exchangeOAuthCode,
  AuthError,
  OAUTH_GENERIC_ERROR,
  OAUTH_CANCELLED_MESSAGE,
} from '@/lib/auth';

/**
 * Red de seguridad del redirect OAuth. En el camino feliz esta pantalla NO se
 * monta: `WebBrowser.openAuthSessionAsync` intercepta el redirect antes de que
 * llegue al router. Existe para el caso en que sí llega — p. ej. Android mata
 * el proceso durante el salto al navegador y el `code` vuelve como un deep link
 * de arranque en frío — donde sin ruta registrada caeríamos en el "unmatched
 * route" de Expo Router (en inglés) perdiendo el código sin ningún aviso.
 */
export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const [error, setError] = useState<string | null>(null);

  const code = typeof params.code === 'string' ? params.code : null;
  const providerError = typeof params.error === 'string' ? params.error : null;
  const providerErrorDescription =
    typeof params.error_description === 'string' ? params.error_description : null;

  // El canje consume el code (un solo uso): lo disparamos una única vez por
  // montaje aunque los params provoquen re-renders.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (providerError || providerErrorDescription) {
      setError(providerError === 'access_denied' ? OAUTH_CANCELLED_MESSAGE : OAUTH_GENERIC_ERROR);
      return;
    }
    if (!code) {
      setError(OAUTH_GENERIC_ERROR);
      return;
    }

    // Éxito: NO navegamos aquí. El listener `onAuthStateChange` + la lógica de
    // gating centralizada de app/_layout.tsx deciden /onboarding vs /(tabs) en
    // cuanto aparece la sesión; duplicar la navegación competiría con ella.
    exchangeOAuthCode(code).catch((e: unknown) => {
      setError(e instanceof AuthError ? e.message : OAUTH_GENERIC_ERROR);
    });
  }, [code, providerError, providerErrorDescription]);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {error ? (
          <>
            <Text variant="title" style={{ textAlign: 'center' }}>
              No pudimos iniciar sesión
            </Text>
            <Card
              variant="outlined"
              padding="md"
              style={{ marginTop: spacing.lg, alignSelf: 'stretch', borderColor: colors.danger }}
            >
              <Text variant="caption" style={{ color: colors.danger }}>
                {error}
              </Text>
            </Card>
            <Pressable
              onPress={() => router.replace('/auth/login')}
              hitSlop={10}
              style={{ marginTop: spacing.xl }}
            >
              <Text variant="caption" tone="brand" weight="semibold">
                Volver a iniciar sesión
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary.DEFAULT} />
            <Text variant="body" tone="secondary" style={{ marginTop: spacing.lg }}>
              Completando inicio de sesión…
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}
