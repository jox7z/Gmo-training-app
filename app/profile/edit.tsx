import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
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
import { useAppStore, LOCAL_USER_ID, Sex } from '@/store/app';
import { useToast } from '@/components/ui/Toast';
import { checkUsernameAvailable, AuthError } from '@/lib/auth';
import { upsertProfile, getProfile } from '@/lib/repos/profile';
import { uploadAvatar } from '@/lib/storage/photos';
import { isUsernameValid } from '@/lib/passwordPolicy';
import { isSupabaseConfigured } from '@/lib/supabase';
import { linkInstagram } from '@/lib/instagram';

// Necesario para que iOS cierre la ventana del browser correctamente
WebBrowser.maybeCompleteAuthSession();

const BIO_MAX = 160;
const INSTAGRAM_RE = /^[A-Za-z0-9._]{1,30}$/;

/** Normaliza entrada del usuario: acepta '@user' o URL de instagram → solo username */
function normalizeInstagram(raw: string): string {
  const trimmed = raw.trim();
  // URL completa: https://instagram.com/user o instagram.com/user
  const urlMatch = trimmed.match(/(?:instagram\.com\/)([\w.]+)/i);
  if (urlMatch) return urlMatch[1];
  // Con @ al inicio
  return trimmed.replace(/^@/, '');
}

