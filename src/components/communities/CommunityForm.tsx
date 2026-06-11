import { useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, spacing } from '@/theme/tokens';
import { uploadCover } from '@/lib/storage/photos';
import { useAppStore } from '@/store/app';

export interface CommunityFormValues {
  name: string;
  description?: string;
  coverUrl?: string;
  isPrivate: boolean;
}

interface Props {
  initialValues?: Partial<CommunityFormValues>;
  onSubmit: (values: CommunityFormValues) => Promise<void>;
  submitLabel: string;
}

export function CommunityForm({ initialValues, onSubmit, submitLabel }: Props) {
  const toast     = useToast();
  const userId    = useAppStore((s) => s.profile?.id);

  const [name,           setName]           = useState(initialValues?.name        ?? '');
  const [description,    setDescription]    = useState(initialValues?.description ?? '');
  const [isPrivate,      setIsPrivate]      = useState(initialValues?.isPrivate   ?? false);
  const [coverUri,       setCoverUri]       = useState<string | null>(null);
  const [existingCover,  setExistingCover]  = useState(initialValues?.coverUrl);
  const [uploading,      setUploading]      = useState(false);
  const [submitting,     setSubmitting]     = useState(false);

  const descLen  = description.length;
  const canSubmit = name.trim().length >= 3 && !submitting && !uploading;

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
      setExistingCover(undefined);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.show({ message: 'El nombre debe tener al menos 3 caracteres', tone: 'danger' });
      return;
    }
    if (descLen > 500) {
      toast.show({ message: 'La descripción supera los 500 caracteres', tone: 'danger' });
      return;
    }

    let coverUrl: string | undefined = existingCover;

    if (coverUri && userId) {
      setUploading(true);
      try {
        coverUrl = await uploadCover(userId, coverUri);
      } catch {
        toast.show({ message: 'No se pudo subir la portada', tone: 'danger' });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name:        name.trim(),
        description: description.trim() || undefined,
        coverUrl,
        isPrivate,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const previewUri = coverUri ?? existingCover;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Portada */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="secondary">PORTADA (OPCIONAL)</Text>
          <Pressable onPress={pickCover}>
            <Card variant="raised" padding={0} style={{ overflow: 'hidden', borderRadius: radius.lg }}>
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: '100%', aspectRatio: 16 / 9 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 16 / 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                    backgroundColor: colors.bg.elevated,
                  }}
                >
                  <Icon name="image" size={32} color={colors.text.muted} />
                  <Text variant="caption" tone="muted">Toca para elegir portada</Text>
                </View>
              )}
              {previewUri && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: radius.full,
                    padding: 6,
                  }}
                >
                  <Icon name="edit" size={14} color="#fff" />
                </View>
              )}
            </Card>
          </Pressable>
        </View>

        {/* Nombre */}
        <Input
          label="NOMBRE"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Runners de Madrid"
          maxLength={50}
        />

        {/* Descripción con contador */}
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="label" tone="secondary">DESCRIPCIÓN (OPCIONAL)</Text>
            <Text variant="label" tone={descLen > 480 ? 'danger' : 'muted'} style={{ fontSize: 11 }}>
              {descLen}/500
            </Text>
          </View>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Cuéntale a la gente de qué va tu comunidad…"
            multiline
            numberOfLines={4}
            maxLength={500}
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />
        </View>

        {/* Toggle privacidad */}
        <Card variant="raised" padding="md">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isPrivate ? colors.primary.muted : colors.bg.elevated,
              }}
            >
              <Icon
                name={isPrivate ? 'lock' : 'globe'}
                size={18}
                color={isPrivate ? colors.primary.DEFAULT : colors.text.secondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="bold">{isPrivate ? 'Comunidad privada' : 'Comunidad pública'}</Text>
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {isPrivate
                  ? 'Solo miembros aprobados pueden ver el contenido'
                  : 'Cualquiera puede unirse y ver el contenido'}
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.border, true: colors.primary.DEFAULT }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <Button
          title={uploading ? 'Subiendo portada…' : submitLabel}
          onPress={handleSubmit}
          loading={submitting || uploading}
          disabled={!canSubmit}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
