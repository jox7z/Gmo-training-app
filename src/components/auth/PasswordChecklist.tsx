import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { checkPassword } from '@/lib/passwordPolicy';

interface Props {
  password: string;
}

export function PasswordChecklist({ password }: Props) {
  const checks = checkPassword(password);

  return (
    <View style={{ marginTop: spacing.sm, gap: 4 }}>
      {checks.map(({ rule, passed }) => (
        <View
          key={rule.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          {passed ? <CheckIcon /> : <DotIcon />}
          <Text
            variant="caption"
            style={{ color: passed ? colors.success : colors.text.muted }}
          >
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={11} fill={colors.success} fillOpacity={0.18} />
      <Path
        d="M7 12.5l3.5 3.5L17 9"
        stroke={colors.success}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DotIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4} fill={colors.text.muted} fillOpacity={0.6} />
    </Svg>
  );
}
