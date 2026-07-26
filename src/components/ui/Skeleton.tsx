import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  type DimensionValue,
  View,
  type ViewProps,
} from 'react-native';
import { colors, radius } from '@/theme/tokens';

const SkeletonPulseContext = createContext<Animated.Value | null>(null);

interface SkeletonProps extends Omit<ViewProps, 'children'> {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}

export function Skeleton({
  width = '100%',
  height = 12,
  borderRadius = radius.sm,
  style,
  ...rest
}: SkeletonProps) {
  const opacity = useContext(SkeletonPulseContext);

  return (
    <Animated.View
      {...rest}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.bg.elevated,
          opacity: opacity ?? 0.65,
        },
        style,
      ]}
    />
  );
}

export function SkeletonGroup({
  accessibilityLabel = 'Cargando contenido',
  accessibilityState,
  children,
  ...rest
}: ViewProps) {
  const opacity = useRef(new Animated.Value(0.65)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion !== false) {
      opacity.stopAnimation();
      opacity.setValue(0.65);
      return;
    }

    opacity.setValue(0.45);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduceMotion]);

  return (
    <SkeletonPulseContext.Provider value={opacity}>
      <View
        {...rest}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="progressbar"
        accessibilityState={{ ...accessibilityState, busy: true }}
      >
        {children}
      </View>
    </SkeletonPulseContext.Provider>
  );
}
