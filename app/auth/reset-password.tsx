import { useState, useRef, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PasswordChecklist } from '@/components/auth/PasswordChecklist';
import { colors, spacing } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import { humanizeAuthError } from '@/lib/authErrors';
import { isPasswordValid } from '@/lib/passwordPolicy';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const t = setTimeout(() => passwordRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const valid = isPasswordValid(password) && password === confirm;
  const canSubmit = valid && !loading;

  const handleReset = async () => {
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => router.replace('/(tabs)'), 1500);
    } catch (e: unknown) {
      setError(humanizeAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text variant="title" style={{ marginTop: spacing.lg }}>¡Contraseña actualizada!</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            Te redirigimos a la app…
          </Text>
        </View>
      </Screen>
    );
  }

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
          <Text variant="title">Nueva contraseña</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm, marginBottom: spacing['2xl'] }}>
            Crea una nueva contraseña segura para tu cuenta.
          </Text>

          <PasswordInput
            ref={passwordRef}
            label="Nueva contraseña"
            placeholder="Crea una nueva contraseña"
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />

          <PasswordStrengthMeter password={password} />
          {password.length > 0 && <PasswordChecklist password={password} />}

          <View style={{ height: spacing.md }} />

          <PasswordInput
            ref={confirmRef}
            label="Confirmar contraseña"
            placeholder="Repite la contraseña"
            value={confirm}
            onChangeText={setConfirm}
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={handleReset}
            error={
              confirm.length > 0 && confirm !== password
                ? 'Las contraseñas no coinciden'
                : undefined
            }
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
            title="Actualizar contraseña"
            onPress={handleReset}
            loading={loading}
            disabled={!canSubmit}
            style={{ marginTop: spacing.xl }}
            fullWidth
          />

          <Pressable
            onPress={() => router.replace('/auth/login')}
            hitSlop={10}
            style={{ marginTop: spacing.lg, alignSelf: 'center' }}
          >
            <Text variant="caption" tone="brand" weight="semibold">Cancelar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
