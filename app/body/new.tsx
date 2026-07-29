import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import { useAppStore } from '@/store/app';
import { useAddMeasurement } from '@/lib/queries/body';
import { useToast } from '@/components/ui/Toast';
import { fromDisplay, KG_TO_LB } from '@/lib/units';

const NOTES_MAX = 280;

// Rangos válidos en kg. Los porcentajes se evalúan tal cual (no se convierten).
const WEIGHT_MIN_KG = 20;
const WEIGHT_MAX_KG = 400;

export default function NewBodyMeasurement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const profile = useAppStore((s) => s.profile);
  const unit = profile?.unit ?? 'kg';

  const [weight, setWeight] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [fat, setFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [water, setWater] = useState('');
  const [notes, setNotes] = useState('');

  const add = useAddMeasurement();

  const weightNum = parseFloat(weight.replace(',', '.'));
  const fatNum = fat ? parseFloat(fat.replace(',', '.')) : NaN;
  const muscleNum = muscle ? parseFloat(muscle.replace(',', '.')) : NaN;
  const waterNum = water ? parseFloat(water.replace(',', '.')) : NaN;

  // Conversión a kg para validación + storage.
  const weightKg = useMemo(() => {
    if (Number.isNaN(weightNum)) return NaN;
    return unit === 'lb' ? weightNum / KG_TO_LB : weightNum;
  }, [weightNum, unit]);

  const weightLabel = unit === 'lb'
    ? `${Math.round(WEIGHT_MIN_KG * KG_TO_LB)} - ${Math.round(WEIGHT_MAX_KG * KG_TO_LB)} lb`
    : `${WEIGHT_MIN_KG} - ${WEIGHT_MAX_KG} kg`;

  const weightError =
    weight.length > 0 && (Number.isNaN(weightKg) || weightKg < WEIGHT_MIN_KG || weightKg > WEIGHT_MAX_KG)
      ? `Rango válido: ${weightLabel}`
      : undefined;

  const fatError =
    fat.length > 0 && (Number.isNaN(fatNum) || fatNum < 1 || fatNum > 70)
      ? 'Entre 1 y 70%'
      : undefined;
  const muscleError =
    muscle.length > 0 && (Number.isNaN(muscleNum) || muscleNum < 1 || muscleNum > 80)
      ? 'Entre 1 y 80%'
      : undefined;
  const waterError =
    water.length > 0 && (Number.isNaN(waterNum) || waterNum < 20 || waterNum > 90)
      ? 'Entre 20 y 90%'
      : undefined;

  const canSave =
    !Number.isNaN(weightKg) &&
    !weightError &&
    !fatError &&
    !muscleError &&
    !waterError &&
    notes.length <= NOTES_MAX &&
    !add.isPending;

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleSave = () => {
    if (!canSave) return;
    add.mutate(
      {
        recordedAt: new Date().toISOString(),
        weightKg: fromDisplay(weightNum, unit),
        bodyFatPct: advanced && !Number.isNaN(fatNum) ? fatNum : undefined,
        musclePct: advanced && !Number.isNaN(muscleNum) ? muscleNum : undefined,
        waterPct: advanced && !Number.isNaN(waterNum) ? waterNum : undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          toast.show({
            message: result.updated ? 'Peso actualizado' : 'Medición guardada',
            tone: 'success',
          });
          close();
        },
        onError: (err) =>
          toast.show({
            message: err?.message ?? 'No se pudo guardar la medición',
            tone: 'danger',
          }),
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="Nueva medición"
          subtitle="Registra tu peso corporal y notas del día"
          backIcon="close"
          onBack={close}
          border
        />

        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Card padding="lg" style={{ alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.sm,
                backgroundColor: colors.primary.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="scale" size={26} color={colors.primary.DEFAULT} />
            </View>
            <Text variant="heading">Registra tu peso</Text>
            <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
              Anota tu medición. El peso es obligatorio; el resto es opcional.
            </Text>
          </Card>

          <Card padding="lg" style={{ gap: spacing.lg }}>
            <Input
              label={`Peso (${unit})`}
              value={weight}
              onChangeText={setWeight}
              placeholder={unit === 'lb' ? '165' : '75'}
              keyboardType="decimal-pad"
              hint={!weightError ? `Rango válido: ${weightLabel}` : undefined}
              error={weightError}
              rightAdornment={<Text tone="muted">{unit}</Text>}
            />
          </Card>

          <Pressable
            onPress={() => setAdvanced((v) => !v)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: advanced ? colors.primary.DEFAULT : colors.border,
                backgroundColor: advanced ? colors.primary.muted : colors.bg.elevated,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: radius.sm,
                borderWidth: 2,
                borderColor: advanced ? colors.primary.DEFAULT : colors.border,
                backgroundColor: advanced ? colors.primary.DEFAULT : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {advanced && <Icon name="check" size={14} color="#fff" />}
            </View>
            <Text weight="semibold" style={{ flex: 1 }}>Mostrar avanzado</Text>
            <Text variant="caption" tone="muted">% grasa, músculo, agua</Text>
          </Pressable>

          {advanced && (
            <Card padding="lg" style={{ gap: spacing.lg }}>
              <Input
                label="% Grasa corporal"
                value={fat}
                onChangeText={setFat}
                placeholder="15"
                keyboardType="decimal-pad"
                error={fatError}
                rightAdornment={<Text tone="muted">%</Text>}
              />
              <Input
                label="% Músculo"
                value={muscle}
                onChangeText={setMuscle}
                placeholder="40"
                keyboardType="decimal-pad"
                error={muscleError}
                rightAdornment={<Text tone="muted">%</Text>}
              />
              <Input
                label="% Agua"
                value={water}
                onChangeText={setWater}
                placeholder="55"
                keyboardType="decimal-pad"
                error={waterError}
                rightAdornment={<Text tone="muted">%</Text>}
              />
            </Card>
          )}

          <View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <Text variant="label" tone="secondary">Notas (opcional)</Text>
              <Text
                variant="caption"
                tone={notes.length > NOTES_MAX ? 'danger' : 'muted'}
                numeric
              >
                {NOTES_MAX - notes.length}
              </Text>
            </View>
            <View
              style={{
                borderWidth: 1,
                borderColor: notes.length > NOTES_MAX ? colors.danger : colors.border,
                backgroundColor: colors.bg.elevated,
                borderRadius: radius.lg,
                padding: spacing.md,
                minHeight: 80,
              }}
            >
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="¿Cómo te sentiste hoy?"
                placeholderTextColor={colors.text.muted}
                multiline
                textAlignVertical="top"
                style={{ color: colors.text.primary, fontSize: 15, minHeight: 60 }}
                maxLength={NOTES_MAX + 50}
              />
            </View>
          </View>

          <Button
            title="Guardar medición"
            onPress={handleSave}
            loading={add.isPending}
            disabled={!canSave}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
