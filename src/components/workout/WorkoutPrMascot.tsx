import { Image, type ImageSourcePropType, View } from 'react-native';

import { GmoMascot } from '@/components/GmoMascot';

interface WorkoutPrMascotProps {
  source?: ImageSourcePropType;
  size?: number;
}

/** GMO estático para el resumen de un nuevo récord personal. */
export function WorkoutPrMascot({ source, size = 152 }: WorkoutPrMascotProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="GMO celebra tu nuevo récord personal"
      style={{ width: size, height: size }}
    >
      {source ? (
        <Image source={source} accessibilityIgnoresInvertColors style={{ width: size, height: size }} />
      ) : (
        <GmoMascot size={size} accessible={false} />
      )}
    </View>
  );
}
