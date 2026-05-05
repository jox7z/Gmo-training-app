import { View } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: number; isPositive?: boolean };
  tone?: 'default' | 'brand' | 'accent' | 'info';
}

export function Stat({ label, value, unit, delta, tone = 'default' }: Props) {
  const valueTone = tone === 'brand' ? 'brand' : tone === 'accent' ? 'accent' : tone === 'info' ? 'info' : 'primary';
  return (
    <View>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <Text variant="metric" tone={valueTone} numeric>
          {value}
        </Text>
        {unit && (
          <Text variant="body" tone="secondary" style={{ marginLeft: 4 }}>
            {unit}
          </Text>
        )}
      </View>
      {delta !== undefined && (
        <Text
          variant="caption"
          tone={delta.isPositive ? 'success' : 'danger'}
          style={{ marginTop: 2 }}
        >
          {delta.isPositive ? '▲' : '▼'} {Math.abs(delta.value)}%
        </Text>
      )}
    </View>
  );
}
