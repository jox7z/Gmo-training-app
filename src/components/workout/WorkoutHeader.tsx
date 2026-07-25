import { View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';

interface Props {
  context: string;
  /** Tiempo total formateado; null oculta el chip. */
  elapsedLabel: string | null;
  /**
   * Un segmento por ejercicio de la sesión; vacío oculta la barra. `groupId`
   * agrupa segmentos contiguos de un mismo superset para dibujar el bracket.
   */
  segments: { done: number; total: number; groupId?: string }[];
  onClose: () => void;
}

/**
 * Escanea corridas CONTIGUAS de `groupId` compartido y devuelve un bracket por
 * corrida de 2+ segmentos, con posición/ancho en % del ancho total de la barra.
 * El guard `j - i >= 2` evita dibujar un bracket para una corrida de 1 (no debería
 * ocurrir dado `dissolveNonContiguousGroups`, pero es defensa barata).
 */
function computeGroupBrackets(segments: { groupId?: string }[]) {
  const brackets: { groupId: string; startPct: number; widthPct: number }[] = [];
  let i = 0;
  while (i < segments.length) {
    const groupId = segments[i].groupId;
    if (!groupId) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < segments.length && segments[j].groupId === groupId) j += 1;
    if (j - i >= 2) {
      brackets.push({
        groupId,
        startPct: (i / segments.length) * 100,
        widthPct: ((j - i) / segments.length) * 100,
      });
    }
    i = j;
  }
  return brackets;
}

/**
 * Header del workout activo: cerrar + contexto + chip de tiempo total, y
 * debajo una barra de progreso global segmentada (un segmento por ejercicio).
 * El accent sweep animado vive en la pantalla (depende de un Animated.Value local).
 */
export function WorkoutHeader({ context, elapsedLabel, segments, onClose }: Props) {
  const brackets = computeGroupBrackets(segments);
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
              borderRadius: radius.full,
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
        <View style={{ marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {segments.map((seg, i) => {
              const pct = seg.total > 0 ? Math.min(seg.done / seg.total, 1) : 0;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: radius.full,
                    backgroundColor: colors.bg.elevated,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${pct * 100}%`,
                      height: '100%',
                      borderRadius: radius.full,
                      backgroundColor: colors.primary.DEFAULT,
                    }}
                  />
                </View>
              );
            })}
          </View>
          {/* Bracket bajo la barra: una franja fina por cada corrida contigua de un
              mismo superset (une visualmente sus segmentos). Solo si hay grupos. */}
          {brackets.length > 0 && (
            <View style={{ position: 'relative', height: 3, marginTop: 3 }}>
              {brackets.map((b) => (
                <View
                  key={b.groupId}
                  style={{
                    position: 'absolute',
                    left: `${b.startPct}%`,
                    width: `${b.widthPct}%`,
                    height: 3,
                    borderRadius: radius.full,
                    backgroundColor: colors.primary.DEFAULT,
                  }}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
