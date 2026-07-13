/**
 * IconButton — botón circular de un solo icono con feedback elástico.
 * Calca el patrón repetido de "círculo bg.elevated + icono" de los headers
 * (campana de inicio, botón de cerrar/atrás de eventos, etc.).
 * Tonos: elevated (por defecto), primary, danger, ghost.
 * `badgeCount` pinta un contador rojo en la esquina superior derecha.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Icon, type IconName } from '@/components/Icon';
import { colors } from '@/theme/tokens';

interface Props {
  icon: IconName;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  tone?: 'elevated' | 'primary' | 'danger' | 'ghost';
  pressScale?: number;
  badgeCount?: number;
  disabled?: boolean;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
}

interface ToneStyle {
  bg: string;
  border?: string;
  fg: string;
}

// TODO(tokens): no existe token de borde danger; literal rgba a la espera de tokens.ts.
const DANGER_BORDER = 'rgba(239,68,68,0.35)';

const TONES: Record<NonNullable<Props['tone']>, ToneStyle> = {
  elevated: { bg: colors.bg.elevated, border: colors.border, fg: colors.text.primary },
  primary: { bg: colors.primary.DEFAULT, border: colors.primary.DEFAULT, fg: colors.text.primary },
  danger: { bg: colors.dangerSoft, border: DANGER_BORDER, fg: colors.danger },
  ghost: { bg: 'transparent', fg: colors.text.muted },
};

export function IconButton({
  icon,
  onPress,
  size = 36,
  iconSize,
  tone = 'elevated',
  pressScale = 0.9,
  badgeCount,
  disabled,
  hitSlop = 8,
  style,
}: Props) {
  const t = TONES[tone];
  const resolvedIconSize = iconSize ?? Math.round(size * 0.45);
  const showBadge = typeof badgeCount === 'number' && badgeCount > 0;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      pressScale={pressScale}
      hitSlop={hitSlop}
      style={style}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.bg,
          borderWidth: t.border ? 1 : 0,
          borderColor: t.border,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Icon name={icon} size={resolvedIconSize} color={t.fg} />
        {showBadge && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: colors.primary.DEFAULT,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
            }}
          >
            <Text weight="bold" style={{ color: colors.text.primary, fontSize: 10, lineHeight: 13 }}>
              {badgeCount > 99 ? '99+' : String(badgeCount)}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
}
