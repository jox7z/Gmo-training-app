import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CommunityForm } from '@/components/communities/CommunityForm';
import { useCommunity, useUpdateCommunity } from '@/lib/queries/communities';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/theme/tokens';

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

      <ScreenHeader
        title="Editar comunidad"
        subtitle={community?.name}
        backIcon="close"
        border
      />

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
