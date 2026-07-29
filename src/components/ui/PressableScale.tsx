/**
 * PressableScale — wrapper de Pressable con efecto elástico al pulsar.
 * Usa react-native-reanimated para spring suave en scale + opacidad.
 * Soporta vibración háptica configurable.
 */
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useReduceMotion } from './useReduceMotion';

interface Props extends Omit<PressableProps, 'style'> {
  /** Escala objetivo al presionar (0 a 1). Por defecto 0.96. */
  pressScale?: number;
  /**
   * Háptico al presionar.
   * - true (por defecto) → ImpactFeedbackStyle.Light
   * - false → sin háptico
   * - Haptics.ImpactFeedbackStyle.xxx → estilo personalizado
   */
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Componente de pulsación con micro-animación elástica.
 * Reemplaza Pressable allí donde se quiere feedback táctil visual.
 *
 * Uso:
 *   <PressableScale onPress={handlePress} pressScale={0.97}>
 *     <MiCard />
 *   </PressableScale>
 */
export function PressableScale({
  pressScale = 0.96,
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
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    // Spring rápido de compresión
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 0.82;
    } else {
      scale.value = withSpring(pressScale, { damping: 18, stiffness: 320 });
      opacity.value = withSpring(0.9, { damping: 18, stiffness: 320 });
    }

    // Háptico configurable
    if (haptic !== false) {
      const style =
        haptic === true ? Haptics.ImpactFeedbackStyle.Light : haptic;
      Haptics.impactAsync(style).catch(() => {});
    }

    onPressIn?.(e);
  };

  const handlePressOut = (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    // Spring de rebote al soltar
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
    } else {
      scale.value = withSpring(1, { damping: 18, stiffness: 320 });
      opacity.value = withSpring(1, { damping: 18, stiffness: 320 });
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[animStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
