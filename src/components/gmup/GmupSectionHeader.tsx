import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, spacing } from '@/theme/tokens';

interface Action {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
}

interface Props {
  title: string;
  /** Una línea corta que explica de qué va la sección. */
  subtitle?: string;
  /** Acción secundaria alineada a la derecha (normalmente "Ver todo"). */
  action?: Action;
}

/**
 * Encabezado de sección del hub GMUP: título + acción opcional.
 * Es puramente presentacional; la navegación la decide quien lo usa.
 */
export function GmupSectionHeader({ title, subtitle, action }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="heading" weight="bold" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${action.label}: ${title}`}
          accessibilityHint={action.accessibilityHint}
          onPress={action.onPress}
          hitSlop={spacing.sm}
          pressScale={0.94}
          haptic={false}
          style={{
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.xs,
          }}
        >
          <Text variant="caption" tone="brand" weight="bold">
            {action.label}
          </Text>
          <Icon name="chevron-right" size={spacing.lg} color={colors.primary.DEFAULT} />
        </PressableScale>
      ) : null}
    </View>
  );
}
