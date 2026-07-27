import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/IconButton';
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
        <IconButton icon="chevron-left" onPress={() => router.back()} iconSize={18} />
        <Text variant="heading" style={{ flex: 1 }}>Comunidades</Text>
      </View>

      <CommunitiesExplorer />
    </SafeAreaView>
  );
}
