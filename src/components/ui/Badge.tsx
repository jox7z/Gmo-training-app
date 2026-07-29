/**
 * Badge — etiqueta de estado. Un tono = un significado; el color nunca es el
 * único portador de información, siempre acompaña a un texto legible.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from './Text';
import { colors, radius, spacing } from '@/theme/tokens';

type Tone = 'brand' | 'accent' | 'info' | 'success' | 'muted' | 'danger' | 'warning';

interface Props {
  label: string;
  tone?: Tone;
  /** Refuerza el estado con un glifo, para no depender solo del color. */
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

const toneMap: Record<Tone, { bg: string; fg: string; border: string }> = {
  brand: { bg: colors.primary.muted, fg: colors.primary.DEFAULT, border: colors.borderEmber },
  accent: { bg: colors.accent.soft, fg: colors.accent.DEFAULT, border: colors.accent.soft },
  info: { bg: colors.info.soft, fg: colors.info.DEFAULT, border: colors.info.soft },
  success: { bg: colors.successSoft, fg: colors.success, border: colors.successSoft },
  muted: { bg: colors.bg.elevated, fg: colors.text.secondary, border: colors.border },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  warning: { bg: colors.warningSoft, fg: colors.warning, border: colors.warningSoft },
};

export function Badge({ label, tone = 'muted', icon, style }: Props) {
  const c = toneMap[tone];
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          backgroundColor: c.bg,
          borderWidth: 1,
          borderColor: c.border,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={spacing.md} color={c.fg} /> : null}
      <Text variant="label" style={{ color: c.fg }}>
        {label}
      </Text>
    </View>
  );
}