type UsernameCheck =
  | { state: 'idle' | 'checking' | 'available' }
  | { state: 'invalid' | 'taken' | 'error'; message: string };

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);

  // Params de deep link: Android puede resolver el callback navegando directamente
  // a /profile/edit en vez de devolver la URL al browser abierto.
  const params = useLocalSearchParams<{ ig_status?: string; ig_username?: string; reason?: string }>();

  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'male');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [instagram, setInstagram] = useState(profile?.instagramUsername ?? '');
  const [instagramError, setInstagramError] = useState<string | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.avatarUrl);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>({ state: 'idle' });

  // Caso Android: el deep link de retorno del OAuth navega directamente a esta
  // pantalla con los params. Procesamos una sola vez y limpiamos los params.
  useEffect(() => {
    const status = params.ig_status;
    if (!status) return;

    if (status === 'success' && params.ig_username) {
      toast.show({ message: `Instagram vinculado como @${params.ig_username}`, tone: 'success' });
      if (profile) {
        const remote = isSupabaseConfigured && profile.id !== LOCAL_USER_ID;
        if (remote) {
          getProfile(profile.id).then((updated) => {
            if (updated) setProfile(updated);
          }).catch(() => {});
        }
      }
    } else if (status === 'cancelled') {
      toast.show({ message: 'Vinculación cancelada', tone: 'info' });
    } else if (status === 'error') {
      const reason = params.reason;
      if (reason === 'already_linked') {
        toast.show({ message: 'Esa cuenta ya está vinculada a otro perfil', tone: 'danger' });
      } else {
        toast.show({ message: 'No se pudo vincular Instagram. Inténtalo de nuevo.', tone: 'danger' });
      }
    }

    // Limpiar params para no repetir el toast al re-render. Strings vacíos en
    // lugar de undefined: algunas versiones de Expo Router serializan undefined
    // como el literal 'undefined' en la URL.
    router.setParams({ ig_status: '', ig_username: '', reason: '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ig_status]);

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

  const isVerified = profile.instagramVerified === true;

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
    !uploading &&
    // Mientras hay un OAuth de Instagram en vuelo, guardar podría enviar un
    // instagram_username viejo y el trigger degradaría la verificación recién hecha.
    !linking;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const remote = isSupabaseConfigured && profile.id !== LOCAL_USER_ID;

    // 1. Persiste primero los campos editables del perfil (sin tocar avatar).
    //    Si esto falla, no hemos subido ningún archivo a Storage — no quedan
    //    huérfanos. Si tiene éxito, garantizamos que el usuario ya ve sus
    //    cambios guardados aunque la foto falle después.

    // Si está verificado, el instagram_username no se toca desde este formulario
    // (el campo no es editable). Si no está verificado, se normaliza la entrada.
    let igUsername: string | undefined;
    if (isVerified) {
      igUsername = profile.instagramUsername;
    } else {
      const normalizedIg = normalizeInstagram(instagram);
      if (normalizedIg && !INSTAGRAM_RE.test(normalizedIg)) {
        setInstagramError('Solo letras, números, puntos o _ (máx 30)');
        setSaving(false);
        return;
      }
      igUsername = normalizedIg || undefined;
    }

    const baseNext = {
      ...profile,
      sex,
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      bio: bio.trim(),
      instagramUsername: igUsername,
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

  const handleLink = async () => {
    if (!isSupabaseConfigured || profile.id === LOCAL_USER_ID) {
      toast.show({ message: 'Necesitas una cuenta para vincular Instagram', tone: 'info' });
      return;
    }
    setLinking(true);
    try {
      const result = await linkInstagram();
      if (result.status === 'pending') {
        // Android: el resultado llegará por deep link (useEffect de ig_status).
        // No mostramos toast aquí para no contradecir el resultado real.
        return;
      }
      if (result.status === 'success') {
        toast.show({ message: `Instagram vinculado como @${result.username}`, tone: 'success' });
        const updated = await getProfile(profile.id);
        if (updated) await setProfile(updated);
      } else if (result.status === 'cancelled') {
        toast.show({ message: 'Vinculación cancelada', tone: 'info' });
      } else {
        if (result.reason === 'already_linked') {
          toast.show({ message: 'Esa cuenta ya está vinculada a otro perfil', tone: 'danger' });
        } else {
          toast.show({ message: 'No se pudo vincular Instagram. Inténtalo de nuevo.', tone: 'danger' });
        }
      }
    } catch (e) {
      toast.show({ message: (e as Error)?.message ?? 'Error al vincular Instagram', tone: 'danger' });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = () => {
    Alert.alert(
      'Desvincular Instagram',
      '¿Confirmas que quieres desvincular tu cuenta de Instagram? Perderás el badge de verificación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            const next = { ...profile, instagramUsername: undefined, instagramVerified: false };
            try {
              if (isSupabaseConfigured && profile.id !== LOCAL_USER_ID) await upsertProfile(next);
              await setProfile(next);
              setInstagram('');
              toast.show({ message: 'Instagram desvinculado', tone: 'success' });
            } catch {
              toast.show({ message: 'No se pudo desvincular', tone: 'danger' });
            }
          },
        },
      ],
    );
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

          <Card variant="raised" padding="lg" style={{ gap: spacing.lg }}>
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

            {/* Sección Instagram */}
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">Instagram</Text>

              {isVerified ? (
                /* Estado verificado: solo lectura */
                <View style={{ gap: spacing.sm }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.lg,
                      backgroundColor: colors.bg.elevated,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Icon name="instagram" size={16} color="#E1306C" />
                    <Text variant="body" style={{ color: '#E1306C', flex: 1 }} weight="semibold">
                      @{profile.instagramUsername}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: radius.full,
                        backgroundColor: 'rgba(34,197,94,0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(34,197,94,0.4)',
                      }}
                    >
                      <Icon name="check" size={12} color="#22c55e" />
                      <Text variant="caption" weight="bold" style={{ color: '#22c55e' }}>Verificado</Text>
                    </View>
                  </View>
                  <Pressable onPress={handleUnlink} hitSlop={6}>
                    <Text variant="caption" tone="muted" style={{ textDecorationLine: 'underline' }}>
                      Desvincular cuenta
                    </Text>
                  </Pressable>
                </View>
              ) : (
                /* Estado no verificado: input manual + botón OAuth */
                <View style={{ gap: spacing.sm }}>
                  <Input
                    value={instagram}
                    onChangeText={(t) => {
                      setInstagram(t);
                      setInstagramError(undefined);
                    }}
                    placeholder="@tu_usuario o URL"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={60}
                    hint={instagram ? undefined : 'No verificado · acepta @usuario o enlace'}
                    error={instagramError}
                  />
                  <Button
                    title={linking ? 'Vinculando…' : 'Vincular con Instagram'}
                    variant="secondary"
                    flat
                    leftIcon={<Icon name="instagram" size={15} color="#E1306C" />}
                    onPress={handleLink}
                    loading={linking}
                    disabled={linking}
                    fullWidth
                  />
                  <Text variant="caption" tone="muted">
                    La verificación requiere una cuenta profesional de Instagram (Business o Creator).
                  </Text>
                </View>
              )}
            </View>

            <View>
              <Text variant="label" tone="secondary" style={{ marginBottom: 6 }}>Sexo</Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                }}
              >
                {(['male', 'female'] as const).map((v) => {
                  const active = sex === v;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => setSex(v)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: radius.full,
                        alignItems: 'center',
                        backgroundColor: active ? colors.primary.DEFAULT : colors.bg.elevated,
                        borderWidth: 1,
                        borderColor: active ? colors.primary.DEFAULT : colors.border,
                      }}
                    >
                      <Text variant="caption" weight="bold" tone={active ? 'primary' : 'secondary'}>
                        {v === 'male' ? 'Hombre' : 'Mujer'}
                      </Text>
                    </Pressable>
                  );
                })}
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
