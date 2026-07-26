import { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { Icon } from '@/components/Icon';
import { SocialErrorState } from '@/components/social/SocialErrorState';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, spacing } from '@/theme/tokens';
import { useEvent, useUpdateEvent } from '@/lib/queries/events';
import { uploadCover } from '@/lib/storage/photos';
import { useAppStore } from '@/store/app';
import {
  DAY_OPTIONS,
  TIME_OPTIONS,
  buildDate,
  parseDateToChips,
} from '@/components/events/eventDateHelpers';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const userId = useAppStore((s) => s.profile?.id);

  const eventQuery = useEvent(id);
  const updateEvent = useUpdateEvent();
  const event = eventQuery.data;

  const isChallenge = event?.kind === 'challenge';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState('');
  const [location, setLocation] = useState('');
  const [dayOffset, setDayOffset] = useState(1);
  const [time, setTime] = useState('18:00');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);

  // Inicializa state con datos del evento cuando carga
  useEffect(() => {
    if (event && !initialized) {
      setTitle(event.title);
      setDescription(event.description ?? '');
      setMetric(event.metric ?? '');
      setLocation(event.location ?? '');
      setCoverUrl(event.coverUrl ?? null);
      // Inicializar chips de fecha desde la fecha real del evento
      const { dayOffset: d, time: t } = parseDateToChips(event.startsAt);
      setDayOffset(d);
      setTime(t);
      setDateTouched(false);
      setInitialized(true);
    }
  }, [event, initialized]);

  const startsAt = useMemo(() => buildDate(dayOffset, time), [dayOffset, time]);
  const displayedStartsAt =
    !dateTouched && event ? new Date(event.startsAt) : startsAt;
  const canSubmit = title.trim().length >= 1 && !updateEvent.isPending && !uploadingCover;

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
    if (!event || !canSubmit || !userId) return;

    let finalCoverUrl = coverUrl;

    if (coverUri) {
      setUploadingCover(true);
      try {
        finalCoverUrl = await uploadCover(userId, coverUri);
      } catch {
        toast.show({ message: 'No se pudo subir la portada', tone: 'danger' });
        setUploadingCover(false);
        return;
      }
      setUploadingCover(false);
    }

    updateEvent.mutate(
      {
        eventId: event.id,
        title: title.trim(),
        description: description.trim() || undefined,
        coverUrl: finalCoverUrl ?? undefined,
        metric: isChallenge ? metric.trim() || undefined : undefined,
        location: !isChallenge ? location.trim() || undefined : undefined,
        startsAt: dateTouched ? startsAt.toISOString() : undefined,
      },
      {
        onSuccess: () => {
          toast.show({ message: 'Evento actualizado', tone: 'success' });
          router.back();
        },
        onError: (err) =>
          toast.show({ message: err?.message ?? 'No se pudo actualizar', tone: 'danger' }),
      },
    );
  };

  if (eventQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={colors.primary.DEFAULT} />
      </SafeAreaView>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
        <StatusBar style="light" />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <IconButton
            name="chevron-left"
            accessibilityLabel="Volver"
            accessibilityHint="Vuelve a la pantalla anterior"
            onPress={() => router.back()}
            variant="surface"
            size="sm"
            haptic={false}
          />
          <Text variant="heading">Editar evento</Text>
        </View>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SocialErrorState
            title={eventQuery.isError ? 'No pudimos cargar el evento' : 'Evento no encontrado'}
            subtitle={
              eventQuery.isError
                ? 'Revisa tu conexión e inténtalo de nuevo.'
                : 'Puede que el evento se haya eliminado o que el enlace ya no sea válido.'
            }
            onRetry={() => {
              void eventQuery.refetch();
            }}
            isRetrying={eventQuery.isFetching}
          />
        </View>
      </SafeAreaView>
    );
  }

  const previewCover = coverUri ?? coverUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
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
          accessibilityLabel="Cerrar edición del evento"
          accessibilityHint="Vuelve a la pantalla anterior sin guardar cambios"
          onPress={() => router.back()}
          variant="surface"
          size="sm"
          haptic={false}
        />
        <Text variant="heading" style={{ flex: 1 }}>Editar evento</Text>
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
          {/* Cover picker */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">PORTADA (OPCIONAL)</Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={previewCover ? 'Cambiar portada del evento' : 'Elegir portada del evento'}
              accessibilityHint="Abre la galería de imágenes"
              accessibilityState={{ selected: previewCover !== null }}
              onPress={pickCover}
              pressScale={0.98}
            >
              <Card variant="raised" padding={0} style={{ overflow: 'hidden', borderRadius: radius.lg }}>
                {previewCover ? (
                  <Image
                    source={{ uri: previewCover }}
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
                {previewCover && (
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

          <Input
            label="TÍTULO"
            value={title}
            onChangeText={setTitle}
            placeholder="Título del evento"
            maxLength={120}
            accessibilityLabel="Título del evento"
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

          {/* Fecha de inicio */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">NUEVA FECHA DE INICIO (OPCIONAL)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {DAY_OPTIONS.map((d) => (
                <Chip
                  key={d.offset}
                  label={d.label}
                  selected={dayOffset === d.offset}
                  onPress={() => {
                    setDayOffset(d.offset);
                    setDateTouched(true);
                  }}
                  accessibilityLabel={`Cambiar fecha a ${d.label}`}
                  accessibilityHint="Selecciona el día de inicio"
                />
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">HORA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {TIME_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={time === t}
                  onPress={() => {
                    setTime(t);
                    setDateTouched(true);
                  }}
                  accessibilityLabel={`Cambiar hora a las ${t}`}
                  accessibilityHint="Selecciona la hora de inicio"
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
            accessibilityLabel={`Fecha seleccionada: ${displayedStartsAt.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}, ${displayedStartsAt.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })}`}
          >
            <Icon name="calendar" size={spacing.lg} color={colors.primary.DEFAULT} />
            <Text variant="caption" tone="secondary">
              {displayedStartsAt.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}{' '}
              ·{' '}
              {displayedStartsAt.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <Button
            title={uploadingCover ? 'Subiendo portada…' : 'Guardar cambios'}
            onPress={handleSubmit}
            loading={updateEvent.isPending || uploadingCover}
            disabled={!canSubmit}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
