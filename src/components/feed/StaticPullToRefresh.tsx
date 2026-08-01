import { useCallback } from 'react';
import {
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

const PULL_THRESHOLD = 72;
const DIRECTION_THRESHOLD = 10;
const DIRECTION_DOMINANCE = 1.15;

export interface StaticPullListProps {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
  bounces: false;
  alwaysBounceVertical: false;
  overScrollMode: 'never';
  accessibilityActions: { name: string; label: string }[];
  onAccessibilityAction: (event: AccessibilityActionEvent) => void;
}

interface Props {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  label?: string;
  children: (props: StaticPullListProps) => React.ReactNode;
}

/** Pull-to-refresh sin traslado ni indicador animado. */
export function StaticPullToRefresh({ refreshing, onRefresh, label = 'Actualizando', children }: Props) {
  const scrollOffset = useSharedValue(0);
  const canPull = useSharedValue(false);
  const gestureActivated = useSharedValue(false);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  const requestRefresh = useCallback(async () => {
    if (refreshing) return;
    try {
      await onRefresh();
    } catch {
      // El owner comunica el error de actualización.
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
      const horizontalDominates = deltaX >= DIRECTION_THRESHOLD && deltaX > Math.abs(deltaY) * DIRECTION_DOMINANCE;
      if (deltaY <= -DIRECTION_THRESHOLD || horizontalDominates) {
        canPull.value = false;
        manager.fail();
        return;
      }
      if (!gestureActivated.value && deltaY >= DIRECTION_THRESHOLD && deltaY > deltaX * DIRECTION_DOMINANCE) {
        gestureActivated.value = true;
        manager.activate();
      }
    })
    .onEnd((event) => {
      if (canPull.value && event.translationY >= PULL_THRESHOLD) runOnJS(requestRefresh)();
    })
    .onFinalize(() => {
      canPull.value = false;
      gestureActivated.value = false;
    });

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.value = Math.max(0, event.nativeEvent.contentOffset.y);
  }, [scrollOffset]);

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, Gesture.Native())}>
      <View style={{ flex: 1 }}>
        {children({
          onScroll,
          scrollEventThrottle: 16,
          bounces: false,
          alwaysBounceVertical: false,
          overScrollMode: 'never',
          accessibilityActions: [{ name: 'refresh', label: `Actualizar ${label.toLocaleLowerCase('es')}` }],
          onAccessibilityAction: (event) => {
            if (event.nativeEvent.actionName === 'refresh') void requestRefresh();
          },
        })}
      </View>
    </GestureDetector>
  );
}
