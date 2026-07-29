import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme/tokens';
import { TabIcon } from '@/components/TabIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMainTabsStore, type MainTabName } from '@/store/mainTabs';

// Screens renderizadas directamente para habilitar PagerView swipe.
// El deep-linking individual a /(tabs)/X se sustituye por el índice del PagerView.
import FeedScreen from './index';
import GmupScreen from './gmup';
import RoutinesScreen from './routines';
import ProgressScreen from './progress';
import ProfileScreen from './profile';

// El orden define el índice del PagerView. GMUP es la segunda página: el hub
// social queda a un swipe del Feed.
const TABS: { key: MainTabName; label: string }[] = [
  { key: 'feed',     label: 'Feed'     },
  { key: 'gmup',     label: 'GMUP'     },
  { key: 'routines', label: 'Rutinas'  },
  { key: 'progress', label: 'Progreso' },
  { key: 'profile',  label: 'Perfil'   },
];

export default function TabsLayout() {
  const pagerRef = useRef<PagerView>(null);
  const activeIndexRef = useRef(0);
  const tabPressTargetRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const requestedTab = useMainTabsStore((state) => state.requestedTab);
  const consumeTabRequest = useMainTabsStore((state) => state.consumeRequest);

  const handlePageSelected = useCallback((e: PagerViewOnPageSelectedEvent) => {
    const i = e.nativeEvent.position;
    const selectedFromTabBar = tabPressTargetRef.current === i;
    const changed = activeIndexRef.current !== i;

    tabPressTargetRef.current = null;
    activeIndexRef.current = i;
    setActiveIndex(i);

    if (changed && !selectedFromTabBar) {
      Haptics.selectionAsync().catch(() => {});
    }
  }, []);

  const handleTabPress = useCallback((i: number) => {
    if (i === activeIndexRef.current) return;
    tabPressTargetRef.current = i;
    activeIndexRef.current = i;
    pagerRef.current?.setPage(i);
    setActiveIndex(i);
  }, []);

  useEffect(() => {
    if (!requestedTab) return;
    const requestedIndex = TABS.findIndex((tab) => tab.key === requestedTab);
    if (requestedIndex >= 0) {
      handleTabPress(requestedIndex);
    }
    consumeTabRequest();
  }, [consumeTabRequest, handleTabPress, requestedTab]);

  return (
    <View style={styles.root}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        <View key="0" style={styles.page}><FeedScreen /></View>
        <View key="1" style={styles.page}><GmupScreen /></View>
        <View key="2" style={styles.page}><RoutinesScreen /></View>
        <View key="3" style={styles.page}><ProgressScreen /></View>
        <View key="4" style={styles.page}><ProfileScreen /></View>
      </PagerView>

      <View
        style={[
          styles.tabBar,
          { paddingBottom: insets.bottom },
        ]}
      >
        <BlurView
          tint="dark"
          intensity={40}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Navegación principal"
          style={styles.tabRow}
        >
          {TABS.map((tab, i) => {
            const active = activeIndex === i;
            const color = active ? colors.primary.DEFAULT : colors.text.muted;
            return (
              <PressableScale
                key={tab.key}
                onPress={() => handleTabPress(i)}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
                haptic={active ? false : Haptics.ImpactFeedbackStyle.Light}
                pressScale={0.92}
                style={styles.tabItem}
              >
                <View
                  pointerEvents="none"
                  style={[styles.iconShell, active && styles.iconShellActive]}
                >
                  <TabIcon name={tab.key} color={color} focused={active} />
                </View>
                <Text
                  variant="caption"
                  tone={active ? 'brand' : 'muted'}
                  weight={active ? 'bold' : 'semibold'}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg.overlay,
    overflow: 'hidden',
  },
  tabRow: {
    minHeight: spacing['4xl'] + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs / 2,
  },
  iconShell: {
    // Con 5 pestañas cada ítem dispone de ~69 px en pantallas de 360: el shell
    // se ciñe al icono para que las etiquetas largas ("Progreso") no trunquen.
    minWidth: spacing['2xl'] + spacing.xs,
    minHeight: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  iconShellActive: {
    backgroundColor: colors.primary.muted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary.glow,
  },
});
