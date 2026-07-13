/**
 * Chip — píldora seleccionable/pulsable con icono opcional a la izquierda.
 * Calca los chips de grupo muscular (ExercisePickerSheet), los tabs de día
 * (routine/[id]) y el botón discontinuo de "+ Día".
 * Variantes:
 * - `solid`: píldora con fondo (activo → primary).
 * - `outline`: borde sin fondo (activo → borde y texto primary).
 * - `dashed`: borde discontinuo, tono marca, sin estado seleccionado (añadir).
 */
import { type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Icon, type IconName } from '@/components/Icon';
import { colors, radius } from '@/theme/tokens';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  leftIcon?: IconName;
  /** solid = píldora con fondo; outline = borde sin fondo activo; dashed = añadir (borde discontinuo, sin selected) */
  variant?: 'solid' | 'outline' | 'dashed';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected = false,
  onPress,
  onLongPress,
  leftIcon,
  variant = 'solid',
  size = 'md',
  style,
}: Props) {
  const padding = size === 'md' ? { paddingVertical: 10, paddingHorizontal: 16 } : { paddingVertical: 8, paddingHorizontal: 14 };

  let backgroundColor: string;
  let borderColor: string;
  let textColor: string;

  if (variant === 'solid') {
    backgroundColor = selected ? colors.primary.DEFAULT : colors.bg.elevated;
    borderColor = selected ? colors.primary.DEFAULT : colors.border;
    textColor = selected ? colors.text.primary : colors.text.secondary;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    borderColor = selected ? colors.primary.DEFAULT : colors.border;
    textColor = selected ? colors.primary.DEFAULT : colors.text.secondary;
  } else {
    // dashed — botón de añadir, tono marca, sin selected
    backgroundColor = 'transparent';
    borderColor = colors.border;
    textColor = colors.primary.DEFAULT;
  }

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      pressScale={0.95}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderRadius: radius.full,
          borderWidth: 1,
          borderStyle: variant === 'dashed' ? 'dashed' : 'solid',
          backgroundColor,
          borderColor,
          ...padding,
        },
        style,
      ]}
    >
      {leftIcon && <Icon name={leftIcon} size={14} color={textColor} />}
      <Text variant="caption" weight="bold" style={{ color: textColor }}>
        {label}
      </Text>
    </PressableScale>
  );
}
