import { useState } from 'react';
import { View, Pressable, Linking as RNLinking, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import { humanizeAuthError } from '@/lib/authErrors';

export default function CheckEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; purpose?: 'signup' | 'reset' }>();
  const email = params.email ?? '';
  const purpose = (params.purpose as 'signup' | 'reset') ?? 'signup';

  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setError(null);
    setMessage(null);
    setResending(true);
    try {
      if (purpose === 'signup') {
        const { error: err } = await supabase.auth.resend({ type: 'signup', email });
        if (err) throw err;
      } else {
        const redirectTo = Linking.createURL('/auth/reset-password');
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (err) throw err;
      }
      setMessage('Te enviamos un nuevo enlace. Revisa tu bandeja de entrada.');
    } catch (e: unknown) {
      setError(humanizeAuthError(e));
    } finally {
      setResending(false);
    }
  };

  const openMailApp = () => {
    const url = Platform.OS === 'ios' ? 'message://' : 'mailto:';
    RNLinking.openURL(url).catch(() => {});
  };

  const title = purpose === 'signup' ? '¡Casi listo!' : 'Revisa tu email';
  const description =
    purpose === 'signup'
      ? `Te enviamos un email de confirmación a ${email}. Haz click en el enlace para activar tu cuenta.`
      : `Te enviamos un enlace de recuperación a ${email}. Haz click en él para crear una nueva contraseña.`;

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: spacing['2xl'] }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: colors.accent.soft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ fontSize: 44 }}>📩</Text>
          </View>
          <Text variant="title" style={{ textAlign: 'center' }}>{title}</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            {description}
          </Text>
        </View>

        {message && (
          <Card variant="outlined" padding="md" style={{ marginBottom: spacing.md, borderColor: colors.success }}>
            <Text variant="caption" style={{ color: colors.success }}>{message}</Text>
          </Card>
        )}
        {error && (
          <Card variant="outlined" padding="md" style={{ marginBottom: spacing.md, borderColor: colors.danger }}>
            <Text variant="caption" style={{ color: colors.danger }}>{error}</Text>
          </Card>
        )}

        <Button title="Abrir app de email" onPress={openMailApp} fullWidth />

        <Button
          title={resending ? 'Reenviando…' : 'Reenviar enlace'}
          variant="ghost"
          onPress={handleResend}
          loading={resending}
          style={{ marginTop: spacing.sm }}
          fullWidth
        />

        <Pressable
          onPress={() => router.replace('/auth/login')}
          hitSlop={10}
          style={{ marginTop: spacing.xl, alignSelf: 'center' }}
        >
          <Text variant="caption" tone="brand" weight="semibold">Volver a iniciar sesión</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
