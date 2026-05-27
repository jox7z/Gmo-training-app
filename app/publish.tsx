import { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Stat } from '@/components/ui/Stat';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import { useAppStore } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import {
  usePublishManualPost,
  usePublishWorkout,
  usePublishPR,
} from '@/lib/queries/feed';
import { uploadPostPhoto } from '@/lib/storage/photos';
import { EXERCISES } from '@/data/exercises';
import { useToast } from '@/components/ui/Toast';

type Mode = 'manual' | 'workout' | 'pr';
const MAX_CAPTION = 500;

export default function PublishModal() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ mode?: string; workoutId?: string }>();
  const mode: Mode =
    params.mode === 'workout' ? 'workout' : params.mode === 'pr' ? 'pr' : 'manual';

  const profile = useAppStore((s) => s.profile);
  const history = useWorkoutsStore((s) => s.history);
  const workout = useMemo(
    () => (mode === 'workout' && params.workoutId
      ? history.find((w) => w.id === params.workoutId) ?? null
      : null),
    [history, mode, params.workoutId],
  );

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const title =
    mode === 'workout' ? 'Compartir entreno'
    : mode === 'pr' ? 'Publicar PR'
    : 'Nueva publicación';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <StatusBar style="light" />
      <Header title={title} onClose={close} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {mode === 'manual' && <ManualComposer profileDisplayName={profile?.displayName ?? 'Atleta'} avatarUrl={profile?.avatarUrl} onSuccess={(msg) => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); toast.show({ message: msg, tone: 'success' }); close(); }} onError={(msg) => toast.show({ message: msg, tone: 'danger' })} userId={profile?.id ?? null} />}
        {mode === 'workout' && <WorkoutComposer workout={workout} onSuccess={(msg) => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); toast.show({ message: msg, tone: 'success' }); close(); }} onError={(msg) => toast.show({ message: msg, tone: 'danger' })} onClose={close} />}
        {mode === 'pr' && <PrComposer onSuccess={(msg) => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); toast.show({ message: msg, tone: 'success' }); close(); }} onError={(msg) => toast.show({ message: msg, tone: 'danger' })} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        gap: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Pressable onPress={onClose} hitSlop={8}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Icon name="close" size={16} color={colors.text.primary} />
        </View>
      </Pressable>
      <Text variant="heading" style={{ flex: 1 }}>{title}</Text>
    </View>
  );
}

