import { View, ScrollView, ViewStyle, ScrollViewProps, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ScrollViewProps['style'];
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  contentContainerStyle,
  refreshing,
  onRefresh,
}: Props) {
  const insets = useSafeAreaInsets();
  const containerPadding = padded ? { padding: spacing.lg } : undefined;

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingBottom: insets.bottom + 100 }, containerPadding, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, containerPadding, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />
      {content}
    </SafeAreaView>
  );
}
