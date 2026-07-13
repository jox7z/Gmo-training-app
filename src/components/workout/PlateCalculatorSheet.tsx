/**
 * PlateCalculatorSheet — calculadora de discos por lado (patrón Hevy).
 *
 * Dado un peso objetivo y la barra elegida, muestra qué discos cargar por lado.
 * Si el objetivo no es alcanzable con discos estándar ofrece ajustarlo al peso
 * más cercano por debajo. Todo se maneja en la unidad de display (kg o lb).
 */
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { colors, spacing, radius } from '@/theme/tokens';
import { calcPlates, BARS_KG, BARS_LB, PLATES_KG, PLATES_LB } from '@/lib/plates';

// Colores IWF reales de los discos — dominio del mundo real, excepción
// deliberada a tokens.ts. 45lb (azul) y 35lb (amarillo) son aproximaciones.
const PLATE_COLORS: Record<number, string> = {
  25: '#D64545', 20: '#2E5FA3', 15: '#D9A521', 10: '#3E8E5A',
  5: '#E8E8E8', 2.5: '#333333', 1.25: '#8A8A8A', 45: '#2E5FA3', 35: '#D9A521',
};

const PLATE_MAX_H = 64;
const PLATE_MIN_H = 24;
const PLATE_W = 16;

// Texto oscuro sobre discos claros (p. ej. el disco de 5 kg blanco).
function plateTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 150 ? colors.bg.base : colors.text.primary;
}

// Redondea a 2 decimales y quita ceros sobrantes para etiquetas limpias.
function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

interface Props {
  visible: boolean;
  onClose: () => void;
  targetDisplay: number;
  unit: 'kg' | 'lb';
  onApply: (v: number) => void;
}

export function PlateCalculatorSheet({ visible, onClose, targetDisplay, unit, onApply }: Props) {
  const insets = useSafeAreaInsets();
  const bars = unit === 'kg' ? BARS_KG : BARS_LB;
  const defaultBar = unit === 'kg' ? BARS_KG[0] : BARS_LB[0];
  const [bar, setBar] = useState(defaultBar);

  // Resetea la barra al default de la unidad cuando cambia la unidad.
  useEffect(() => {
    setBar(defaultBar);
  }, [defaultBar]);

  const breakdown = useMemo(
    () => calcPlates(targetDisplay, bar, unit),
    [targetDisplay, bar, unit],
  );

  const plateSet = unit === 'kg' ? PLATES_KG : PLATES_LB;
  const maxPlate = plateSet[0];
  const minPlate = plateSet[plateSet.length - 1];
  const heightFor = (plate: number) => {
    if (maxPlate === minPlate) return PLATE_MAX_H;
    const t = (plate - minPlate) / (maxPlate - minPlate);
    return PLATE_MIN_H + t * (PLATE_MAX_H - PLATE_MIN_H);
  };

  // Aplana perSide a discos individuales para dibujar uno por disco.
  const flatPlates = breakdown.perSide.flatMap((p) =>
    Array.from({ length: p.count }, () => p.plate),
  );
  const summary = flatPlates.length ? flatPlates.map(fmt).join(' + ') : 'Solo la barra';
  const belowBar = targetDisplay < bar;

  return (
    <AppBottomSheet visible={visible} onClose={onClose} enableDynamicSizing title="Discos">
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.lg,
        }}
      >
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }} numeric>
          Objetivo: {fmt(targetDisplay)} {unit}
        </Text>

        {/* Chips de barra */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          {bars.map((b) => (
            <Chip
              key={b}
              label={`Barra ${b} ${unit}`}
              selected={b === bar}
              onPress={() => setBar(b)}
              size="sm"
            />
          ))}
        </View>

        {/* Discos por lado */}
        {flatPlates.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 4,
              minHeight: PLATE_MAX_H,
            }}
          >
            {flatPlates.map((plate, i) => {
              const mapped = PLATE_COLORS[plate] != null;
              const bg = mapped ? PLATE_COLORS[plate] : colors.bg.elevated;
              const txt = mapped ? plateTextColor(bg) : colors.text.secondary;
              return (
                <View
                  key={`${plate}-${i}`}
                  style={{
                    width: PLATE_W,
                    height: heightFor(plate),
                    borderRadius: radius.sm,
                    backgroundColor: bg,
                    borderWidth: mapped ? 0 : 1,
                    borderColor: colors.border,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    paddingBottom: 2,
                  }}
                >
                  <Text style={{ fontSize: 8, color: txt, fontWeight: '700' }} numberOfLines={1}>
                    {fmt(plate)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Resumen textual por lado */}
        <Text variant="body" weight="semibold" style={{ textAlign: 'center' }} numeric>
          Por lado: {summary}
        </Text>

        {/* Avisos + ajuste */}
        {belowBar ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            El objetivo es menor que la barra.
          </Text>
        ) : breakdown.remainder > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
              No alcanzable con discos estándar.
            </Text>
            <Button
              title={`Ajustar a ${fmt(breakdown.achievable)} ${unit}`}
              variant="secondary"
              fullWidth
              onPress={() => {
                onApply(breakdown.achievable);
                onClose();
              }}
            />
          </View>
        ) : null}
      </View>
    </AppBottomSheet>
  );
}
