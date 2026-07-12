/**
 * Skeleton — primitivo de carga con barrido (shimmer) animado.
 * Caja base en `colors.bg.elevated` y una banda clara (`colors.bg.shimmer`)
 * que recorre el ancho en bucle con Reanimated 4. Un único loop por instancia,
 * sin timers de JS. Respeta "reducir movimiento" del sistema (caja estática).
 */
import { useEffect } from 'react';
import {
  View,
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  interpolate,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '@/theme/tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height,
  radius: borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const progress = useSharedValue(0);
  const layoutW = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [reduced, progress]);

  const sweepStyle = useAnimatedStyle(() => {
    const w = layoutW.value;
    const sweepW = Math.max(80, w * 0.5);
    return {
      width: sweepW,
      transform: [{ translateX: interpolate(progress.value, [0, 1], [-sweepW, w]) }],
    };
  });

  return (
    <View
      onLayout={(e) => {
        layoutW.value = e.nativeEvent.layout.width;
      }}
      style={[
        { width, height, borderRadius, backgroundColor: colors.bg.elevated, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View style={[styles.sweep, sweepStyle]}>
        <LinearGradient
          colors={['transparent', colors.bg.shimmer, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** Atajo circular: caja con `radius = size / 2`. */
export function SkeletonCircle({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} />;
}

/**
 * Fila tipo lista: círculo (avatar) + columna con 1-2 barras.
 * Pensado para skeletons de listas (notificaciones, ranking, comunidades…).
 */
export function SkeletonRow({
  withCircle = true,
  lines = 2,
}: {
  withCircle?: boolean;
  lines?: number;
}) {
  return (
    <View style={styles.row}>
      {withCircle && <SkeletonCircle size={44} />}
      <View style={styles.rowLines}>
        <Skeleton width="60%" height={14} />
        {lines > 1 && <Skeleton width="40%" height={12} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLines: {
    flex: 1,
    gap: spacing.sm,
  },
});
