import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { MascotState } from '@/components/GmoMascot';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  onDiscover: () => void;
}

export function FeedEmptyState({ onDiscover }: Props) {
  return (
    <Card padding="xl" style={{ alignItems: 'center', marginTop: spacing.lg }}>
      <MascotState
        mascotSize={144}
        title="Tu feed está listo"
        description="Sigue a otros atletas y aquí verás sus entrenos, PRs y rachas."
        style={{ alignSelf: 'stretch' }}
      >
        <Button title="Descubrir atletas →" onPress={onDiscover} fullWidth />
      </MascotState>
    </Card>
  );
}

export function FeedErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <Card padding="xl" style={{ alignItems: 'center', marginTop: spacing.lg }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(239,68,68,0.15)',
          borderWidth: 1,
          borderColor: colors.danger,
          marginBottom: spacing.md,
        }}
      >
        <Icon name="close" size={28} color={colors.danger} />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>
        No se pudo cargar el feed
      </Text>
      <Text
        variant="caption"
        tone="secondary"
        style={{ textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg }}
      >
        {message ?? 'Revisa tu conexión y vuelve a intentarlo.'}
      </Text>
      <Button title="Reintentar" variant="secondary" onPress={onRetry} fullWidth />
    </Card>
  );
}
