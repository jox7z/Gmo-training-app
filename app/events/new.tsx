import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, spacing } from '@/theme/tokens';
import { useCreateEvent } from '@/lib/queries/events';
import type { EventKind } from '@/lib/repos/events';

const DAY_OPTIONS = [
  { label: 'Hoy', offset: 0 },
  { label: 'Mañana', offset: 1 },
  { label: '+2 días', offset: 2 },
  { label: '+3 días', offset: 3 },
  { label: '+1 sem', offset: 7 },
  { label: '+2 sem', offset: 14 },
];

const TIME_OPTIONS = ['06:00', '07:00', '08:00', '09:00', '12:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

function buildDate(dayOffset: number, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

export default function NewEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const createEvent = useCreateEvent();

  const [kind, setKind] = useState<EventKind>('challenge');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState('');
  const [location, setLocation] = useState('');
  const [dayOffset, setDayOffset] = useState(1);
  const [time, setTime] = useState('18:00');

  const isChallenge = kind === 'challenge';
  const startsAt = useMemo(() => buildDate(dayOffset, time), [dayOffset, time]);

  const canSubmit = title.trim().length >= 3 && !createEvent.isPending;

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.show({ message: 'Ponle un título de al menos 3 caracteres', tone: 'danger' });
      return;
    }
    createEvent.mutate(
      {
        kind,
        title: title.trim(),
        startsAt: startsAt.toISOString(),
        description: description.trim() || undefined,
        metric: isChallenge ? metric.trim() || undefined : undefined,
        location: !isChallenge ? location.trim() || undefined : undefined,
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
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="close" size={18} color={colors.text.primary} />
          </View>
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>Crear evento</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
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
                <Chip key={d.offset} label={d.label} active={dayOffset === d.offset} onPress={() => setDayOffset(d.offset)} />
              ))}
            </View>
          </View>

          {/* Hora */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">HORA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {TIME_OPTIONS.map((t) => (
                <Chip key={t} label={t} active={time === t} onPress={() => setTime(t)} />
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
            title="Crear evento"
            onPress={handleSubmit}
            loading={createEvent.isPending}
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

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.primary.DEFAULT : colors.border,
        backgroundColor: active ? colors.primary.muted : colors.bg.elevated,
      }}
    >
      <Text variant="caption" weight="bold" style={{ color: active ? colors.primary.DEFAULT : colors.text.secondary }}>
        {label}
      </Text>
    </Pressable>
  );
}
