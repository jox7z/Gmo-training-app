import { Image } from 'expo-image';
import {
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { RANK_IMAGES } from '@/theme/rankImages';
import { RANKS, radius, type RankId } from '@/theme/tokens';

interface Props {
  rankId: RankId;
  size?: number;
  halo?: boolean;
  accessibilityLabel?: string;
  accessible?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RankEmblem({
  rankId,
  size = 44,
  halo = true,
  accessibilityLabel,
  accessible = true,
  style,
}: Props) {
  const rank = RANKS.find((candidate) => candidate.id === rankId);
  if (!rank) return null;

  const dimension = Number.isFinite(size) && size > 0 ? size : 44;
  const haloDimension = dimension * 0.78;

  return (
    <View
      accessible={accessible}
      accessibilityRole="image"
      accessibilityLabel={
        accessible
          ? accessibilityLabel ?? `Emblema de rango ${rank.label}`
          : undefined
      }
      importantForAccessibility={accessible ? 'yes' : 'no-hide-descendants'}
      style={[
        {
          alignItems: 'center',
          height: dimension,
          justifyContent: 'center',
          width: dimension,
          shadowColor: rank.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: halo ? 0.58 : 0,
          shadowRadius: dimension * 0.16,
          elevation: halo ? Math.max(4, Math.round(dimension / 10)) : 0,
        },
        style,
      ]}
    >
      {halo ? (
        <View
          pointerEvents="none"
          style={{
            backgroundColor: rank.color,
            borderRadius: radius.full,
            height: haloDimension,
            opacity: 0.12,
            position: 'absolute',
            width: haloDimension,
          }}
        />
      ) : null}
      <Image
        accessible={false}
        source={RANK_IMAGES[rank.id]}
        style={{ height: dimension, width: dimension }}
        contentFit="contain"
      />
    </View>
  );
}