// =====================================================
// MANUAL
// =====================================================
function ManualComposer({
  profileDisplayName,
  avatarUrl,
  userId,
  onSuccess,
  onError,
}: {
  profileDisplayName: string;
  avatarUrl?: string;
  userId: string | null;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [caption, setCaption] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const publish = usePublishManualPost();

  const remaining = MAX_CAPTION - caption.length;
  const overLimit = remaining < 0;
  const canPublish = !!caption.trim() && !overLimit && !uploading && !publish.isPending;

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      onError('Necesitamos permiso para acceder a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setPhotoUri(res.assets[0].uri);
  };

  const submit = async () => {
    if (!canPublish) return;
    let photoUrl: string | undefined;
    try {
      if (photoUri && userId) {
        setUploading(true);
        photoUrl = await uploadPostPhoto(userId, photoUri);
        setUploading(false);
      }
    } catch (e) {
      setUploading(false);
      onError((e as Error)?.message ?? 'No pudimos subir la foto.');
      return;
    }
    publish.mutate(
      { caption: caption.trim(), photoUrl },
      {
        onSuccess: () => onSuccess('Publicado'),
        onError: (err) => onError(err?.message ?? 'No se pudo publicar'),
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}>
      {/* Author preview */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
        <Avatar uri={avatarUrl} name={profileDisplayName} size={44} />
        <View>
          <Text weight="bold">{profileDisplayName}</Text>
          <Text variant="caption" tone="muted">Compartiendo en tu feed</Text>
        </View>
      </View>

      {/* Caption */}
      <View
        style={{
          borderWidth: 1,
          borderColor: overLimit ? colors.danger : colors.border,
          backgroundColor: colors.bg.elevated,
          borderRadius: radius.lg,
          padding: spacing.md,
          minHeight: 160,
        }}
      >
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="¿Qué lograste hoy?"
          placeholderTextColor={colors.text.muted}
          multiline
          textAlignVertical="top"
          style={{ color: colors.text.primary, fontSize: 16, minHeight: 130 }}
          maxLength={MAX_CAPTION + 100}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
        <Text variant="caption" tone={overLimit ? 'danger' : remaining <= 30 ? 'accent' : 'muted'} numeric>
          {remaining}
        </Text>
      </View>

      {/* Photo */}
      {photoUri ? (
        <View
          style={{
            marginTop: spacing.lg,
            borderRadius: radius.lg,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Image
            source={{ uri: photoUri }}
            style={{ width: '100%', aspectRatio: 4 / 5 }}
            resizeMode="cover"
          />
          <Pressable
            onPress={() => setPhotoUri(null)}
            style={{
              position: 'absolute',
              top: spacing.sm,
              right: spacing.sm,
              backgroundColor: 'rgba(0,0,0,0.7)',
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
              borderRadius: radius.full,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="close" size={14} color="#fff" />
            <Text variant="caption" weight="bold" style={{ color: '#fff' }}>Quitar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={pickPhoto}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              marginTop: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              backgroundColor: colors.bg.elevated,
              borderStyle: 'dashed',
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Icon name="image" size={18} color={colors.text.primary} />
          <Text weight="semibold">Adjuntar foto</Text>
        </Pressable>
      )}

      <Button
        title={uploading ? 'Subiendo foto…' : 'Publicar'}
        onPress={submit}
        loading={publish.isPending || uploading}
        disabled={!canPublish}
        fullWidth
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

// =====================================================
// WORKOUT
// =====================================================
function WorkoutComposer({
  workout,
  onSuccess,
  onError,
  onClose,
}: {
  workout: ReturnType<typeof useWorkoutsStore.getState>['history'][number] | null;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState('');
  const publish = usePublishWorkout();

  const stats = useMemo(() => {
    if (!workout) return { sets: 0, volume: 0, durationMin: 0 };
    const sets = workout.exercises.reduce(
      (a, e) => a + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
      0,
    );
    return {
      sets,
      volume: Math.round(workout.totalVolumeKg),
      durationMin: Math.round((workout.durationSeconds ?? 0) / 60),
    };
  }, [workout]);

  if (!workout) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
        <Card padding="xl" style={{ alignItems: 'center' }}>
          <Icon name="close" size={32} color={colors.text.muted} />
          <Text variant="heading" style={{ marginTop: spacing.md }}>
            Workout no encontrado
          </Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
            El entreno que intentas publicar ya no está disponible.
          </Text>
          <Button title="Cerrar" variant="secondary" onPress={onClose} style={{ marginTop: spacing.lg }} fullWidth />
        </Card>
      </View>
    );
  }

  const remaining = MAX_CAPTION - caption.length;
  const overLimit = remaining < 0;

  const submit = () => {
    publish.mutate(
      { workoutId: workout.id, caption: caption.trim() || undefined },
      {
        onSuccess: () => onSuccess('Entreno compartido'),
        onError: (err) => onError(err?.message ?? 'No se pudo publicar'),
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}>
      <Card padding="lg">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primary.muted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="dumbbell" size={20} color={colors.primary.DEFAULT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text weight="bold" numberOfLines={1}>
              {workout.routineName ?? 'Entrenamiento libre'}
            </Text>
            <Text variant="caption" tone="muted">
              {new Date(workout.startedAt).toLocaleString([], {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md,
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Stat label="Tiempo" value={stats.durationMin} unit="min" tone="brand" />
          </View>
          <View style={{ flex: 1 }}>
            <Stat label="Sets" value={stats.sets} unit="" tone="info" />
          </View>
          <View style={{ flex: 1 }}>
            <Stat label="Volumen" value={stats.volume} unit="kg" tone="accent" />
          </View>
        </View>

        <View style={{ marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {workout.exercises.slice(0, 4).map((e) => (
            <View
              key={e.id}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: colors.bg.elevated,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="caption" tone="secondary">{e.exerciseName}</Text>
            </View>
          ))}
          {workout.exercises.length > 4 && (
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: colors.bg.elevated,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="caption" tone="muted">
                +{workout.exercises.length - 4} más
              </Text>
            </View>
          )}
        </View>
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text variant="label" tone="secondary">Caption (opcional)</Text>
          <Text variant="caption" tone={overLimit ? 'danger' : remaining <= 30 ? 'accent' : 'muted'} numeric>
            {remaining}
          </Text>
        </View>
        <View
          style={{
            borderWidth: 1,
            borderColor: overLimit ? colors.danger : colors.border,
            backgroundColor: colors.bg.elevated,
            borderRadius: radius.lg,
            padding: spacing.md,
            minHeight: 100,
          }}
        >
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="¿Cómo se sintió?"
            placeholderTextColor={colors.text.muted}
            multiline
            textAlignVertical="top"
            style={{ color: colors.text.primary, fontSize: 15, minHeight: 80 }}
            maxLength={MAX_CAPTION + 50}
          />
        </View>
      </View>

      <Button
        title="Publicar entreno"
        onPress={submit}
        loading={publish.isPending}
        disabled={overLimit}
        fullWidth
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

// =====================================================
// PR
// =====================================================
function PrComposer({
  onSuccess,
  onError,
}: {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [caption, setCaption] = useState('');
  const publish = usePublishPR();

  const weightNum = parseFloat(weight);
  const repsNum = parseInt(reps, 10);
  const valid =
    !!exerciseId &&
    !Number.isNaN(weightNum) &&
    weightNum > 0 &&
    !Number.isNaN(repsNum) &&
    repsNum > 0;

  const submit = () => {
    if (!valid || !exerciseId) return;
    publish.mutate(
      {
        exerciseId,
        weightKg: weightNum,
        reps: repsNum,
        caption: caption.trim() || undefined,
      },
      {
        onSuccess: () => onSuccess('PR publicado'),
        onError: (err) => onError(err?.message ?? 'No se pudo publicar'),
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}>
      <Card variant="glow" padding="lg" style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name="trophy" size={20} color={colors.accent.DEFAULT} />
          <Text variant="heading" tone="accent">Tu nuevo PR</Text>
        </View>
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
          Comparte tu mejor levantamiento con la comunidad.
        </Text>
      </Card>

      <Text variant="label" tone="secondary" style={{ marginBottom: spacing.sm }}>
        Ejercicio
      </Text>
      <View style={{ gap: spacing.xs }}>
        {EXERCISES.filter((e) => e.isCompound).map((e) => {
          const selected = exerciseId === e.id;
          return (
            <Pressable
              key={e.id}
              onPress={() => setExerciseId(e.id)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary.DEFAULT : colors.border,
                  backgroundColor: selected ? colors.primary.muted : colors.bg.elevated,
                  gap: spacing.md,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: selected ? colors.primary.DEFAULT : colors.border,
                  backgroundColor: selected ? colors.primary.DEFAULT : 'transparent',
                }}
              />
              <Text weight={selected ? 'bold' : 'regular'} style={{ flex: 1 }}>
                {e.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
        <Input
          label="Peso"
          placeholder="100"
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
          containerStyle={{ flex: 1 }}
          rightAdornment={<Text tone="muted">kg</Text>}
        />
        <Input
          label="Reps"
          placeholder="5"
          keyboardType="numeric"
          value={reps}
          onChangeText={setReps}
          containerStyle={{ flex: 1 }}
        />
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Text variant="label" tone="secondary" style={{ marginBottom: 6 }}>
          Comentario (opcional)
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg.elevated,
            borderRadius: radius.lg,
            padding: spacing.md,
            minHeight: 80,
          }}
        >
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Después de meses de bloqueo…"
            placeholderTextColor={colors.text.muted}
            multiline
            textAlignVertical="top"
            style={{ color: colors.text.primary, fontSize: 15, minHeight: 60 }}
            maxLength={MAX_CAPTION}
          />
        </View>
      </View>

      <Button
        title="Publicar PR"
        onPress={submit}
        loading={publish.isPending}
        disabled={!valid}
        fullWidth
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}
