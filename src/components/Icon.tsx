import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

export type IconName =
  | 'robot'
  | 'dumbbell'
  | 'barbell'
  | 'muscle'
  | 'props'
  | 'respect'
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
  | 'scale'
  | 'swap'
  | 'instagram';

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
      // Font Awesome 6 solid "dumbbell" (viewBox 0 0 640 512) scaled into the
      // shared 0 0 24 24 box: scale 24/640 = 0.0375, centred vertically
      // (translateY = (24 - 512*0.0375)/2 = 2.4). Filled, keeps `color`.
      return (
        <G transform="translate(0 2.4) scale(0.0375)">
          <Path
            d="M96 64c0-17.7 14.3-32 32-32l32 0c17.7 0 32 14.3 32 32l0 160 0 64 0 160c0 17.7-14.3 32-32 32l-32 0c-17.7 0-32-14.3-32-32l0-64-32 0c-17.7 0-32-14.3-32-32l0-32c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l0-32c0-17.7 14.3-32 32-32l32 0 0-64zm448 0l0 64 32 0c17.7 0 32 14.3 32 32l0 32c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32l0 32c0 17.7-14.3 32-32 32l-32 0 0 64c0 17.7-14.3 32-32 32l-32 0c-17.7 0-32-14.3-32-32l0-160 0-64 0-160c0-17.7 14.3-32 32-32l32 0c17.7 0 32 14.3 32 32zM416 224l0 64-192 0 0-64 192 0z"
            fill={c}
          />
        </G>
      );

    case 'muscle':
      // Lucide biceps-flexed: brazo flexionado con bíceps marcado y puño.
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

    case 'props':
      // Dos puños chocando (fist bump). Vista lateral: cada puño es un
      // bloque rectangular con 3 nudillos al borde interno y un pulgar
      // marcado encima. Espacio central de 1px = contacto.
      return (
        <>
          {/* Puño izquierdo — silueta */}
          <Path
            d="M2.5 9.5 C 2.5 8.6 3.2 8 4 8 L 9.5 8 C 10.3 8 11 8.6 11 9.5 L 11 14.5 C 11 15.4 10.3 16 9.5 16 L 4 16 C 3.2 16 2.5 15.4 2.5 14.5 Z"
            fill={filled ? c : 'none'}
            stroke={c}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Pulgar izquierdo (sobresale arriba) */}
          <Path
            d="M4 8 L 4 6.8 C 4 6.3 4.4 6 4.9 6 L 6 6 C 6.5 6 6.8 6.4 6.8 6.8 L 6.8 8"
            fill={filled ? c : 'none'}
            stroke={c}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Nudillos izquierdos (3 líneas verticales internas) */}
          <Path
            d="M8.5 10 V 14 M 6.5 10 V 14 M 4.5 10 V 14"
            stroke={c}
            strokeWidth={1.3}
            strokeLinecap="round"
            opacity={filled ? 0.55 : 0.7}
          />

          {/* Puño derecho — silueta (espejo) */}
          <Path
            d="M21.5 9.5 C 21.5 8.6 20.8 8 20 8 L 14.5 8 C 13.7 8 13 8.6 13 9.5 L 13 14.5 C 13 15.4 13.7 16 14.5 16 L 20 16 C 20.8 16 21.5 15.4 21.5 14.5 Z"
            fill={filled ? c : 'none'}
            stroke={c}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Pulgar derecho */}
          <Path
            d="M17.2 8 L 17.2 6.8 C 17.2 6.3 17.5 6 18 6 L 19.1 6 C 19.6 6 20 6.3 20 6.8 L 20 8"
            fill={filled ? c : 'none'}
            stroke={c}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Nudillos derechos */}
          <Path
            d="M15.5 10 V 14 M 17.5 10 V 14 M 19.5 10 V 14"
            stroke={c}
            strokeWidth={1.3}
            strokeLinecap="round"
            opacity={filled ? 0.55 : 0.7}
          />

          {/* Impacto arriba */}
          <Path
            d="M9 4.5 L 9.8 6.5 M 12 3.5 V 5.8 M 15 4.5 L 14.2 6.5"
            stroke={c}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          {/* Polvo / vibración abajo */}
          <Path
            d="M9 18 V 19.6 M 12 18.5 V 20.4 M 15 18 V 19.6"
            stroke={c}
            strokeWidth={1.7}
            strokeLinecap="round"
            opacity={0.55}
          />
        </>
      );

    case 'respect':
      // Lucide handshake — apretón de manos clásico. Dos antebrazos
      // diagonales que se entrelazan en el centro.
      return (
        <>
          <Path
            d="m11 17 2 2a1 1 0 1 0 3-3"
            fill="none"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"
            fill={filled ? c : 'none'}
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="m21 3 1 11h-2"
            fill="none"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M3 3l8 8"
            fill="none"
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="m7 14 1.5 1.5"
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
      // Lucide flame — llama clásica.
      return (
        <Path
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          fill={filled ? c : 'none'}
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
      // Lucide heart — corazón clásico.
      return (
        <Path
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"
          fill={filled ? c : 'none'}
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
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

    case 'swap':
      // Lucide arrow-left-right — dos flechas opuestas.
      return (
        <Path
          d="M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"
          stroke={c}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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

    case 'instagram':
      // Instagram logo simplificado: rectángulo redondeado + círculo + punto de flash
      return (
        <>
          <Rect x="3" y="3" width="18" height="18" rx="5" stroke={c} strokeWidth={2} />
          <Circle cx="12" cy="12" r="4" stroke={c} strokeWidth={2} />
          <Circle cx="17.5" cy="6.5" r="1.2" fill={c} />
        </>
      );

    default:
      return null;
  }
}
