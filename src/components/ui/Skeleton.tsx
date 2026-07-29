import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  type DimensionValue,
  View,
  type ViewProps,
} from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

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
          backgroundColor: colors.bg.track,
          opacity: opacity ?? 0.65,
        },
        style,
      ]}
    />
  );
}

/**
 * SkeletonRows — placeholder para la carga *inicial* de una lista de filas
 * (avatar + dos líneas). Es el único tratamiento válido de carga inicial en
 * listas; `ActivityIndicator` queda reservado a paginación y refetch.
 */
export function SkeletonRows({
  rows = 6,
  avatar = true,
  accessibilityLabel = 'Cargando lista',
}: {
  rows?: number;
  avatar?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <SkeletonGroup accessibilityLabel={accessibilityLabel} style={{ gap: spacing.md }}>
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          {avatar ? <Skeleton width={44} height={44} borderRadius={radius.full} /> : null}
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton width="56%" height={12} />
            <Skeleton width="34%" height={10} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
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
