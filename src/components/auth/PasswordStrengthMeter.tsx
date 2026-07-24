import { View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { passwordScore, scoreLabel } from '@/lib/passwordPolicy';

interface Props {
  password: string;
}

const SCORE_COLORS = [
  colors.danger,    // 0 - muy débil
  colors.danger,    // 1 - débil
  colors.warning,   // 2 - aceptable
  colors.info.DEFAULT,    // 3 - buena
  colors.success,   // 4 - excelente
];

export function PasswordStrengthMeter({ password }: Props) {
  const score = passwordScore(password);
  const segments = 4;
  // Render N filled segments based on score (1 to 4)
  const filled = score;
  const color = SCORE_COLORS[score];

  return (
    <View style={{ marginTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: radius.full,
              backgroundColor: i < filled ? color : colors.bg.card,
            }}
          />
        ))}
      </View>
      {password.length > 0 && (
        <Text variant="caption" style={{ color, marginTop: 4 }}>
          {scoreLabel(score)}
        </Text>
      )}
    </View>
  );
}
