import { useMemo, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, spacing } from '@/theme/tokens';
import { useCreateEvent } from '@/lib/queries/events';
import { useCommunity } from '@/lib/queries/communities';
import { uploadCover } from '@/lib/storage/photos';
import { useAppStore } from '@/store/app';
import type { EventKind } from '@/lib/repos/events';
import { DAY_OPTIONS, TIME_OPTIONS, buildDate } from '@/components/events/eventDateHelpers';

const KIND_OPTIONS = [
  {
    value: 'challenge',
    label: 'Reto',
    icon: 'trophy',
    accessibilityHint: 'Competencia con ranking',
  },
  {
    value: 'meetup',
    label: 'Quedada',
    icon: 'map-pin',
    accessibilityHint: 'Encuentro presencial',
  },
] as const;

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
        <IconButton
          name="close"
          accessibilityLabel="Cerrar creación de evento"
          accessibilityHint="Vuelve a la pantalla anterior sin crear el evento"
          onPress={() => router.back()}
          variant="surface"
          size="sm"
          haptic={false}
        />
        <Text variant="heading" style={{ flex: 1 }}>Crear evento</Text>
        {communityId && communityQuery.data && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: radius.sm,
              backgroundColor: colors.primary.muted,
              borderWidth: 1,
              borderColor: colors.primary.DEFAULT,
              maxWidth: 140,
            }}
          >
            <Icon name="users" size={spacing.md} color={colors.primary.DEFAULT} />
            <Text
              variant="label"
              tone="brand"
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
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing['3xl'],
            gap: spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Portada */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">PORTADA (OPCIONAL)</Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={coverUri ? 'Cambiar portada del evento' : 'Elegir portada del evento'}
              accessibilityHint="Abre la galería de imágenes"
              accessibilityState={{ selected: coverUri !== null }}
              onPress={pickCover}
              pressScale={0.98}
            >
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
                    <Icon name="image" size={spacing['2xl']} color={colors.text.muted} />
                    <Text variant="caption" tone="muted">Toca para elegir portada</Text>
                  </View>
                )}
                {coverUri && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: spacing.sm,
                      right: spacing.sm,
                      backgroundColor: colors.bg.overlay,
                      borderRadius: radius.full,
                      padding: radius.sm,
                    }}
                  >
                    <Icon name="edit" size={spacing.lg} color={colors.text.primary} />
                  </View>
                )}
              </Card>
            </PressableScale>
          </View>

          {/* Tipo */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">TIPO DE EVENTO</Text>
            <SegmentedControl<EventKind>
              options={KIND_OPTIONS}
              value={kind}
              onValueChange={setKind}
              accessibilityLabel="Tipo de evento"
            />
            <Text variant="caption" tone="muted">
              {isChallenge ? 'Competencia con ranking' : 'Encuentro presencial'}
            </Text>
          </View>

          <Input
            label="TÍTULO"
            value={title}
            onChangeText={setTitle}
            placeholder={isChallenge ? 'Ej. Reto 30 días de sentadillas' : 'Ej. Entreno grupal en el parque'}
            maxLength={120}
            accessibilityLabel="Título del evento"
            accessibilityHint="Escribe al menos tres caracteres"
          />

          <Input
            label="DESCRIPCIÓN (OPCIONAL)"
            value={description}
            onChangeText={setDescription}
            placeholder="Cuenta de qué va el evento…"
            multiline
            numberOfLines={3}
            maxLength={1000}
            style={{ minHeight: spacing['4xl'] + spacing.sm, textAlignVertical: 'top' }}
            accessibilityLabel="Descripción del evento"
          />

          {isChallenge ? (
            <Input
              label="¿QUÉ SE MIDE? (OPCIONAL)"
              value={metric}
              onChangeText={setMetric}
              placeholder="Ej. Total de repeticiones"
              maxLength={80}
              accessibilityLabel="Métrica del reto"
            />
          ) : (
            <Input
              label="LUGAR (OPCIONAL)"
              value={location}
              onChangeText={setLocation}
              placeholder="Ej. Parque Central, entrada norte"
              maxLength={120}
              accessibilityLabel="Lugar de la quedada"
            />
          )}

          {/* Fecha */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">DÍA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {DAY_OPTIONS.map((d) => (
                <Chip
                  key={d.offset}
                  label={d.label}
                  selected={dayOffset === d.offset}
                  onPress={() => setDayOffset(d.offset)}
                  accessibilityLabel={`Programar para ${d.label}`}
                  accessibilityHint="Selecciona el día del evento"
                />
              ))}
            </View>
          </View>

          {/* Hora */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">HORA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {TIME_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={time === t}
                  onPress={() => setTime(t)}
                  accessibilityLabel={`Programar a las ${t}`}
                  accessibilityHint="Selecciona la hora del evento"
                />
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
            accessible
            accessibilityLabel={`Fecha seleccionada: ${startsAt.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}, ${time}`}
          >
            <Icon name="calendar" size={spacing.lg} color={colors.primary.DEFAULT} />
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
