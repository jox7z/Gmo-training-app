import { useState, useRef, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { colors, spacing } from '@/theme/tokens';
import { useAppStore } from '@/store/app';
import { getProfile } from '@/lib/repos/profile';
import { isEmailValid } from '@/lib/passwordPolicy';
import { signIn, AuthError } from '@/lib/auth';

export default function Login() {
  const router = useRouter();
  const setProfile = useAppStore((s) => s.setProfile);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const passwordRef = useRef<TextInput | null>(null);
  const emailRef = useRef<TextInput | null>(null);

  useEffect(() => {
    // Slight delay so the screen mounts before requesting focus on Android.
    const t = setTimeout(() => emailRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const emailValid = isEmailValid(email);
  const canSubmit = emailValid && password.length >= 6 && !loading && !oauthBusy;

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { userId } = await signIn(email, password);

      const remoteProfile = await getProfile(userId);
      if (remoteProfile) {
        await setProfile(remoteProfile);
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
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
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: spacing['2xl'] }}>
            <Text variant="display" tone="brand">GMO</Text>
            <Text variant="title" style={{ marginTop: 4 }}>Bienvenido de vuelta</Text>
            <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
              Entrena. Compite. Evoluciona.
            </Text>
          </View>

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
            placeholder="Tu contraseña"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          <Pressable
            onPress={() => router.push('/auth/forgot-password')}
            hitSlop={8}
            style={{ alignSelf: 'flex-end', marginTop: spacing.sm }}
          >
            <Text variant="caption" tone="brand" weight="semibold">
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>

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
            title="Entrar"
            onPress={handleLogin}
            loading={loading}
            disabled={!canSubmit}
            style={{ marginTop: spacing.xl }}
            fullWidth
          />

          <OAuthButtons loading={loading} onError={setError} onBusyChange={setOauthBusy} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl, gap: 4 }}>
            <Text variant="caption" tone="secondary">¿No tienes cuenta?</Text>
            <Pressable onPress={() => router.push('/auth/signup')} hitSlop={6}>
              <Text variant="caption" tone="brand" weight="bold">Crear cuenta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
