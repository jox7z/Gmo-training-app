import { View } from 'react-native';
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
 * Progreso estable de series:
 * completadas en crema, actual con contorno cálido y pendientes apagadas.
 * Con más de 6 series degrada a dots para no estirar pills minúsculas.
 */
export function SetProgressPills({ total, current, completedCount }: Props) {
  const compact = total > 6;

  return (
    <View
      accessible
      accessibilityLabel={`${completedCount} de ${total} series completadas. Serie actual ${Math.min(current + 1, total)}.`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: compact ? spacing.xs : spacing.sm,
        justifyContent: compact ? 'center' : undefined,
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = i < completedCount;
        const isCurrent = i === current && !isCompleted;
        const base = compact
          ? { flex: 1, minWidth: 4, maxWidth: 10, height: 8, borderRadius: radius.full }
          : { flex: 1, height: 11, borderRadius: radius.sm };

        if (isCurrent) {
          return (
            <View
              key={i}
              style={[
                base,
                {
                  backgroundColor: colors.bg.elevated,
                  borderWidth: 2,
                  borderColor: colors.accent.DEFAULT,
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
              { backgroundColor: isCompleted ? colors.text.primary : colors.bg.elevated },
            ]}
          />
        );
      })}
    </View>
  );
}
