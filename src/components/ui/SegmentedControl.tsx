/**
 * SegmentedControl — selector segmentado de una sola opción activa.
 * Dos variantes visuales:
 * - `inset`: contenedor `bg.elevated` con las opciones encajadas dentro
 *   (mismo look que el header de PERIODS en progress y WeightDetailModal).
 * - `pill`: fila de píldoras sueltas sin contenedor de fondo
 *   (mismo look que el toggle frente/espalda de WeeklyMuscleHeatmapCard).
 * `fill=false` deja que las opciones se ajusten a su contenido (hug) en vez de
 * repartir el ancho a partes iguales.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** inset = contenedor bg.elevated con opciones dentro; pill = fila de píldoras sueltas */
  variant?: 'inset' | 'pill';
  /** false → las opciones no estiran (hug) */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'inset',
  fill = true,
  style,
}: Props<T>) {
  const isInset = variant === 'inset';

  return (
    <View
      style={[
        isInset
          ? {
              flexDirection: 'row',
              backgroundColor: colors.bg.elevated,
              borderRadius: radius.lg,
              padding: 4,
              borderWidth: 1,
              borderColor: colors.border,
            }
          : {
              flexDirection: 'row',
              gap: spacing.sm,
            },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <PressableScale
            key={opt.value}
            onPress={() => onChange(opt.value)}
            pressScale={0.95}
            haptic={false}
            style={
              isInset
                ? {
                    flex: fill ? 1 : undefined,
                    paddingVertical: 8,
                    paddingHorizontal: fill ? 0 : 14,
                    alignItems: 'center',
                    borderRadius: radius.md,
                    backgroundColor: active ? colors.primary.DEFAULT : 'transparent',
                  }
                : {
                    flex: fill ? 1 : undefined,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    alignItems: 'center',
                    borderRadius: radius.full,
                    borderWidth: 1,
                    backgroundColor: active ? colors.primary.DEFAULT : colors.bg.elevated,
                    borderColor: active ? colors.primary.DEFAULT : colors.border,
                  }
            }
          >
            <Text weight="bold" tone={active ? 'primary' : 'secondary'} style={{ fontSize: 13 }}>
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
