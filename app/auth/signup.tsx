import { useState, useRef, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { colors, spacing, radius } from '@/theme/tokens';
import { isEmailValid, isPasswordValid } from '@/lib/passwordPolicy';
import { signUp, AuthError } from '@/lib/auth';

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirm: false,
  });

  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmRef = useRef<TextInput | null>(null);

  useEffect(() => {
    // Slight delay so the screen mounts before requesting focus on Android.
    const t = setTimeout(() => emailRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const emailValid = isEmailValid(email);
  const passwordValid = isPasswordValid(password);
  const confirmValid = confirm.length > 0 && confirm === password;

  const canSubmit =
    emailValid &&
    passwordValid &&
    confirmValid &&
    acceptTerms &&
    !loading &&
    !oauthBusy;

  const handleSignup = async () => {
    setTouched({ email: true, password: true, confirm: true });
    setError(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp({ email, password });

      if (needsEmailConfirmation) {
        router.replace({
          pathname: '/auth/check-email',
          params: { email: email.trim(), purpose: 'signup' },
        });
        setLoading(false);
        return;
      }
      // Auto-login: el _layout va a navegar a /onboarding en cuanto
      // procese SIGNED_IN. Dejamos loading=true para que el botón siga
      // deshabilitado y el usuario no pueda disparar un segundo signUp
      // durante la ventana de redirect (100-500 ms).
    } catch (e: unknown) {
      setError(e instanceof AuthError ? e.message : 'Ha ocurrido un error inesperado.');
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
          contentContainerStyle={{ paddingVertical: spacing.xl, paddingBottom: spacing['3xl'] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginBottom: spacing.lg }}>
            <Text variant="heading" tone="muted">← Volver</Text>
          </Pressable>

          <Text variant="display" tone="brand">GMO</Text>
          <Text variant="title" style={{ marginTop: 4 }}>Crea tu cuenta</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: 4, marginBottom: spacing['2xl'] }}>
            Empieza a registrar tus entrenamientos en minutos.
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
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={touched.email && email.length > 0 && !emailValid ? 'Email no válido' : undefined}
          />

          <View style={{ height: spacing.md }} />

          <PasswordInput
            ref={passwordRef}
            label="Contraseña"
            placeholder="Crea una contraseña segura"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />

          <PasswordStrengthMeter password={password} />

          <View style={{ height: spacing.md }} />

          <PasswordInput
            ref={confirmRef}
            label="Confirmar contraseña"
            placeholder="Repite la contraseña"
            value={confirm}
            onChangeText={(v) => {
              setConfirm(v);
              if (error) setError(null);
            }}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={handleSignup}
            error={
              touched.confirm && confirm.length > 0 && !confirmValid
                ? 'Las contraseñas no coinciden'
                : undefined
            }
          />

          <TermsCheckbox checked={acceptTerms} onToggle={() => setAcceptTerms((v) => !v)} />

          {error && (
            <Card
              variant="outlined"
              padding="md"
              style={{ marginTop: spacing.md, borderColor: colors.danger }}
            >
              <Text variant="caption" style={{ color: colors.danger }}>
                {error}
              </Text>
            </Card>
          )}

          <Button
            title="Crear cuenta"
            onPress={handleSignup}
            loading={loading}
            disabled={!canSubmit}
            style={{ marginTop: spacing.xl }}
            fullWidth
          />

          <OAuthButtons loading={loading} onError={setError} onBusyChange={setOauthBusy} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl, gap: 4 }}>
            <Text variant="caption" tone="secondary">¿Ya tienes cuenta?</Text>
            <Pressable onPress={() => router.replace('/auth/login')} hitSlop={6}>
              <Text variant="caption" tone="brand" weight="bold">Inicia sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function TermsCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginTop: spacing.lg,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.sm,
          borderWidth: 1.5,
          borderColor: checked ? colors.primary.DEFAULT : colors.border,
          backgroundColor: checked ? colors.primary.DEFAULT : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {checked && (
          <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: '900' }}>✓</Text>
        )}
      </View>
      <Text variant="caption" tone="secondary" style={{ flex: 1, lineHeight: 18 }}>
        Acepto los{' '}
        <Text variant="caption" tone="brand" weight="semibold">Términos y condiciones</Text>
        {' '}y la{' '}
        <Text variant="caption" tone="brand" weight="semibold">Política de privacidad</Text>.
      </Text>
    </Pressable>
  );
}
