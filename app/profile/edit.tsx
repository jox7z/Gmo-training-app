import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Loader } from '@/components/ui/Loader';
import { colors, radius, spacing } from '@/theme/tokens';
import { useAppStore, LOCAL_USER_ID } from '@/store/app';
import { useToast } from '@/components/ui/Toast';
import { checkUsernameAvailable, AuthError } from '@/lib/auth';
import { upsertProfile } from '@/lib/repos/profile';
import { uploadAvatar } from '@/lib/storage/photos';
import { isUsernameValid } from '@/lib/passwordPolicy';
import { isSupabaseConfigured } from '@/lib/supabase';

const BIO_MAX = 160;

type UsernameCheck =
  | { state: 'idle' | 'checking' | 'available' }
  | { state: 'invalid' | 'taken' | 'error'; message: string };

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);

  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.avatarUrl);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>({ state: 'idle' });

  // Debounce username availability — solo dispara el RPC si el formato local
  // es válido. Si el username es igual al actual del perfil, lo consideramos
  // "available" (es el dueño actual).
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setUsernameCheck({ state: 'idle' });
      return;
    }
    if (trimmed === profile?.username) {
      setUsernameCheck({ state: 'available' });
      return;
    }
    if (!isUsernameValid(trimmed)) {
      setUsernameCheck({ state: 'invalid', message: 'Solo minúsculas, números o _ (3-20)' });
      return;
    }
    setUsernameCheck({ state: 'checking' });
    const handle = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(trimmed);
        setUsernameCheck(
          ok ? { state: 'available' } : { state: 'taken', message: 'Ese username ya está tomado.' },
        );
      } catch (e) {
        setUsernameCheck({
          state: 'error',
          message: e instanceof AuthError ? e.message : 'No pudimos validar el username.',
        });
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [username, profile?.username]);

  if (!profile) return <Loader />;

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.show({ message: 'Necesitamos permiso para acceder a tus fotos.', tone: 'info' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setPendingAvatarUri(result.assets[0].uri);
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (e) {
      toast.show({ message: (e as Error)?.message ?? 'No se pudo abrir la galería', tone: 'danger' });
    }
  };

  const canSave =
    displayName.trim().length >= 2 &&
    (usernameCheck.state === 'available' || username.trim().toLowerCase() === profile.username) &&
    !saving &&
    !uploading;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const remote = isSupabaseConfigured && profile.id !== LOCAL_USER_ID;

    // 1. Persiste primero los campos editables del perfil (sin tocar avatar).
    //    Si esto falla, no hemos subido ningún archivo a Storage — no quedan
    //    huérfanos. Si tiene éxito, garantizamos que el usuario ya ve sus
    //    cambios guardados aunque la foto falle después.
    const baseNext = {
      ...profile,
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      bio: bio.trim(),
    };

    try {
      if (remote) await upsertProfile(baseNext);
      await setProfile(baseNext);
    } catch (e) {
      setSaving(false);
      toast.show({
        message: (e as Error)?.message ?? 'No se pudo guardar el perfil',
        tone: 'danger',
      });
      return;
    }

    // 2. Si hay foto nueva pendiente, súbela ahora y haz un segundo upsert
    //    solo para `avatar_url`. Si esto falla, los demás cambios ya quedaron
    //    persistidos — el usuario solo necesita reintentar la foto.
    if (pendingAvatarUri && remote) {
      setUploading(true);
      try {
        const url = await uploadAvatar(profile.id, pendingAvatarUri);
        const withAvatar = { ...baseNext, avatarUrl: url };
        await upsertProfile(withAvatar);
        await setProfile(withAvatar);
        setAvatarUrl(url);
        setPendingAvatarUri(null);
      } catch (e) {
        setUploading(false);
        setSaving(false);
        toast.show({
          message: (e as Error)?.message
            ? `Foto no subida: ${(e as Error).message}. Reintenta sin perder los demás cambios.`
            : 'No se pudo subir la foto. Reintenta sin perder los demás cambios.',
          tone: 'danger',
        });
        return;
      }
      setUploading(false);
    }

    setSaving(false);
    toast.show({ message: 'Perfil actualizado', tone: 'success' });
    router.back();
  };

  const usernameHint =
    usernameCheck.state === 'idle' ? '3-20 caracteres · letras, números o _'
    : usernameCheck.state === 'checking' ? 'Verificando…'
    : usernameCheck.state === 'available' ? 'Disponible'
    : undefined;
  const usernameError =
    usernameCheck.state === 'invalid' || usernameCheck.state === 'taken' || usernameCheck.state === 'error'
      ? usernameCheck.message
      : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.bg.elevated,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={16} color={colors.text.primary} />
            </View>
          </Pressable>
          <Text variant="heading" weight="bold">Editar perfil</Text>
          <Pressable onPress={handleSave} hitSlop={10} disabled={!canSave}>
            <Text variant="body" weight="bold" tone={canSave ? 'brand' : 'muted'}>
              {saving ? '...' : 'Guardar'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <Pressable onPress={pickImage} hitSlop={6}>
              <View style={{ position: 'relative' }}>
                <Avatar uri={avatarUrl} name={displayName || username} size={110} />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.primary.DEFAULT,
                    borderWidth: 3,
                    borderColor: colors.bg.base,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="camera" size={16} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>
            <Pressable onPress={pickImage} style={{ marginTop: spacing.md }} hitSlop={6}>
              <Text variant="caption" tone="brand" weight="bold">
                {uploading ? 'Subiendo…' : 'Cambiar foto'}
              </Text>
            </Pressable>
          </View>

          <Card padding="lg" style={{ gap: spacing.lg }}>
            <Input
              label="Nombre"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Tu nombre público"
              maxLength={30}
              autoCapitalize="words"
              error={displayName.trim().length > 0 && displayName.trim().length < 2 ? 'Mínimo 2 caracteres' : undefined}
            />
            <Input
              label="Username"
              value={username}
              onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
              placeholder="adrian_lifts"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              hint={usernameHint}
              error={usernameError}
            />
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text variant="label" tone="secondary">Biografía</Text>
                <Text variant="caption" tone={bio.length > BIO_MAX ? 'danger' : 'muted'} numeric>
                  {bio.length}/{BIO_MAX}
                </Text>
              </View>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: bio.length > BIO_MAX ? colors.danger : colors.border,
                  backgroundColor: colors.bg.elevated,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  minHeight: 96,
                }}
              >
                <TextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
                  placeholder="Habla de ti, tu deporte y tus metas"
                  placeholderTextColor={colors.text.muted}
                  multiline
                  textAlignVertical="top"
                  style={{ color: colors.text.primary, fontSize: 15, minHeight: 76 }}
                />
              </View>
            </View>
          </Card>

          <Button
            title={saving ? 'Guardando…' : 'Guardar cambios'}
            onPress={handleSave}
            loading={saving || uploading}
            disabled={!canSave}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
