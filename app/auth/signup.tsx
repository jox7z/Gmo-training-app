import { useState, useRef, useEffect, useMemo } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PasswordChecklist } from '@/components/auth/PasswordChecklist';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { colors, spacing, radius } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import { humanizeAuthError } from '@/lib/authErrors';
import {
  isEmailValid,
  isPasswordValid,
  isUsernameValid,
  suggestUsernameFromEmail,
} from '@/lib/passwordPolicy';

export default function Signup() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    displayName: false,
    username: false,
    email: false,
    password: false,
    confirm: false,
  });

  const displayRef = useRef<TextInput | null>(null);
  const usernameRef = useRef<TextInput | null>(null);
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const t = setTimeout(() => displayRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  // Auto-suggest username from email if user hasn't touched it
  useEffect(() => {
    if (!usernameTouched && email && isEmailValid(email)) {
      setUsername(suggestUsernameFromEmail(email));
    }
  }, [email, usernameTouched]);

  const displayValid = displayName.trim().length >= 2;
  const usernameValid = isUsernameValid(username);
  const emailValid = isEmailValid(email);
  const passwordValid = isPasswordValid(password);
  const confirmValid = confirm.length > 0 && confirm === password;

  const canSubmit =
    displayValid &&
    usernameValid &&
    emailValid &&
    passwordValid &&
    confirmValid &&
    acceptTerms &&
    !loading;

  const handleSignup = async () => {
    setTouched({
      displayName: true,
      username: true,
      email: true,
      password: true,
      confirm: true,
    });
    setError(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            username: username.trim(),
          },
        },
      });
      if (authError) throw authError;
      if (!data.user) throw new Error('No se pudo crear el usuario.');

      // Supabase by default sends a confirmation email and does NOT log the user in.
      // If session is present, email confirmation is disabled and we can go straight in.
      if (data.session) {
        router.replace('/onboarding');
      } else {
        router.replace({
          pathname: '/auth/check-email',
          params: { email: email.trim(), purpose: 'signup' },
        });
      }
    } catch (e: unknown) {
      setError(humanizeAuthError(e));
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
            ref={displayRef}
            label="Nombre"
            placeholder="Adrián Hernández"
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={() => setTouched((t) => ({ ...t, displayName: true }))}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => usernameRef.current?.focus()}
            error={touched.displayName && !displayValid ? 'Mínimo 2 caracteres' : undefined}
          />

          <View style={{ height: spacing.md }} />

          <Input
            ref={usernameRef}
            label="Usuario"
            placeholder="adrian_lifts"
            value={username}
            onChangeText={(v) => {
              setUsername(v.toLowerCase());
              setUsernameTouched(true);
            }}
            onBlur={() => setTouched((t) => ({ ...t, username: true }))}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            hint="3-20 caracteres · letras, números o guion bajo"
            error={touched.username && username.length > 0 && !usernameValid ? 'Solo minúsculas, números o _' : undefined}
          />

          <View style={{ height: spacing.md }} />

          <Input
            ref={emailRef}
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
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
            onChangeText={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />

          <PasswordStrengthMeter password={password} />
          {(touched.password || password.length > 0) && (
            <PasswordChecklist password={password} />
          )}

          <View style={{ height: spacing.md }} />

          <PasswordInput
            ref={confirmRef}
            label="Confirmar contraseña"
            placeholder="Repite la contraseña"
            value={confirm}
            onChangeText={setConfirm}
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

          <OAuthButtons loading={loading} />

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
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>✓</Text>
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
