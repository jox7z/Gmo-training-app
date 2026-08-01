import { View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

interface SocialErrorStateProps {
  title: string;
  subtitle: string;
  onRetry: () => void;
  isRetrying?: boolean;
  compact?: boolean;
}

export function SocialErrorState({
  title,
  subtitle,
  onRetry,
  isRetrying = false,
  compact = false,
}: SocialErrorStateProps) {
  return (
    <Card
      variant="outlined"
      padding={compact ? 'md' : 'xl'}
      style={{
        alignItems: compact ? 'flex-start' : 'center',
        borderColor: colors.danger,
        marginTop: compact ? 0 : spacing.xl,
        gap: compact ? spacing.sm : spacing.md,
      }}
    >
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={{
          flexDirection: compact ? 'row' : 'column',
          alignItems: 'center',
          gap: spacing.sm,
          alignSelf: compact ? 'stretch' : undefined,
        }}
      >
        <View
          style={{
            width: compact ? spacing['2xl'] : spacing['4xl'],
            height: compact ? spacing['2xl'] : spacing['4xl'],
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.bg.elevated,
            borderWidth: 1,
            borderColor: colors.danger,
          }}
        >
          <Icon name="close" size={compact ? spacing.md : spacing.xl} color={colors.danger} />
        </View>

        <View
          style={{
            flex: compact ? 1 : undefined,
            alignItems: compact ? 'flex-start' : 'center',
          }}
        >
          <Text
            variant={compact ? 'body' : 'heading'}
            weight="bold"
            style={{ textAlign: compact ? 'left' : 'center' }}
          >
            {title}
          </Text>
          <Text
            variant="caption"
            tone="secondary"
            style={{ marginTop: spacing.xs, textAlign: compact ? 'left' : 'center' }}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      <Button
        title="Reintentar"
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        loading={isRetrying}
        onPress={onRetry}
        fullWidth
        haptic={false}
      />
    </Card>
  );
}
