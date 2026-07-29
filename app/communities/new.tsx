import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CommunityForm } from '@/components/communities/CommunityForm';
import { useCreateCommunity } from '@/lib/queries/communities';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/theme/tokens';

export default function NewCommunityScreen() {
  const router        = useRouter();
  const toast         = useToast();
  const createMutation = useCreateCommunity();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      <ScreenHeader
        title="Crear comunidad"
        subtitle="Define nombre, descripción y privacidad"
        backIcon="close"
        border
      />

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
