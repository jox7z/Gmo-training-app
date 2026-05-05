import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

type Name = 'home' | 'routines' | 'train' | 'feed' | 'profile';

interface Props {
  name: Name;
  color: string;
  focused: boolean;
}

export function TabIcon({ name, color, focused }: Props) {
  if (name === 'train') {
    return (
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary.DEFAULT,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -18,
          shadowColor: colors.primary.DEFAULT,
          shadowOpacity: 0.7,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 12,
          borderWidth: 4,
          borderColor: colors.bg.base,
        }}
      >
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 6 L18 18 M6 18 L18 6"
            stroke="#fff"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Path d="M3 9 V15 M21 9 V15" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
        </Svg>
      </View>
    );
  }

  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      {iconPath(name, color)}
    </Svg>
  );
}

function iconPath(name: Name, color: string) {
  const stroke = color || colors.text.muted;
  switch (name) {
    case 'home':
      return (
        <Path
          d="M3 11 L12 3 L21 11 V20 a2 2 0 0 1 -2 2 H15 V14 H9 V22 H5 a2 2 0 0 1 -2 -2 Z"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      );
    case 'routines':
      return (
        <>
          <Path
            d="M4 4 H20 V20 H4 Z"
            stroke={stroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Path d="M4 9 H20 M9 4 V20" stroke={stroke} strokeWidth={2} />
        </>
      );
    case 'feed':
      return (
        <>
          <Circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={2} />
          <Path d="M3 12 H21 M12 3 a14 14 0 0 1 0 18 a14 14 0 0 1 0 -18" stroke={stroke} strokeWidth={2} />
        </>
      );
    case 'profile':
      return (
        <>
          <Circle cx={12} cy={8} r={4} stroke={stroke} strokeWidth={2} />
          <Path d="M4 21 a8 8 0 0 1 16 0" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}
