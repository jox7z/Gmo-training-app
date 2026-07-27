import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { signInWithOAuth, AuthError, type OAuthProvider } from '@/lib/auth';

/**
 * Botones OAuth (Google / Apple) — flujo web-based real (ver src/lib/auth/oauth.ts).
 *
 * Apple sólo se renderiza en iOS (requisito de Apple: si ofreces login social de
 * terceros, debes ofrecer Sign in with Apple). El error se propaga al padre vía
 * `onError` para mostrarse con el MISMO mecanismo que los errores de
 * email/password (Card danger + useState en login.tsx / signup.tsx).
 *
 * Hasta que los providers estén habilitados en el Dashboard de Supabase, tocar un
 * botón produce un error "provider is not enabled" que pasa por `humanizeAuthError`.
 */

interface Props {
  /** loading del submit de email/password del padre — deshabilita también estos botones. */
  loading?: boolean;
  /** Superficie el error OAuth con el mismo mecanismo que el padre usa para email/password. */
  onError?: (message: string | null) => void;
  /**
   * Avisa al padre mientras hay un flujo OAuth en curso. El tramo posterior al
   * cierre del navegador (`exchangeCodeForSession` en vuelo) no es visible desde
   * fuera: sin esto el botón de email/password del padre sigue habilitado y se
   * pueden disparar dos flujos de auth a la vez.
   */
  onBusyChange?: (busy: boolean) => void;
}

export function OAuthButtons({ loading, onError, onBusyChange }: Props) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const busy = !!loading || pending !== null;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const handlePress = async (provider: OAuthProvider) => {
    if (busy) return;
    onError?.(null);
    setPending(provider);
    try {
      await signInWithOAuth(provider);
      // Éxito: onAuthStateChange en _layout.tsx recibe SIGNED_IN y navega.
      // No hacemos nada aquí para no competir con esa redirección.
    } catch (e: unknown) {
      onError?.(e instanceof AuthError ? e.message : 'Ha ocurrido un error inesperado.');
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Divider />
      {Platform.OS === 'ios' && (
        <OAuthButton
          provider="apple"
          label="Continuar con Apple"
          disabled={busy}
          loading={pending === 'apple'}
          onPress={() => handlePress('apple')}
        />
      )}
      <OAuthButton
        provider="google"
        label="Continuar con Google"
        disabled={busy}
        loading={pending === 'google'}
        onPress={() => handlePress('google')}
      />
    </View>
  );
}

function OAuthButton({
  provider,
  label,
  disabled,
  loading,
  onPress,
}: {
  provider: OAuthProvider;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const isApple = provider === 'apple';
  const bg = isApple ? '#FFFFFF' : colors.bg.elevated;
  const fg = isApple ? '#000000' : colors.text.primary;
  const borderColor = isApple ? '#FFFFFF' : colors.border;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      // El dimming va plano en `style`: PressableScale ya anima opacidad/escala
      // al pulsar, así que aquí sólo queda el estado estático de deshabilitado.
      style={{
        backgroundColor: bg,
        borderRadius: radius.lg,
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {isApple ? <AppleIcon /> : <GoogleIcon />}
          <Text weight="semibold" style={{ color: fg }}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

function Divider() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text variant="caption" tone="muted">o</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000">
      <Path d="M17.05 12.5c0-2.6 2.1-3.8 2.2-3.9-1.2-1.7-3-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.3 2.5 1.3-.1 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.9 1.4 0 2.3-1.2 3.2-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4M14.4 4.6c.7-.9 1.2-2.1 1.1-3.3-1 .1-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5" />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9c-.3 1.4-1 2.5-2.1 3.3v2.7h3.5c2-1.9 3.2-4.7 3.2-8"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.8 0 5.2-1 7-2.5l-3.5-2.7c-1 .7-2.2 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.6v2.8C4.5 20.7 8 23 12 23"
        fill="#34A853"
      />
      <Path
        d="M6.2 14.5c-.4-1.2-.4-2.5 0-3.7V8H2.6c-1.4 2.8-1.4 6 0 8.8l3.6-2.3"
        fill="#FBBC04"
      />
      <Path
        d="M12 5.5c1.5 0 2.9.5 3.9 1.5l2.9-2.9C17.1 2.4 14.7 1.5 12 1.5 8 1.5 4.5 3.8 2.6 7.2L6.2 10c.8-2.5 3.1-4.3 5.8-4.3"
        fill="#EA4335"
      />
    </Svg>
  );
}
