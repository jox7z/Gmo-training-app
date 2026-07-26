import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { CommunityForm } from '@/components/communities/CommunityForm';
import { useCreateCommunity } from '@/lib/queries/communities';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, spacing } from '@/theme/tokens';

export default function NewCommunityScreen() {
  const router        = useRouter();
  const toast         = useToast();
  const createMutation = useCreateCommunity();

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
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name="close" size={18} color={colors.text.primary} />
          </View>
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>Crear comunidad</Text>
      </View>

      <CommunityForm
        submitLabel="Crear comunidad"
        onSubmit={async (values) => {
          const id = await new Promise<string>((resolve, reject) => {
            createMutation.mutate(values, {
              onSuccess: resolve,
              onError:   reject,
            });
          });
          toast.show({ message: '¡Comunidad creada!', tone: 'success' });
          router.replace({ pathname: '/communities/[id]', params: { id } });
        }}
      />
    </SafeAreaView>
  );
}
