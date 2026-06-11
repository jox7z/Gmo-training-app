import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { CommunitiesExplorer } from '@/components/communities/CommunitiesExplorer';
import { colors, spacing } from '@/theme/tokens';

export default function CommunitiesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="chevron-left" size={18} color={colors.text.primary} />
          </View>
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>Comunidades</Text>
      </View>

      <CommunitiesExplorer />
    </SafeAreaView>
  );
}
