/**
 * EmptyState — bloque único para "no hay nada aquí" y para errores de carga.
 *
 * Sustituye las implementaciones ad-hoc de Discover, Notificaciones,
 * Conexiones, editor de rutina y selector de ejercicios. Cada vacío debe
 * ofrecer una acción primaria cuando exista una salida natural.
 */
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

type EmptyTone = 'neutral' | 'brand' | 'accent' | 'danger';

interface EmptyAction {
  label: string;
  onPress: () => void;
}

interface Props {
  title: string;
  /** Una o dos frases: por qué está vacío y qué puede hacer el usuario. */
  description?: string;
  icon?: IconName;
  tone?: EmptyTone;
  /** Acción primaria. Inclúyela siempre que exista una salida natural. */
  action?: EmptyAction;
  secondaryAction?: EmptyAction;
  /** Envuelve el bloque en una superficie de sección. */
  surface?: boolean;
  /** Versión reducida para vacíos dentro de una tarjeta o sheet. */
  compact?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<EmptyTone, { bg: string; border: string; fg: string }> = {
  neutral: { bg: colors.bg.elevated, border: colors.border, fg: colors.text.secondary },
  brand: { bg: colors.primary.muted, border: colors.primary.DEFAULT, fg: colors.primary.DEFAULT },
  accent: { bg: colors.accent.soft, border: colors.accent.DEFAULT, fg: colors.accent.DEFAULT },
  danger: { bg: colors.dangerSoft, border: colors.danger, fg: colors.danger },
};

export function EmptyState({
  title,
  description,
  icon = 'dot',
  tone = 'neutral',
  action,
  secondaryAction,
  surface = false,
  compact = false,
  children,
  style,
}: Props) {
  const palette = TONES[tone];
  const frame = compact ? spacing['2xl'] + spacing.sm : spacing['3xl'] + spacing.lg;
  const glyph = compact ? spacing.lg + spacing.xs : spacing.xl + spacing.xs;

  const body = (
    <View
      style={[
        {
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: compact ? spacing.lg : spacing.xl,
          paddingHorizontal: spacing.lg,
        },
        style,
      ]}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          width: frame,
          height: frame,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          marginBottom: spacing.xs,
        }}
      >
        <Icon name={icon} size={glyph} color={palette.fg} />
      </View>

      <Text
        variant={compact ? 'subheading' : 'heading'}
        weight="bold"
        accessibilityRole="header"
        style={{ textAlign: 'center' }}
      >
        {title}
      </Text>

      {description ? (
        <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}

      {children}

      {action ? (
        <Button
          title={action.label}
          onPress={action.onPress}
          size={compact ? 'sm' : 'md'}
          style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}
          fullWidth
        />
      ) : null}

      {secondaryAction ? (
        <Button
          title={secondaryAction.label}
          onPress={secondaryAction.onPress}
          variant="ghost"
          size="sm"
          style={{ alignSelf: 'stretch' }}
          fullWidth
        />
      ) : null}
    </View>
  );

  if (!surface) return body;

  return (
    <Card variant="section" padding={0}>
      {body}
    </Card>
  );
}
