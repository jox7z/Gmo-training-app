import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme/tokens';
import { TabIcon } from '@/components/TabIcon';
import { Text } from '@/components/ui/Text';
import { registerTabSetter } from '@/lib/tabsNav';

// Screens renderizadas directamente para habilitar PagerView swipe.
// El deep-linking individual a /(tabs)/X se sustituye por el índice del PagerView.
import FeedScreen from './index';
import RoutinesScreen from './routines';
import ProgressScreen from './progress';
import ProfileScreen from './profile';

type TabName = 'feed' | 'routines' | 'progress' | 'profile';

const TABS: { key: TabName; label: string }[] = [
  { key: 'feed',     label: 'Feed'     },
  { key: 'routines', label: 'Rutinas'  },
  { key: 'progress', label: 'Progreso' },
  { key: 'profile',  label: 'Perfil'   },
];

export default function TabsLayout() {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const insets = useSafeAreaInsets();

  const handlePageSelected = useCallback((e: PagerViewOnPageSelectedEvent) => {
    const i = e.nativeEvent.position;
    setActiveIndex(i);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const handleTabPress = useCallback((i: number) => {
    if (i === activeIndex) return;
    pagerRef.current?.setPage(i);
    setActiveIndex(i);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [activeIndex]);

  // Permite a componentes fuera del layout (p. ej. el FAB del feed) cambiar de
  // tab. Usa el mismo mecanismo que los botones para no desincronizar el indicador.
  useEffect(
    () =>
      registerTabSetter((i) => {
        pagerRef.current?.setPage(i);
        setActiveIndex(i);
      }),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        <View key="0" style={{ flex: 1 }}><FeedScreen /></View>
        <View key="1" style={{ flex: 1 }}><RoutinesScreen /></View>
        <View key="2" style={{ flex: 1 }}><ProgressScreen /></View>
        <View key="3" style={{ flex: 1 }}><ProfileScreen /></View>
      </PagerView>

      {/* Tab bar fija — blur + íconos */}
      <View
        style={[
          styles.tabBar,
          { height: 70 + insets.bottom, borderTopColor: colors.border },
        ]}
      >
        <BlurView
          tint="dark"
          intensity={30}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11,11,11,0.7)' }]}
        />
        <View style={[styles.tabRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
          {TABS.map((tab, i) => {
            const active = activeIndex === i;
            const color = active ? colors.primary.DEFAULT : colors.text.muted;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabPress(i)}
                style={styles.tabItem}
              >
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 2,
                    borderRadius: radius.full,
                    backgroundColor: active ? colors.primary.muted : 'transparent',
                  }}
                >
                  <TabIcon name={tab.key} color={color} focused={active} />
                </View>
                <Text weight={active ? 'bold' : 'semibold'} style={{ color, fontSize: 11 }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
});
