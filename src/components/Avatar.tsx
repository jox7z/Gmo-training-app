import { View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/theme/tokens';
import { Text } from './ui/Text';

interface Props {
  uri?: string;
  name?: string;
  size?: number;
  bordered?: boolean;
  borderColor?: string;
  style?: ViewStyle;
  /** Clave estable para el reciclado de FlashList (ver FeedItem) — evita que
   * expo-image muestre brevemente el bitmap del avatar anterior en una fila
   * reciclada antes de que cargue la nueva uri. */
  recyclingKey?: string;
}

export function Avatar({ uri, name, size = 44, bordered = true, borderColor, style, recyclingKey }: Props) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const fontSize = Math.round(size * 0.42);
  const border = bordered
    ? { borderWidth: size >= 80 ? 3 : 2, borderColor: borderColor ?? colors.primary.DEFAULT }
    : null;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bg.elevated,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        border,
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={100}
          recyclingKey={recyclingKey}
        />
      ) : (
        <Text style={{ fontSize, color: colors.text.primary }} weight="black">
          {initial}
        </Text>
      )}
    </View>
  );
}
