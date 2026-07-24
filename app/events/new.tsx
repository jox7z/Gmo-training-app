import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, spacing } from '@/theme/tokens';
import { useCreateEvent } from '@/lib/queries/events';
import { useCommunity } from '@/lib/queries/communities';
import { uploadCover } from '@/lib/storage/photos';
import { useAppStore } from '@/store/app';
import type { EventKind } from '@/lib/repos/events';
import { DAY_OPTIONS, TIME_OPTIONS, buildDate } from '@/components/events/eventDateHelpers';
import { Chip } from '@/components/ui/Chip';

export default function NewEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const createEvent = useCreateEvent();
  const userId = useAppStore((s) => s.profile?.id);
  const { communityId } = useLocalSearchParams<{ communityId?: string }>();
  const communityQuery = useCommunity(communityId);

  const [kind, setKind] = useState<EventKind>('challenge');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState('');
  const [location, setLocation] = useState('');
  const [dayOffset, setDayOffset] = useState(1);
  const [time, setTime] = useState('18:00');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const isChallenge = kind === 'challenge';
  const startsAt = useMemo(() => buildDate(dayOffset, time), [dayOffset, time]);

  const canSubmit = title.trim().length >= 3 && !createEvent.isPending && !uploadingCover;

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.show({ message: 'Ponle un título de al menos 3 caracteres', tone: 'danger' });
      return;
    }

    let coverUrl: string | undefined;
    if (coverUri && userId) {
      setUploadingCover(true);
      try {
        coverUrl = await uploadCover(userId, coverUri);
      } catch {
        toast.show({ message: 'No se pudo subir la portada', tone: 'danger' });
        setUploadingCover(false);
        return;
      }
      setUploadingCover(false);
    }

    createEvent.mutate(
      {
        kind,
        title: title.trim(),
        startsAt: startsAt.toISOString(),
        description: description.trim() || undefined,
        coverUrl,
        metric: isChallenge ? metric.trim() || undefined : undefined,
        location: !isChallenge ? location.trim() || undefined : undefined,
        communityId: communityId ?? undefined,
      },
      {
        onSuccess: (id) => {
          toast.show({ message: '¡Evento creado!', tone: 'success' });
          router.replace({ pathname: '/events/[id]', params: { id } });
        },
        onError: (err) =>
          toast.show({ message: err?.message ?? 'No se pudo crear', tone: 'danger' }),
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <IconButton icon="close" onPress={() => router.back()} iconSize={18} />
        <Text variant="heading" style={{ flex: 1 }}>Crear evento</Text>
        {communityId && communityQuery.data && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: colors.primary.muted,
              borderWidth: 1,
              borderColor: colors.primary.DEFAULT,
              maxWidth: 140,
            }}
          >
            <Icon name="users" size={11} color={colors.primary.DEFAULT} />
            <Text
              variant="label"
              style={{ fontSize: 11, color: colors.primary.DEFAULT }}
              numberOfLines={1}
            >
              {communityQuery.data.name}
            </Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Portada */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">PORTADA (OPCIONAL)</Text>
            <Pressable onPress={pickCover}>
              <Card variant="raised" padding={0} style={{ overflow: 'hidden', borderRadius: radius.lg }}>
                {coverUri ? (
                  <Image
                    source={{ uri: coverUri }}
                    style={{ width: '100%', aspectRatio: 16 / 9 }}
                    resizeMode="cover"
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
                {coverUri && (
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
                    <Icon name="edit" size={14} color={colors.text.primary} />
                  </View>
                )}
              </Card>
            </Pressable>
          </View>

          {/* Tipo */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">TIPO DE EVENTO</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <KindOption
                active={isChallenge}
                icon="trophy"
                title="Reto"
                subtitle="Competencia con ranking"
                onPress={() => setKind('challenge')}
              />
              <KindOption
                active={!isChallenge}
                icon="map-pin"
                title="Quedada"
                subtitle="Encuentro presencial"
                onPress={() => setKind('meetup')}
              />
            </View>
          </View>

          <Input
            label="TÍTULO"
            value={title}
            onChangeText={setTitle}
            placeholder={isChallenge ? 'Ej. Reto 30 días de sentadillas' : 'Ej. Entreno grupal en el parque'}
            maxLength={120}
          />

          <Input
            label="DESCRIPCIÓN (OPCIONAL)"
            value={description}
            onChangeText={setDescription}
            placeholder="Cuenta de qué va el evento…"
            multiline
            numberOfLines={3}
            maxLength={1000}
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />

          {isChallenge ? (
            <Input
              label="¿QUÉ SE MIDE? (OPCIONAL)"
              value={metric}
              onChangeText={setMetric}
              placeholder="Ej. Total de repeticiones"
              maxLength={80}
            />
          ) : (
            <Input
              label="LUGAR (OPCIONAL)"
              value={location}
              onChangeText={setLocation}
              placeholder="Ej. Parque Central, entrada norte"
              maxLength={120}
            />
          )}

          {/* Fecha */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">DÍA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {DAY_OPTIONS.map((d) => (
                <Chip key={d.offset} label={d.label} variant="outline" selected={dayOffset === d.offset} onPress={() => setDayOffset(d.offset)} />
              ))}
            </View>
          </View>

          {/* Hora */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">HORA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {TIME_OPTIONS.map((t) => (
                <Chip key={t} label={t} variant="outline" selected={time === t} onPress={() => setTime(t)} />
              ))}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="calendar" size={16} color={colors.primary.DEFAULT} />
            <Text variant="caption" tone="secondary">
              {startsAt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {time}
            </Text>
          </View>

          <Button
            title={uploadingCover ? 'Subiendo portada…' : 'Crear evento'}
            onPress={handleSubmit}
            loading={createEvent.isPending || uploadingCover}
            disabled={!canSubmit}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function KindOption({
  active,
  icon,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  icon: 'trophy' | 'map-pin';
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          gap: 6,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: active ? colors.primary.DEFAULT : colors.border,
          backgroundColor: active ? colors.primary.muted : colors.bg.elevated,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Icon name={icon} size={20} color={active ? colors.primary.DEFAULT : colors.text.secondary} />
      <Text weight="bold" style={{ color: active ? colors.primary.DEFAULT : colors.text.primary }}>
        {title}
      </Text>
      <Text variant="caption" tone="muted">{subtitle}</Text>
    </Pressable>
  );
}

