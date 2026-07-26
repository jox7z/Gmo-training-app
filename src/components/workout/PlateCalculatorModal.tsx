import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import {
  calculatePlateLoad,
  METRIC_PLATES_KG,
  type MetricPlateKg,
} from '@/lib/plateCalculator';
import { fromDisplay, toDisplay } from '@/lib/units';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';

type Unit = 'kg' | 'lb';
type BarOption = '20' | '15';

const BAR_OPTIONS = [
  { value: '20', label: '20 kg', accessibilityLabel: 'Barra estándar de 20 kilogramos' },
  { value: '15', label: '15 kg', accessibilityLabel: 'Barra femenina de 15 kilogramos' },
] as const;

const PLATE_COLORS: Record<MetricPlateKg, string> = {
  25: colors.primary.DEFAULT,
  20: colors.info.DEFAULT,
  15: colors.warning,
  10: colors.success,
  5: colors.text.secondary,
  2.5: colors.accent.DEFAULT,
  1.25: colors.metal.silver.DEFAULT,
};

function trimNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

function displayLabel(weightKg: number, unit: Unit): string {
  return `${trimNumber(toDisplay(weightKg, unit), unit === 'kg' ? 2 : 1)} ${unit}`;
}

interface PlateCalculatorModalProps {
  visible: boolean;
  unit: Unit;
  currentWeightKg: number;
  onClose: () => void;
  onApplyWeightKg: (weightKg: number) => void;
}

