import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  /** Número total de series del ejercicio. */
  total: number;
  /** Índice 0-based de la serie actual. */
  current: number;
  /** Series ya completadas. */
  completedCount: number;
}

/**
 * Fila de pills de progreso de series estilo Mimo/Duolingo:
 * completadas en rojo sólido, la actual con pulso suave, pendientes apagadas.
 * Con más de 6 series degrada a dots para no estirar pills minúsculas.
 */
export function SetProgressPills({ total, current, completedCount }: Props) {
  // Pulso de opacidad de la pill actual — loop infinito suave.
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const compact = total > 6;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        justifyContent: compact ? 'center' : undefined,
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = i < completedCount;
        const isCurrent = i === current && !isCompleted;
        const base = compact
          ? { width: 10, height: 10, borderRadius: radius.full }
          : { flex: 1, height: 11, borderRadius: radius.sm };

        if (isCurrent) {
          return (
            <Animated.View
              key={i}
              style={[
                base,
                {
                  backgroundColor: colors.primary.muted,
                  borderWidth: 1.5,
                  borderColor: colors.primary.DEFAULT,
                  opacity: pulse,
                },
              ]}
            />
          );
        }

        return (
          <View
            key={i}
            style={[
              base,
              { backgroundColor: isCompleted ? colors.primary.DEFAULT : colors.bg.elevated },
            ]}
          />
        );
      })}
    </View>
  );
}
