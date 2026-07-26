/**
 * Medalla de un track de logros. Muestra el icono dentro de un anillo con
 * degradado del color del track; si está bloqueada se atenúa y aparece un
 * candado. Una "cinta" inferior indica el nivel actual (estilo Duolingo).
 */
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius } from '@/theme/tokens';

interface Props {
  icon: IconName;
  color: string;
  /** Nivel desbloqueado (0 = bloqueado). */
  level: number;
  maxLevel: number;
  size?: number;
  /** Oculta la cinta de nivel inferior. */
  hideLevel?: boolean;
}

function shade(hex: string, amount: number): string {
  // Mezcla rápida con negro para el extremo oscuro del degradado.
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = Math.round(parseInt(h.slice(0, 2), 16) * amount);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * amount);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * amount);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function AchievementMedal({ icon, color, level, maxLevel, size = 72, hideLevel }: Props) {
  const unlocked = level > 0;
  const inner = size * 0.74;

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          ...(unlocked
            ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.55,
                shadowRadius: 12,
                elevation: 8,
              }
            : null),
        }}
      >
        {/* Anillo exterior con degradado */}
        <LinearGradient
          colors={unlocked ? [shade(color, 1), shade(color, 0.55)] : [colors.border, colors.bg.cardEdge]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
        {/* Disco interior oscuro */}
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: colors.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: unlocked ? 'rgba(255,255,255,0.08)' : colors.border,
          }}
        >
          <Icon
            name={unlocked ? icon : 'lock'}
            size={inner * 0.46}
            color={unlocked ? color : colors.text.muted}
          />
        </View>
      </View>

      {!hideLevel && (
        <View
          style={{
            marginTop: -size * 0.13,
            paddingHorizontal: 9,
            paddingVertical: 2,
            borderRadius: radius.sm,
            backgroundColor: unlocked ? color : colors.bg.elevated,
            borderWidth: 1.5,
            borderColor: colors.bg.base,
            minWidth: 30,
            alignItems: 'center',
          }}
        >
          <Text
            weight="black"
            numeric
            style={{ fontSize: 10, color: unlocked ? colors.bg.base : colors.text.muted }}
          >
            {level}/{maxLevel}
          </Text>
        </View>
      )}
    </View>
  );
}
