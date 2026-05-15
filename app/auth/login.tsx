import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme/tokens';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/app';
import { getProfile } from '@/lib/repos/profile';

export default function Login() {
  const router = useRouter();
  const hydrate = useAppStore((s) => s.hydrate);
  const setProfile = useAppStore((s) => s.setProfile);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handle = async () => {
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError('Email válido y contraseña de mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } = isSignUp
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (authError) throw authError;

      const user = data.user;
      if (!user) throw new Error('No se pudo obtener el usuario.');

      const remoteProfile = await getProfile(user.id);
      if (remoteProfile) {
        await setProfile(remoteProfile);
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    } catch (e: any) {
      setError(e.message ?? 'Error de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text variant="display" tone="brand" style={{ marginBottom: 4 }}>
            GMO
          </Text>
          <Text variant="title" style={{ marginBottom: spacing['2xl'] }}>
            {isSignUp ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
          </Text>

          <Input
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={{ height: spacing.md }} />
          <Input
            label="Contraseña"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

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
            title={isSignUp ? 'Crear cuenta' : 'Entrar'}
            onPress={handle}
            loading={loading}
            style={{ marginTop: spacing.xl }}
            fullWidth
          />

          <Button
            title={isSignUp ? '¿Ya tienes cuenta? Entra' : '¿Sin cuenta? Regístrate'}
            variant="ghost"
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            style={{ marginTop: spacing.sm }}
            fullWidth
          />

          <Button
            title="Continuar sin cuenta"
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
            style={{ marginTop: spacing.sm }}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
