import { View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/theme/tokens';
import { Text } from './ui/Text';

interface Props {
  uri?: string;
  name?: string;
  size?: number;
  bordered?: boolean;
  borderColor?: string;
  style?: ViewStyle;
}

export function Avatar({ uri, name, size = 44, bordered = true, borderColor, style }: Props) {
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
        />
      ) : (
        <Text style={{ fontSize, color: colors.text.primary }} weight="black">
          {initial}
        </Text>
      )}
    </View>
  );
}
