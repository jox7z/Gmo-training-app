import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CommunitiesExplorer } from '@/components/communities/CommunitiesExplorer';
import { colors, spacing } from '@/theme/tokens';

export default function CommunitiesScreen() {

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
        <ScreenHeader
          title="Comunidades"
          subtitle="Grupos a los que perteneces y por descubrir"
          padded={false}
          style={{ paddingVertical: 0 }}
        />
      </View>

      <CommunitiesExplorer />
    </SafeAreaView>
  );
}
