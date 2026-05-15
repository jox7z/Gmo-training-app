import Svg, { Path, Circle, Rect } from 'react-native-svg';

export type IconName =
  | 'robot'
  | 'dumbbell'
  | 'barbell'
  | 'muscle'
  | 'close'
  | 'send'
  | 'chevron-right'
  | 'check'
  | 'dot'
  | 'fire'
  | 'trophy'
  | 'lightning'
  | 'target'
  | 'seedling'
  | 'medal'
  | 'clap'
  | 'chat';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color = '#FFFFFF' }: Props) {
  const c = color;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderIcon(name, c)}
    </Svg>
  );
}

function renderIcon(name: IconName, c: string) {
  switch (name) {
    case 'robot':
      return (
        <>
          <Rect x="4" y="9" width="16" height="12" rx="2" stroke={c} strokeWidth={2} />
          <Path d="M9 14.5h.01M15 14.5h.01" stroke={c} strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M9.5 18.5h5" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M12 9V5" stroke={c} strokeWidth={2} strokeLinecap="round" />
          <Circle cx="12" cy="3.5" r="1.5" fill={c} />
          <Path d="M4 13H2M22 13h-2" stroke={c} strokeWidth={2} strokeLinecap="round" />
        </>
      );

    case 'dumbbell':
    case 'barbell':
      return (
        <Path
          d="M6 12h12M2 9.5v5M5 10.5v3M19 10.5v3M22 9.5v5"
          stroke={c}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      );

    case 'muscle':
      return (
        <Path
          d="M7 13.5c0 2.8 2.2 5.5 5 5.5s5-2.7 5-5.5c0-1.5-.6-3-1.8-4.5L14 8c-.4-1.3-2-3-2-3s-1.6 1.7-2 3l-1.2 1c-1.2 1.5-1.8 3-1.8 4.5z"
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'close':
      return (
        <Path
          d="M18 6L6 18M6 6l12 12"
          stroke={c}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      );

    case 'send':
      return (
        <Path
          d="M12 19V5M5 12l7-7 7 7"
          stroke={c}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'chevron-right':
      return (
        <Path
          d="M9 18l6-6-6-6"
          stroke={c}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'check':
      return (
        <Path
          d="M5 13l4 4L19 7"
          stroke={c}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'dot':
      return <Circle cx="12" cy="12" r="4" fill={c} />;

    case 'fire':
      return (
        <>
          <Path
            d="M12 2c-1 4-4 6-4 10a4 4 0 008 0C16 8 13 6 12 2z"
            stroke={c}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M12 6c-.5 2.5-2 4-2 6a2 2 0 004 0C14 10 12.5 8.5 12 6z"
            stroke={c}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
          />
        </>
      );

    case 'trophy':
      return (
        <>
          <Path
            d="M6 2h12v8a6 6 0 01-12 0V2z"
            stroke={c}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Path
            d="M4 6H2a2 2 0 002 2M20 6h2a2 2 0 01-2 2M12 16v3M8 22h8"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      );

    case 'lightning':
      return (
        <Path
          d="M13 2L4.5 13H12l-1 9 8.5-12H12l1-8z"
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'target':
      return (
        <>
          <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth={2} />
          <Circle cx="12" cy="12" r="4.5" stroke={c} strokeWidth={2} />
          <Circle cx="12" cy="12" r="1.5" fill={c} />
        </>
      );

    case 'seedling':
      return (
        <>
          <Path d="M12 22V12" stroke={c} strokeWidth={2} strokeLinecap="round" />
          <Path
            d="M12 12C10 9 6 9 5 12s3 7 7 0"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M12 16c2-4 6-4 7-1s-3 7-7 1"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      );

    case 'medal':
      return (
        <>
          <Path
            d="M8 3l4 8 4-8"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="15" r="6" stroke={c} strokeWidth={2} />
          <Circle cx="12" cy="15" r="2" fill={c} />
        </>
      );

    case 'clap':
      return (
        <>
          <Path
            d="M12 3v3M6 6l2 2M18 6l-2 2M4 12h2M18 12h2"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M9 13v-2a1 1 0 012 0v2M13 13v-2a1 1 0 012 0v2M8 13h8v3a4 4 0 01-8 0v-3z"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );

    case 'chat':
      return (
        <Path
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v10a1 1 0 01-1 1H10l-4 4v-4H5a1 1 0 01-1-1V5z"
          stroke={c}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      );

    default:
      return null;
  }
}
