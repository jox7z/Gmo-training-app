import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { colors } from '@/theme/tokens';
import { TabIcon } from '@/components/TabIcon';

export default function TabsLayout() {
  console.log('[TabsLayout] render — usuario entró al grupo de tabs');
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(11,11,11,0.85)',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 70,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarBackground: () => (
          <BlurView
            tint="dark"
            intensity={30}
            style={{ flex: 1, backgroundColor: 'rgba(11,11,11,0.7)' }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => <TabIcon name="feed" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
          tabBarIcon: ({ color, focused }) => <TabIcon name="routines" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => <TabIcon name="profile" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
