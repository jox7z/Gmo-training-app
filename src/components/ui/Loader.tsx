import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/theme/tokens';

export function Loader({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <View
      style={{
        flex: fullScreen ? 1 : undefined,
        backgroundColor: colors.bg.base,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
    </View>
  );
}
