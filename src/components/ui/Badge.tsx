import { View } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from '@/theme/tokens';

type Tone = 'brand' | 'accent' | 'info' | 'success' | 'muted' | 'danger';

interface Props {
  label: string;
  tone?: Tone;
}

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: colors.primary.muted, fg: colors.primary.DEFAULT },
  accent: { bg: colors.accent.soft, fg: colors.accent.DEFAULT },
  info: { bg: colors.info.soft, fg: colors.info.DEFAULT },
  success: { bg: 'rgba(34,197,94,0.15)', fg: colors.success },
  muted: { bg: colors.bg.elevated, fg: colors.text.secondary },
  danger: { bg: 'rgba(239,68,68,0.15)', fg: colors.danger },
};

export function Badge({ label, tone = 'muted' }: Props) {
  const c = toneMap[tone];
  return (
    <View
      style={{
        backgroundColor: c.bg,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: radius.full,
        alignSelf: 'flex-start',
      }}
    >
      <Text variant="label" style={{ color: c.fg, fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
}
