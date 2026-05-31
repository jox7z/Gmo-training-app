import Svg, { Path, Circle, Rect } from 'react-native-svg';

export type IconName =
  | 'robot'
  | 'dumbbell'
  | 'barbell'
  | 'muscle'
  | 'close'
  | 'send'
  | 'chevron-right'
  | 'chevron-left'
  | 'check'
  | 'dot'
  | 'fire'
  | 'trophy'
  | 'lightning'
  | 'target'
  | 'seedling'
  | 'medal'
  | 'clap'
  | 'chat'
  | 'settings'
  | 'camera'
  | 'edit'
  | 'lock'
  | 'map-pin'
  | 'bell'
  | 'users'
  | 'share'
  | 'image'
  | 'globe'
  | 'eye'
  | 'eye-off'
  | 'plus'
  | 'logout'
  | 'heart'
  | 'calendar'
  | 'clock'
  | 'route'
  | 'chart'
  | 'search'
  | 'scale';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  /** Si true, rellena el path del ícono (usado en reacciones activas: heart/muscle). */
  filled?: boolean;
}

export function Icon({ name, size = 24, color = '#FFFFFF', filled = false }: Props) {
  const c = color;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderIcon(name, c, filled)}
    </Svg>
  );
}

function renderIcon(name: IconName, c: string, filled = false) {
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
      // Flexed bicep (Lucide "biceps-flexed"). El path anterior parecía
      // una llama; este es un brazo flexionado reconocible.
      return (
        <>
          <Path
            d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 4.4 2c1.42 0 2.108 5.06 2.471 7.957"
            fill={filled ? c : 'none'}
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M15 14a5 5 0 0 0-7.584 2"
            fill="none"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9.964 6.825C8.019 7.977 9.5 13 8 15"
            fill="none"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
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

    case 'settings':
      return (
        <>
          <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={2} />
          <Path
            d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"
            stroke={c}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </>
      );

    case 'chevron-left':
      return (
        <Path
          d="M15 18l-6-6 6-6"
          stroke={c}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'camera':
      return (
        <>
          <Path
            d="M3 8a2 2 0 012-2h2l1.5-2h7L17 6h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
            stroke={c}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="13" r="3.5" stroke={c} strokeWidth={2} />
        </>
      );

    case 'edit':
      return (
        <Path
          d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'lock':
      return (
        <>
          <Rect x="4" y="11" width="16" height="10" rx="2" stroke={c} strokeWidth={2} />
          <Path
            d="M8 11V7a4 4 0 018 0v4"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      );

    case 'map-pin':
      return (
        <>
          <Path
            d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"
            stroke={c}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="10" r="2.5" stroke={c} strokeWidth={2} />
        </>
      );

    case 'bell':
      return (
        <Path
          d="M6 16V10a6 6 0 1112 0v6l2 2H4l2-2zM10 20a2 2 0 004 0"
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'users':
      return (
        <>
          <Circle cx="9" cy="8" r="3.5" stroke={c} strokeWidth={2} />
          <Path
            d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M16 4a3.5 3.5 0 010 7M17 14c2.8.5 5 2.8 5 6"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      );

    case 'share':
      return (
        <>
          <Circle cx="18" cy="5" r="3" stroke={c} strokeWidth={2} />
          <Circle cx="6" cy="12" r="3" stroke={c} strokeWidth={2} />
          <Circle cx="18" cy="19" r="3" stroke={c} strokeWidth={2} />
          <Path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" stroke={c} strokeWidth={2} strokeLinecap="round" />
        </>
      );

    case 'image':
      return (
        <>
          <Rect x="3" y="4" width="18" height="16" rx="2" stroke={c} strokeWidth={2} />
          <Circle cx="9" cy="10" r="1.5" fill={c} />
          <Path d="M21 17l-6-6-9 9" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );

    case 'globe':
      return (
        <>
          <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth={2} />
          <Path
            d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      );

    case 'eye':
      return (
        <>
          <Path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
            stroke={c}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={2} />
        </>
      );

    case 'eye-off':
      return (
        <Path
          d="M3 3l18 18M10.6 6.2A9.6 9.6 0 0112 6c6.5 0 10 6 10 6a16 16 0 01-3.3 3.9M6.6 6.6A16 16 0 002 12s3.5 6 10 6c1.5 0 2.9-.3 4-.8M9.9 9.9a3 3 0 004.2 4.2"
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
        />
      );

    case 'plus':
      return (
        <Path
          d="M12 5v14M5 12h14"
          stroke={c}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      );

    case 'logout':
      return (
        <Path
          d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'heart':
      return (
        <Path
          d="M12 21s-7-4.5-9.3-9.2A5 5 0 0112 6a5 5 0 019.3 5.8C19 16.5 12 21 12 21z"
          fill={filled ? c : 'none'}
          stroke={c}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      );

    case 'calendar':
      return (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="2" stroke={c} strokeWidth={2} />
          <Path
            d="M3 10h18M8 3v4M16 3v4"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      );

    case 'clock':
      return (
        <>
          <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth={2} />
          <Path d="M12 7v5l3 2" stroke={c} strokeWidth={2} strokeLinecap="round" />
        </>
      );

    case 'route':
      return (
        <Path
          d="M6 4v12a4 4 0 008 0V8a4 4 0 018 0v12M6 4l-2 2M6 4l2 2M18 20l-2-2M18 20l2-2"
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'chart':
      return (
        <Path
          d="M3 20h18M6 16V8M11 16V4M16 16v-6M21 16v-3"
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case 'search':
      return (
        <>
          <Circle cx="11" cy="11" r="7" stroke={c} strokeWidth={2} />
          <Path d="M20 20l-3.5-3.5" stroke={c} strokeWidth={2} strokeLinecap="round" />
        </>
      );

    case 'scale':
      return (
        <>
          <Rect x="3" y="6" width="18" height="14" rx="2" stroke={c} strokeWidth={2} />
          <Path
            d="M8 10h8M12 10v3"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx="12" cy="15" r="2" stroke={c} strokeWidth={2} />
        </>
      );

    default:
      return null;
  }
}
