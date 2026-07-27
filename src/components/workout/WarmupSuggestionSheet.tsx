/**
 * WarmupSuggestionSheet — sugiere series de calentamiento antes de las de
 * trabajo (patrón rampa 40/60/80%). Mismo lenguaje visual que
 * PlateCalculatorSheet: hoja con dynamic sizing, resumen textual y CTA.
 *
 * Trabaja en kg (unidad canónica de `suggestWarmupSets`): el objetivo viene del
 * historial en kg y el redondeo depende del incremento de disco, así que evitar
 * conversiones lb↔kg previene drift de redondeo. El usuario edita el peso de
 * trabajo con `BigStepperInput` y las sugerencias se recalculan en vivo.
 */
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BigStepperInput } from '@/components/workout/BigStepperInput';
import { Icon } from '@/components/Icon';
import { colors, spacing, radius } from '@/theme/tokens';
import type { Equipment } from '@/data/exercises';
import { suggestWarmupSets, type WarmupSuggestion } from '@/lib/warmupSets';

// Peso de trabajo por defecto cuando no hay historial (barra vacía + par de 2.5).
const DEFAULT_TARGET_KG = 25;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Peso de trabajo de referencia (kg). `null` si no hay historial previo. */
  targetWeightKg: number | null;
  equipment: Equipment;
  /** Recibe las sugerencias ya calculadas (evita recomputar fuera del sheet). */
  onConfirm: (suggestions: WarmupSuggestion[]) => void;
}

// Quita ceros sobrantes para etiquetas limpias (2.5 kg, 20 kg).
function fmt(n: number): string {
  return String(Math.round(n * 10) / 10);
}

export function WarmupSuggestionSheet({
  visible,
  onClose,
  targetWeightKg,
  equipment,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState(targetWeightKg ?? DEFAULT_TARGET_KG);

  // Resetea el peso al reabrir o cambiar de ejercicio (nuevo objetivo).
  useEffect(() => {
    setWeight(targetWeightKg ?? DEFAULT_TARGET_KG);
  }, [targetWeightKg, visible]);

  const suggestions = useMemo(
    () => suggestWarmupSets(weight, equipment),
    [weight, equipment],
  );

  return (
    <AppBottomSheet visible={visible} onClose={onClose} enableDynamicSizing title="Calentamiento">
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.lg,
        }}
      >
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          {targetWeightKg == null
            ? 'Ingresa tu peso de trabajo y te sugerimos las series de calentamiento.'
            : 'Ajusta el peso de trabajo si quieres; te sugerimos cómo subir.'}
        </Text>

        <BigStepperInput
          label="KG DE TRABAJO"
          value={weight}
          step={2.5}
          decimals={1}
          onChange={setWeight}
        />

        {/* Lista de sugerencias "peso × reps" */}
        {suggestions.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {suggestions.map((s, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  backgroundColor: colors.bg.elevated,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.primary.muted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="fire" size={16} color={colors.primary.DEFAULT} filled />
                </View>
                <Text variant="body" weight="semibold" style={{ flex: 1 }} numeric>
                  {fmt(s.weightKg)} kg × {s.reps}
                </Text>
                <Text variant="caption" tone="muted" numeric>
                  Serie {i + 1}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            Sin series de calentamiento para este peso.
          </Text>
        )}

        <View style={{ gap: spacing.sm }}>
          <Button
            title={`Agregar ${suggestions.length} ${suggestions.length === 1 ? 'serie' : 'series'}`}
            variant="primary"
            size="lg"
            fullWidth
            disabled={suggestions.length === 0}
            onPress={() => {
              onConfirm(suggestions);
              onClose();
            }}
          />
          <Button title="Omitir" variant="secondary" fullWidth onPress={onClose} />
        </View>
      </View>
    </AppBottomSheet>
  );
}
