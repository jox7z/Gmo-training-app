import { useCallback, useEffect } from 'react';
import { Image } from 'expo-image';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/components/ui/useReduceMotion';
import { duration, useMotion } from '@/theme/motion';
import { spacing } from '@/theme/tokens';

const PULL_THRESHOLD = 72;
const MAX_PULL = 104;
const INDICATOR_SIZE = 40;
const DIRECTION_THRESHOLD = 10;
const DIRECTION_DOMINANCE = 1.15;

export interface StaticPullListProps {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
  bounces: false;
  overScrollMode: 'never';
}

interface Props {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  children: (props: StaticPullListProps) => React.ReactNode;
}

/**
 * Pull-to-refresh que mantiene la lista inmóvil. El gesto exterior solo mueve
 * el indicador; la FlashList conserva su posición y el PagerView mantiene el
 * gesto horizontal.
 */
export function StaticPullToRefresh({
  refreshing,
  onRefresh,
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
          overScrollMode: 'never',
        })}
        <GmoRefreshIndicator
          refreshing={refreshing}
          pullDistance={pullDistance}
        />
      </View>
    </GestureDetector>
  );
}

export function GmoRefreshIndicator({
  refreshing,
  pullDistance,
}: {
  refreshing: boolean;
  pullDistance: SharedValue<number>;
}) {
  const motion = useMotion();
  const spin = useSharedValue(0);
  const refreshActive = useSharedValue(refreshing);
  const spinComplete = useSharedValue(true);
  const showRefresh = useSharedValue(refreshing);

  useEffect(() => {
    refreshActive.value = refreshing;

    if (refreshing) {
      showRefresh.value = true;
      cancelAnimation(spin);
      spin.value = 0;
      spinComplete.value = motion.reduce;

      if (!motion.reduce) {
        spin.value = withTiming(
          1,
          {
            ...motion.timing('base'),
            duration: duration.slow,
          },
          (finished) => {
            if (finished) spinComplete.value = true;
          },
        );
      }
      return;
    }

    if (motion.reduce) {
      cancelAnimation(spin);
      spin.value = 0;
      spinComplete.value = true;
    }
  }, [
    motion,
    refreshActive,
    refreshing,
    showRefresh,
    spin,
    spinComplete,
  ]);

  useAnimatedReaction(
    () => !refreshActive.value && spinComplete.value,
    (shouldHide) => {
      if (shouldHide) showRefresh.value = false;
    },
  );

  const indicatorStyle = useAnimatedStyle(() => {
    const visibleDistance = showRefresh.value
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
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessible={refreshing}
      accessibilityRole="progressbar"
      accessibilityLabel="Actualizando feed"
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
          alignItems: 'center',
          justifyContent: 'center',
        },
        indicatorStyle,
      ]}
    >
      <Image
        source={require('../../../assets/icon.png')}
        style={{ width: INDICATOR_SIZE, height: INDICATOR_SIZE }}
        contentFit="contain"
        accessible={false}
      />
    </Animated.View>
  );
}
