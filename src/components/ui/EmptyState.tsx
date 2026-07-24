import { View, StyleProp, ViewStyle } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon, IconName } from '@/components/Icon';
import { colors, spacing } from '@/theme/tokens';

type Tone = 'default' | 'info' | 'primary' | 'danger';

/** Variantes de Button admitidas para las acciones del estado vacío. */
type ActionVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
/** Tamaños de Button admitidos (Button.tsx no exporta su tipo Size interno). */
type ActionSize = 'sm' | 'md' | 'lg';

interface Action {
  label: string;
  onPress: () => void;
  /** Variante del Button (por defecto `primary` en `action`). */
  variant?: ActionVariant;
  /** Tamaño del Button (por defecto `md`). */
  size?: ActionSize;
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  action?: Action;
  secondaryAction?: Action;
  /** Color del círculo del icono. */
  tone?: Tone;
  /** Slot futuro para ilustraciones (C1); sin uso aún. Si llega, reemplaza al círculo. */
  illustration?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Colores del círculo del icono por tono (bg + borde + icono). Todo desde tokens.
const toneStyles: Record<Tone, { bg: string; border: string; icon: string }> = {
  default: { bg: colors.bg.elevated, border: colors.border, icon: colors.text.secondary },
  info: { bg: colors.info.soft, border: colors.info.DEFAULT, icon: colors.info.DEFAULT },
  primary: { bg: colors.primary.muted, border: colors.primary.DEFAULT, icon: colors.primary.DEFAULT },
  danger: { bg: colors.dangerSoft, border: colors.danger, icon: colors.danger },
};

/**
 * Estado vacío/informativo reutilizable (calcado de FeedEmptyState): tarjeta
 * centrada con círculo de icono, título, subtítulo opcional y hasta dos
 * acciones. `tone` tiñe el círculo; `illustration` reemplaza el círculo cuando
 * se provea (slot C1).
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  secondaryAction,
  tone = 'default',
  illustration,
  style,
}: EmptyStateProps) {
  const t = toneStyles[tone];
  return (
    <Card padding="xl" style={[{ alignItems: 'center' }, style]}>
      {illustration ?? (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.bg,
            borderWidth: 1,
            borderColor: t.border,
            marginBottom: spacing.md,
          }}
        >
          <Icon name={icon} size={28} color={t.icon} />
        </View>
      )}
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle != null && (
        <Text
          variant="caption"
          tone="secondary"
          style={{ textAlign: 'center', marginTop: spacing.xs }}
        >
          {subtitle}
        </Text>
      )}
      {action && (
        <Button
          title={action.label}
          variant={action.variant ?? 'primary'}
          size={action.size ?? 'md'}
          onPress={action.onPress}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      )}
      {secondaryAction && (
        <Button
          title={secondaryAction.label}
          variant={secondaryAction.variant ?? 'ghost'}
          size={secondaryAction.size ?? 'md'}
          onPress={secondaryAction.onPress}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      )}
    </Card>
  );
}
