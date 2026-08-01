import { Image, type ImageSourcePropType, type StyleProp, View, type ViewStyle } from 'react-native';

import { GmoMascot } from '@/components/GmoMascot';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

interface RestMascotCoachProps {
  phrase?: string;
  mascotSize?: number;
  mascotSource?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_PHRASE = 'Respira. La siguiente serie es tuya.';

/** Refuerzo visual estático durante el descanso. */
export function RestMascotCoach({
  phrase = DEFAULT_PHRASE,
  mascotSize = 104,
  mascotSource,
  style,
}: RestMascotCoachProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`GMO te anima: ${phrase}`}
      style={[{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }, style]}
    >
      {mascotSource ? (
        <Image
          source={mascotSource}
          accessibilityIgnoresInvertColors
          style={{ width: mascotSize, height: mascotSize }}
        />
      ) : (
        <GmoMascot size={mascotSize} accessible={false} />
      )}
      <Text variant="body" weight="semibold" tone="secondary" style={{ maxWidth: 280, textAlign: 'center' }}>
        {phrase}
      </Text>
    </View>
  );
}
