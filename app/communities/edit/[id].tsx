import { View, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { CommunityForm } from '@/components/communities/CommunityForm';
import { useCommunity, useUpdateCommunity } from '@/lib/queries/communities';
import { useToast } from '@/components/ui/Toast';
import { colors, spacing } from '@/theme/tokens';

export default function EditCommunityScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>();
  const router     = useRouter();
  const toast      = useToast();
  const updateMut  = useUpdateCommunity();
  const query      = useCommunity(id);
  const community  = query.data;

  if (query.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

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
            <Icon name="close" size={18} color={colors.text.primary} />
          </View>
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>Editar comunidad</Text>
      </View>

      <CommunityForm
        initialValues={{
          name:        community?.name,
          description: community?.description,
          coverUrl:    community?.coverUrl,
          isPrivate:   community?.isPrivate ?? false,
        }}
        submitLabel="Guardar cambios"
        onSubmit={async (values) => {
          await new Promise<void>((resolve, reject) => {
            updateMut.mutate(
              { id: id!, ...values },
              {
                onSuccess: () => resolve(),
                onError:   reject,
              },
            );
          });
          toast.show({ message: 'Comunidad actualizada', tone: 'success' });
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
