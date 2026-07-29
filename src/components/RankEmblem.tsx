/**
 * RankEmblem — el crest de un rango, con su halo del color del metal.
 *
 * Fuente única del emblema: lo consumen `RankBadge` (a partir de puntos) y el
 * podio de GMUP (a partir de un `RankId` ya resuelto). No deriva nada: recibe
 * el rango y lo dibuja.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { RANK_IMAGES } from '@/theme/rankImages';
import { RANKS, type RankId } from '@/theme/tokens';

interface Props {
  rankId: RankId;
  /** Lado del crest en px. */
  size?: number;
  /**
   * `false` lo oculta al lector de pantalla. Úsalo cuando el contenedor ya
   * anuncia el rango (p. ej. la fila del podio).
   */
  accessible?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RankEmblem({ rankId, size = 44, accessible = true, style }: Props) {
  const rank = RANKS.find((r) => r.id === rankId) ?? RANKS[0];

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: rank.color,
          shadowOpacity: 0.6,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        },
        style,
      ]}
    >
      <Image
        source={RANK_IMAGES[rank.id]}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={150}
        accessible={accessible}
        accessibilityLabel={accessible ? `Rango ${rank.label}` : undefined}
      />
    </View>
  );
}
