import type { ReactNode } from 'react';
import { View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

// Ilustración 2D con alfa: el lienzo se adapta a cada superficie sin placa ni fondo.
const GMO_MASCOT = require('../../assets/brand/gmo-mascot-2d.webp');

interface GmoMascotProps {
  size?: number;
  accessibilityLabel?: string;
  accessible?: boolean;
  style?: StyleProp<ImageStyle>;
}

export function GmoMascot({
  size = 152,
  accessibilityLabel = 'GMO, tu compañero de entrenamiento',
  accessible = true,
  style,
}: GmoMascotProps) {
  return (
    <Image
      source={GMO_MASCOT}
      contentFit="contain"
      accessible={accessible}
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      style={[{ width: size, height: size }, style]}
    />
  );
}

interface MascotStateProps {
  title: string;
  description: string;
  children?: ReactNode;
  mascotSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function MascotState({
  title,
  description,
  children,
  mascotSize = 152,
  style,
}: MascotStateProps) {
  return (
    <View style={[{ alignItems: 'center', gap: spacing.md }, style]}>
      <GmoMascot size={mascotSize} accessible={false} />
      <Text variant="heading" weight="bold" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
        {description}
      </Text>
      {children}
    </View>
  );
}
