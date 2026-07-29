import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

type MetricTone = 'default' | 'success' | 'record';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  tone?: MetricTone;
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
  prominent?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VALUE_COLORS: Record<MetricTone, string> = {
  default: colors.text.primary,
  success: colors.success,
  record: colors.metal.gold.DEFAULT,
};

/**
 * Patrón factual para peso, repeticiones, descanso y progreso.
 * El valor domina; etiqueta y unidad quedan en segundo plano. Sin tarjeta,
 * borde, gradiente ni color de estado salvo éxito o récord explícitos.
 */
export function WorkoutMetric({
  label,
  value,
  unit,
  tone = 'default',
  align = 'left',
  compact = false,
  prominent = false,
  style,
}: Props) {
  const alignItems =
    align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      style={[{ minWidth: 0, alignItems }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <Text
          variant={prominent ? 'timer' : compact ? 'headline' : 'metric'}
          numeric
          numberOfLines={prominent ? 1 : undefined}
          adjustsFontSizeToFit={prominent}
          minimumFontScale={prominent ? 0.65 : undefined}
          maxFontSizeMultiplier={prominent ? 1.3 : 1.5}
          style={[
            { color: VALUE_COLORS[tone] },
            prominent && { fontSize: 54, lineHeight: 60 },
          ]}
        >
          {value}
        </Text>
        {unit ? (
          <Text variant="caption" tone="secondary">
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: compact ? 0 : spacing.xs }}>
        {label}
      </Text>
    </View>
  );
}
