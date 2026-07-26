import { View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';

interface Props {
  context: string;
  /** Tiempo total formateado; null oculta el chip. */
  elapsedLabel: string | null;
  /** Un segmento por ejercicio de la sesión; vacío oculta la barra. */
  segments: { done: number; total: number }[];
  onClose: () => void;
}

/**
 * Header del workout activo: cerrar + contexto + chip de tiempo total, y
 * debajo una barra de progreso global segmentada (un segmento por ejercicio).
 * El accent sweep animado vive en la pantalla (depende de un Animated.Value local).
 */
export function WorkoutHeader({ context, elapsedLabel, segments, onClose }: Props) {
  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Botón cerrar sesión — escala 0.88, hitSlop generoso */}
        <PressableScale onPress={onClose} hitSlop={14} pressScale={0.88}>
          <Icon name="close" size={18} color={colors.text.muted} />
        </PressableScale>
        <Text
          variant="caption"
          tone="muted"
          numberOfLines={1}
          style={{ flex: 1, textAlign: 'center', marginHorizontal: spacing.md }}
        >
          {context}
        </Text>
        {elapsedLabel !== null ? (
          <View
            style={{
              backgroundColor: colors.bg.elevated,
              borderRadius: radius.sm,
              paddingHorizontal: 10,
              paddingVertical: 4,
              minWidth: 48,
              alignItems: 'center',
            }}
          >
            <Text variant="caption" tone="secondary" numeric>
              {elapsedLabel}
            </Text>
          </View>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {segments.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 4, marginTop: spacing.sm }}>
          {segments.map((seg, i) => {
            const pct = seg.total > 0 ? Math.min(seg.done / seg.total, 1) : 0;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: radius.sm,
                  backgroundColor: colors.bg.elevated,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${pct * 100}%`,
                    height: '100%',
                    borderRadius: radius.sm,
                    backgroundColor: colors.primary.DEFAULT,
                  }}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
