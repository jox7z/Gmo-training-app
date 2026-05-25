import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  onDiscover: () => void;
}

export function FeedEmptyState({ onDiscover }: Props) {
  return (
    <Card padding="xl" style={{ alignItems: 'center', marginTop: spacing.lg }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.info.soft,
          borderWidth: 1,
          borderColor: colors.info.DEFAULT,
          marginBottom: spacing.md,
        }}
      >
        <Icon name="users" size={28} color={colors.info.DEFAULT} />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>
        Tu feed está vacío
      </Text>
      <Text
        variant="caption"
        tone="secondary"
        style={{ textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg }}
      >
        Sigue a otros atletas y verás sus entrenos, PRs y rachas aquí.
      </Text>
      <Button title="Descubrir atletas →" onPress={onDiscover} fullWidth />
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
          borderRadius: 32,
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
