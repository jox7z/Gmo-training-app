import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';

type Name = 'home' | 'routines' | 'feed' | 'profile' | 'progress' | 'gmup';

interface Props {
  name: Name;
  color: string;
  focused: boolean;
}

export function TabIcon({ name, color, focused }: Props) {
  return (
    <Svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      fill="none"
      // El trazo engrosa en la pestaña activa: el estado no depende solo del color.
      strokeWidth={focused ? 2.4 : 1.8}
    >
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
    case 'progress':
      return (
        <Path
          d="M3 20 H21 M6 16 V8 M11 16 V4 M16 16 V10 M21 16 V13"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'profile':
      return (
        <>
          <Circle cx={12} cy={8} r={4} stroke={stroke} strokeWidth={2} />
          <Path d="M4 21 a8 8 0 0 1 16 0" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case 'gmup':
      // Grupo: dos siluetas: el hub social ("team up").
      return (
        <>
          <Circle cx={9} cy={8} r={3.5} stroke={stroke} strokeWidth={2} />
          <Path d="M2.5 20 a6.5 6.5 0 0 1 13 0" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
          <Path d="M16 5.2 a3.5 3.5 0 0 1 0 6.6" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
          <Path d="M17.5 14.4 A6.5 6.5 0 0 1 21.5 20" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}
