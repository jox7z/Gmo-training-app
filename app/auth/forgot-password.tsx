import { useState, useRef, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Pressable, TextInput } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme/tokens';
import { resetPasswordForEmail, AuthError } from '@/lib/auth';
import { isEmailValid } from '@/lib/passwordPolicy';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const emailValid = isEmailValid(email);
  const canSubmit = emailValid && !loading;

  const handleSend = async () => {
    setTouched(true);
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('/auth/reset-password');
      await resetPasswordForEmail(email, redirectTo);
      router.replace({
        pathname: '/auth/check-email',
        params: { email: email.trim(), purpose: 'reset' },
      });
    } catch (e: unknown) {
      setError(e instanceof AuthError ? e.message : 'Ha ocurrido un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingVertical: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginBottom: spacing.lg }}>
            <Text variant="heading" tone="muted">← Volver</Text>
          </Pressable>

          <Text variant="title">Recuperar contraseña</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm, marginBottom: spacing['2xl'] }}>
            Introduce el email asociado a tu cuenta. Te enviaremos un enlace para crear una nueva contraseña.
          </Text>

          <Input
            ref={emailRef}
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (error) setError(null);
            }}
            onBlur={() => setTouched(true)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            error={touched && email.length > 0 && !emailValid ? 'Email no válido' : undefined}
          />

          {error && (
            <Card
              variant="outlined"
              padding="md"
              style={{ marginTop: spacing.md, borderColor: colors.danger }}
            >
              <Text variant="caption" style={{ color: colors.danger }}>{error}</Text>
            </Card>
          )}

          <Button
            title="Enviar enlace"
            onPress={handleSend}
            loading={loading}
            disabled={!canSubmit}
            style={{ marginTop: spacing.xl }}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