export function PlateCalculatorModal({
  visible,
  unit,
  currentWeightKg,
  onClose,
  onApplyWeightKg,
}: PlateCalculatorModalProps) {
  const insets = useSafeAreaInsets();
  const [bar, setBar] = useState<BarOption>('20');
  const [targetText, setTargetText] = useState('');
  const [availablePlates, setAvailablePlates] = useState<MetricPlateKg[]>([
    ...METRIC_PLATES_KG,
  ]);

  const barKg = Number(bar);
  const targetDisplay = Number(targetText.replace(',', '.'));
  const targetKg = Number.isFinite(targetDisplay)
    ? fromDisplay(Math.max(0, targetDisplay), unit)
    : 0;
  const result = useMemo(
    () => calculatePlateLoad(targetKg, barKg, availablePlates),
    [availablePlates, barKg, targetKg],
  );

  useEffect(() => {
    if (!visible) return;
    const initialBar: BarOption =
      currentWeightKg > 0 && currentWeightKg < 20 ? '15' : '20';
    const initialKg = Math.max(currentWeightKg, Number(initialBar));
    setBar(initialBar);
    setTargetText(
      trimNumber(toDisplay(initialKg, unit), unit === 'kg' ? 2 : 1),
    );
    setAvailablePlates([...METRIC_PLATES_KG]);
  }, [currentWeightKg, unit, visible]);

  const changeTarget = (deltaDisplay: number) => {
    const current = Number.isFinite(targetDisplay) ? targetDisplay : 0;
    const next = Math.max(0, current + deltaDisplay);
    setTargetText(trimNumber(next, unit === 'kg' ? 2 : 1));
  };

  const togglePlate = (plate: MetricPlateKg) => {
    setAvailablePlates((current) => {
      if (current.includes(plate)) {
        return current.length === 1
          ? current
          : current.filter((candidate) => candidate !== plate);
      }
      return [...current, plate].sort((a, b) => b - a);
    });
  };

  const handleApply = () => {
    if (result.isBelowBar) return;
    onApplyWeightKg(result.loadedKg);
    onClose();
  };

  const displayStep = unit === 'kg' ? 2.5 : 5;
  const hasValidTarget = Number.isFinite(targetDisplay) && targetDisplay >= 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={{ flex: 1, justifyContent: 'flex-end' }}
        accessibilityViewIsModal
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar calculadora de discos"
          onPress={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: colors.bg.overlay,
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Card
            variant="raised"
            padding="lg"
            style={{
              maxHeight: '92%',
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
            <View
              style={{
                width: spacing['3xl'],
                height: spacing['3xl'],
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary.muted,
                borderWidth: 1,
                borderColor: colors.primary.glow,
              }}
            >
              <Icon name="barbell" size={spacing.xl} color={colors.primary.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headline">Calculadora de discos</Text>
              <Text variant="caption" tone="secondary">
                Distribución por cada lado de la barra
              </Text>
            </View>
            <IconButton
              name="close"
              accessibilityLabel="Cerrar calculadora"
              onPress={onClose}
              variant="surface"
              size="sm"
              haptic={false}
            />
          </View>

          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.lg }}
          >
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="muted">Barra</Text>
              <SegmentedControl
                options={BAR_OPTIONS}
                value={bar}
                onValueChange={setBar}
                accessibilityLabel="Peso de la barra"
              />
            </View>

            <Card variant="outlined" padding="lg">
              <Text
                variant="label"
                tone="muted"
                style={{ textAlign: 'center', marginBottom: spacing.md }}
              >
                Peso objetivo · {unit}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Reducir ${displayStep} ${unit}`}
                  onPress={() => changeTarget(-displayStep)}
                  style={{
                    width: spacing['3xl'],
                    height: spacing['3xl'],
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.bg.elevated,
                    borderWidth: 1,
                    borderColor: colors.borderStrong,
                  }}
                >
                  <Text variant="headline" weight="bold">−</Text>
                </PressableScale>
                <TextInput
                  value={targetText}
                  onChangeText={setTargetText}
                  onSubmitEditing={Keyboard.dismiss}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  blurOnSubmit
                  selectTextOnFocus
                  accessibilityLabel={`Peso objetivo en ${unit}`}
                  inputAccessoryViewID={Platform.OS === 'ios' ? 'log-keyboard-accessory' : undefined}
                  style={{
                    flex: 1,
                    color: colors.text.primary,
                    fontSize: fontSize['3xl'],
                    fontWeight: '900',
                    textAlign: 'center',
                    fontVariant: ['tabular-nums'],
                    paddingVertical: spacing.sm,
                  }}
                />
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Aumentar ${displayStep} ${unit}`}
                  onPress={() => changeTarget(displayStep)}
                  style={{
                    width: spacing['3xl'],
                    height: spacing['3xl'],
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.bg.elevated,
                    borderWidth: 1,
                    borderColor: colors.borderStrong,
                  }}
                >
                  <Text variant="headline" weight="bold">+</Text>
                </PressableScale>
              </View>
            </Card>

            <View style={{ gap: spacing.sm }}>
              <View>
                <Text variant="label" tone="muted">Discos disponibles</Text>
                <Text variant="caption" tone="secondary">
                  Toca un peso para incluirlo o quitarlo del cálculo.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {METRIC_PLATES_KG.map((plate) => (
                  <Chip
                    key={plate}
                    label={`${plate} kg`}
                    selected={availablePlates.includes(plate)}
                    onPress={() => togglePlate(plate)}
                    accessibilityLabel={`Disco de ${plate} kilogramos`}
                    accessibilityHint={
                      availablePlates.includes(plate)
                        ? 'Toca para excluirlo'
                        : 'Toca para incluirlo'
                    }
                  />
                ))}
              </View>
            </View>

            <Card
              variant={result.isExact ? 'glow' : 'raised'}
              glowColor={result.isExact ? colors.success : undefined}
              padding="lg"
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: spacing.lg,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="label" tone="muted">Carga real</Text>
                  <Text variant="metric" numeric>
                    {displayLabel(result.loadedKg, unit)}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.sm,
                    backgroundColor: result.isExact
                      ? colors.info.soft
                      : colors.accent.soft,
                  }}
                >
                  <Text
                    variant="caption"
                    tone={result.isExact ? 'info' : 'accent'}
                    weight="bold"
                  >
                    {result.isExact ? 'Exacto' : 'Redondeado abajo'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  height: spacing.xs,
                  borderRadius: radius.sm,
                  backgroundColor: colors.borderStrong,
                  marginVertical: spacing.lg,
                }}
              />

              <Text variant="label" tone="muted" style={{ marginBottom: spacing.sm }}>
                Por lado
              </Text>
              {result.platesPerSide.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {result.platesPerSide.map(({ weightKg, count }) => (
                    <View
                      key={weightKg}
                      accessibilityLabel={`${count} discos de ${weightKg} kilogramos por lado`}
                      style={{
                        minWidth: spacing['3xl'] + spacing.sm,
                        alignItems: 'center',
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: radius.md,
                        borderWidth: 2,
                        borderColor: PLATE_COLORS[weightKg],
                        backgroundColor: colors.bg.elevated,
                      }}
                    >
                      <Text variant="heading" numeric>{weightKg}</Text>
                      <Text variant="caption" tone="secondary" numeric>
                        × {count}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text tone="secondary">
                  Solo la barra, sin discos.
                </Text>
              )}

              {result.isBelowBar ? (
                <Text
                  variant="caption"
                  tone="danger"
                  style={{ marginTop: spacing.md }}
                >
                  El objetivo es menor que la barra seleccionada. Elige la barra de
                  15 kg o registra el peso directamente.
                </Text>
              ) : !result.isExact ? (
                <Text
                  variant="caption"
                  tone="secondary"
                  style={{ marginTop: spacing.md }}
                >
                  No se puede cargar exactamente: se usarán{' '}
                  {displayLabel(result.differenceKg, unit)} menos para no superar tu objetivo.
                </Text>
              ) : null}
            </Card>
          </ScrollView>

          <Button
            title={
              hasValidTarget && !result.isBelowBar
                ? `Usar ${displayLabel(result.loadedKg, unit)}`
                : 'Revisa el peso objetivo'
            }
            onPress={handleApply}
            disabled={!hasValidTarget || result.isBelowBar}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.lg }}
          />
          </Card>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
