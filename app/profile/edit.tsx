import { useState } from 'react';
import { View, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Loader } from '@/components/ui/Loader';
import { colors, spacing, radius } from '@/theme/tokens';
import { useAppStore } from '@/store/app';

const BIO_MAX = 160;

export default function EditProfile() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);

  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl);
  const [saving, setSaving] = useState(false);

  if (!profile) return <Loader />;

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso', 'Necesitamos acceso a tu galería para cambiar la foto.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo abrir la galería');
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Username requerido', 'Elige un nombre de usuario.');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre para mostrar.');
      return;
    }
    setSaving(true);
    try {
      await setProfile({
        ...profile,
        username: username.trim(),
        displayName: displayName.trim(),
        fullName: fullName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        country: country.trim(),
        avatarUrl,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.xl,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={18} color={colors.text.primary} />
          </View>
        </Pressable>
        <Text variant="heading" weight="bold">Editar perfil</Text>
        <Pressable onPress={handleSave} hitSlop={10} disabled={saving}>
          <Text variant="body" weight="bold" tone="brand">
            {saving ? '...' : 'Guardar'}
          </Text>
        </Pressable>
      </View>

      {/* Avatar */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Pressable onPress={pickImage}>
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
          <Text variant="caption" tone="brand" weight="bold">Cambiar foto</Text>
        </Pressable>
      </View>

      {/* Fields */}
      <Card padding="lg" style={{ gap: spacing.lg }}>
        <Input
          label="Username"
          value={username}
          onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
          placeholder="gmo_athlete"
          autoCapitalize="none"
          maxLength={20}
          hint="Solo letras, números y guiones bajos"
        />
        <Input
          label="Nombre"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tu nombre público"
          maxLength={30}
        />
        <Input
          label="Nombre completo"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Opcional"
          maxLength={60}
        />
      </Card>

      <Card padding="lg" style={{ gap: spacing.lg, marginTop: spacing.md }}>
        <View>
          <Input
            label="Biografía"
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
            placeholder="Habla de ti, tu deporte y tus metas"
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
          <Text variant="caption" tone="muted" style={{ alignSelf: 'flex-end', marginTop: 4 }}>
            {bio.length}/{BIO_MAX}
          </Text>
        </View>
      </Card>

      <Card padding="lg" style={{ gap: spacing.lg, marginTop: spacing.md }}>
        <Input
          label="Ubicación"
          value={location}
          onChangeText={setLocation}
          placeholder="Ciudad"
          maxLength={40}
        />
        <Input
          label="País"
          value={country}
          onChangeText={setCountry}
          placeholder="País"
          maxLength={40}
        />
      </Card>

      <Button
        title={saving ? 'Guardando...' : 'Guardar cambios'}
        onPress={handleSave}
        loading={saving}
        fullWidth
        style={{ marginTop: spacing.xl }}
      />
    </Screen>
  );
}
