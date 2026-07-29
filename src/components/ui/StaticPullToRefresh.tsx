import { useCallback, useEffect } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { useReduceMotion } from '@/components/ui/useReduceMotion';
import { colors, radius, spacing } from '@/theme/tokens';

const PULL_THRESHOLD = 72;
const MAX_PULL = 104;
const INDICATOR_SIZE = 40;
const DIRECTION_THRESHOLD = 10;
const DIRECTION_DOMINANCE = 1.15;

export interface StaticPullListProps {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
  bounces: false;
  alwaysBounceVertical: false;
  overScrollMode: 'never';
}

interface Props {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  /** Qué se está actualizando. Solo lo lee el lector de pantalla. */
  label?: string;
  children: (props: StaticPullListProps) => React.ReactNode;
}

/**
 * Pull-to-refresh que mantiene el contenido inmóvil. El gesto exterior solo
 * mueve el indicador; la lista conserva su posición y el PagerView mantiene el
 * gesto horizontal.
 *
 * Es el comportamiento estándar de scroll de la app: **ninguna superficie se
 * arrastra hacia abajo**. Las pantallas sin refresco consiguen lo mismo pasando
 * `bounces={false}` / `alwaysBounceVertical={false}` / `overScrollMode="never"`
 * a su contenedor; las que sí refrescan lo consiguen envolviéndose aquí.
 */
export function StaticPullToRefresh({
  refreshing,
  onRefresh,
  label = 'Actualizando',
  children,
}: Props) {
  const reduceMotion = useReduceMotion();
  const scrollOffset = useSharedValue(0);
  const pullDistance = useSharedValue(0);
  const canPull = useSharedValue(false);
  const gestureActivated = useSharedValue(false);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  const requestRefresh = useCallback(async () => {
    if (refreshing) return;
    try {
      await onRefresh();
    } catch {
      // El owner comunica el error; el worklet nunca deja una promesa rechazada.
    }
  }, [onRefresh, refreshing]);

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event, manager) => {
      const touch = event.allTouches[0];
      canPull.value = scrollOffset.value <= 0.5 && !refreshing;
      gestureActivated.value = false;
      if (!touch || event.numberOfTouches !== 1 || !canPull.value) {
        manager.fail();
        return;
      }
      touchStartX.value = touch.absoluteX;
      touchStartY.value = touch.absoluteY;
    })
    .onTouchesMove((event, manager) => {
      const touch = event.allTouches[0];
      if (!touch || event.numberOfTouches !== 1 || !canPull.value) {
        manager.fail();
        return;
      }

      const deltaX = Math.abs(touch.absoluteX - touchStartX.value);
      const deltaY = touch.absoluteY - touchStartY.value;
      const horizontalDominates =
        deltaX >= DIRECTION_THRESHOLD &&
        deltaX > Math.abs(deltaY) * DIRECTION_DOMINANCE;

      if (deltaY <= -DIRECTION_THRESHOLD || horizontalDominates) {
        canPull.value = false;
        pullDistance.value = 0;
        manager.fail();
        return;
      }

      if (
        !gestureActivated.value &&
        deltaY >= DIRECTION_THRESHOLD &&
        deltaY > deltaX * DIRECTION_DOMINANCE
      ) {
        gestureActivated.value = true;
        manager.activate();
        return;
      }

      if (
        gestureActivated.value &&
        deltaX > Math.max(DIRECTION_THRESHOLD, deltaY * DIRECTION_DOMINANCE)
      ) {
        canPull.value = false;
        pullDistance.value = 0;
        manager.fail();
      }
    })
    .onUpdate((event) => {
      if (!canPull.value || event.translationY <= 0) return;
      pullDistance.value = Math.min(
        MAX_PULL,
        event.translationY,
      );
    })
    .onFinalize(() => {
      if (canPull.value && pullDistance.value >= PULL_THRESHOLD) {
        runOnJS(requestRefresh)();
      }
      canPull.value = false;
      gestureActivated.value = false;
      pullDistance.value = reduceMotion
        ? withTiming(0, { duration: 0 })
        : withSpring(0, {
            damping: 20,
            stiffness: 260,
          });
    });

  const nativeScroll = Gesture.Native();
  const gesture = Gesture.Simultaneous(pan, nativeScroll);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.value = Math.max(0, event.nativeEvent.contentOffset.y);
    },
    [scrollOffset],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>
        {children({
          onScroll,
          scrollEventThrottle: 16,
          bounces: false,
          alwaysBounceVertical: false,
          overScrollMode: 'never',
        })}
        <GmoRefreshIndicator
          refreshing={refreshing}
          pullDistance={pullDistance}
          label={label}
        />
      </View>
    </GestureDetector>
  );
}

export function GmoRefreshIndicator({
  refreshing,
  pullDistance,
  label = 'Actualizando',
}: {
  refreshing: boolean;
  pullDistance: SharedValue<number>;
  label?: string;
}) {
  const reduceMotion = useReduceMotion();
  const spin = useSharedValue(0);

  useEffect(() => {
    if (refreshing && !reduceMotion) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(1, { duration: 850 }), -1, false);
      return;
    }
    spin.value = withTiming(0, { duration: reduceMotion ? 0 : 140 });
  }, [reduceMotion, refreshing, spin]);

  const indicatorStyle = useAnimatedStyle(() => {
    const visibleDistance = refreshing
      ? spacing.md + INDICATOR_SIZE
      : pullDistance.value;
    const progress = Math.min(1, visibleDistance / PULL_THRESHOLD);
    return {
      opacity: progress,
      transform: [
        {
          translateY:
            -INDICATOR_SIZE +
            Math.min(visibleDistance, PULL_THRESHOLD) * 0.72,
        },
        { rotate: `${spin.value * 360}deg` },
        { scale: 0.82 + progress * 0.18 },
      ],
    };
  }, [refreshing]);

  return (
    <Animated.View
      pointerEvents="none"
      accessible={refreshing}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[
        {
          position: 'absolute',
          zIndex: 5,
          top: spacing.xs,
          left: '50%',
          width: INDICATOR_SIZE,
          height: INDICATOR_SIZE,
          marginLeft: -INDICATOR_SIZE / 2,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.primary.glow,
          // Flota sobre el contenido: le corresponde la capa superior de la
          // rampa, no `bg.elevated`, que ahora queda por debajo de `bg.card`.
          backgroundColor: colors.bg.raised,
          alignItems: 'center',
          justifyContent: 'center',
        },
        indicatorStyle,
      ]}
    >
      <Icon name="robot" size={22} color={colors.primary.DEFAULT} />
    </Animated.View>
  );
}
