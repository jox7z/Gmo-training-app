import { useEffect } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GmoMascot } from '@/components/GmoMascot';
import { Text } from '@/components/ui/Text';
import { useMotion } from '@/theme/motion';
import { spacing } from '@/theme/tokens';

interface RestMascotCoachProps {
  phrase?: string;
  mascotSize?: number;
  /** Ilustración 2D específica de descanso. Si falta, usa la mascota base. */
  mascotSource?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_PHRASE = 'Respira. La siguiente serie es tuya.';

/**
 * Refuerzo visual breve para el descanso entre series.
 * La animación es finita y no comunica información necesaria.
 */
export function RestMascotCoach({
  phrase = DEFAULT_PHRASE,
  mascotSize = 104,
  mascotSource,
  style,
}: RestMascotCoachProps) {
  const { reduce, timing } = useMotion();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(translateY);
    cancelAnimation(scale);
    translateY.value = 0;
    scale.value = 1;

    if (reduce) return;

    const movement = timing('enter');
    translateY.value = 4;
    scale.value = 0.985;
    translateY.value = withTiming(0, movement);
    scale.value = withTiming(1, movement);

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(scale);
    };
  }, [phrase, reduce, scale, timing, translateY]);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`GMO te anima: ${phrase}`}
      style={[
        {
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.xl,
        },
        style,
      ]}
    >
      <Animated.View style={mascotStyle}>
        {mascotSource ? (
          <Image
            source={mascotSource}
            accessibilityIgnoresInvertColors
            style={{ width: mascotSize, height: mascotSize }}
          />
        ) : (
          <GmoMascot size={mascotSize} accessible={false} />
        )}
      </Animated.View>
      <Text
        variant="body"
        weight="semibold"
        tone="secondary"
        style={{ maxWidth: 280, textAlign: 'center' }}
      >
        {phrase}
      </Text>
    </Animated.View>
  );
}
