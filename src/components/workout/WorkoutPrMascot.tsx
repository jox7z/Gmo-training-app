import { useEffect } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GmoMascot } from '@/components/GmoMascot';
import { useMotion } from '@/theme/motion';

interface WorkoutPrMascotProps {
  /** Ilustración 2D de GMO celebrando un PR, sin fondo. */
  source?: ImageSourcePropType;
  size?: number;
}

/**
 * Entrada finita de GMO al cerrar un entreno con un nuevo PR.
 * Brota desde abajo una sola vez; con Reduce Motion queda visible sin recorrido.
 */
export function WorkoutPrMascot({ source, size = 152 }: WorkoutPrMascotProps) {
  const { reduce, spring, timing } = useMotion();
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(translateY);
    cancelAnimation(scale);

    if (reduce) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      return;
    }

    opacity.value = 0;
    translateY.value = Math.round(size * 0.24);
    scale.value = 0.78;
    opacity.value = withTiming(1, timing('enter'));
    translateY.value = withSpring(0, spring('celebrate'));
    scale.value = withSpring(1, spring('celebrate'));

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(scale);
    };
  }, [opacity, reduce, scale, size, spring, timing, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel="GMO celebra tu nuevo récord personal"
      style={[{ width: size, height: size }, animatedStyle]}
    >
      {source ? (
        <Image
          source={source}
          accessibilityIgnoresInvertColors
          style={{ width: size, height: size }}
        />
      ) : (
        <GmoMascot size={size} accessible={false} />
      )}
    </Animated.View>
  );
}
