/**
 * PressableScale — wrapper compartido para objetivos táctiles.
 * Conserva haptics y feedback de estado instantáneo, sin animación.
 */
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props extends Omit<PressableProps, 'style'> {
  /** Compatibilidad con call sites existentes; ya no aplica transformaciones. */
  pressScale?: number;
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function PressableScale({
  pressScale: _pressScale = 0.96,
  haptic = true,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  style,
  children,
  hitSlop,
  ...rest
}: Props) {
  void _pressScale;

  const handlePressIn = (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    if (haptic !== false) {
      const hapticStyle = haptic === true ? Haptics.ImpactFeedbackStyle.Light : haptic;
      Haptics.impactAsync(hapticStyle).catch(() => {});
    }
    onPressIn?.(e);
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : onPressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      {...rest}
      style={({ pressed }) => [style, pressed && !disabled ? { opacity: 0.82 } : null]}
    >
      {children}
    </Pressable>
  );
}
