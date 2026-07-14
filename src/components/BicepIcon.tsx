/**
 * BicepIcon — icono de bíceps flexionado en SVG.
 * Sustituye el emoji de reacción en el feed.
 */

import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface Props {
  size?: number;
  color?: string;
}

// Los stroke="#000000" del contorno interno son parte del arte del SVG
// (línea negra fija que define la silueta), no un color de tema — excepción a tokens.
export function BicepIcon({ size = 24, color = colors.accent.DEFAULT }: Props) {
  return (
    <Svg
      viewBox="0 0 72 72"
      width={size}
      height={size}
      fill="none"
    >
      {/* Relleno naranja — silueta del brazo */}
      <Path
        fill={color}
        d="M63.1103,54.1648c-10.9692,9.4397-26.3611,11.6803-46.4096,11.5634c0,0-3.7408,1.1495-4.5981-3.5655
          c0,0-0.7696-20.8863,3.809-35.5476c0,0-0.1948-5.9814,0.0293-9.8976c0.0389-0.6722,0.3312-1.2957,0.828-1.7535
          c5.7574-5.319,8.3487-6.0983,8.3487-6.0983l8.3682-1.4808c1.3249,0.906,4.2279,4.1792,3.7505,9.995l0.1071-0.3994l3.2148,0.9012
          c1.1226,0.3416,1.8585,1.525,1.8412,2.6546c-0.0098,1.169-2.8056,2.0457-2.8056,2.0457c-6.1178,1.3834-6.1178,1.3834-6.1178,1.3834
          c-1.8314,2.8738-5.5937,3.1758-7.279,3.0979c-0.0877-0.2435-0.5927-0.0195-0.1933,0c0.5942,1.5002,1.2893,5.1144,1.9225,11.807
          l0.1753,1.8606c0.0487,0.5261,0.3166,4.7286,0.3847,7.4757c1.812-4.413,6.6361-12.5609,15.7348-13.8468
          c13.4631-1.9192,20.1654,8.4948,20.1654,8.4948s0.2338,0.2728,0.526,0.7696C66.9778,47.0728,66.1595,51.5345,63.1103,54.1648z"
      />
      {/* Contorno principal */}
      <Path
        fill="none"
        stroke="#000000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M27.7195,50.6312c0,0,2.8688-14.4737,16.3682-16.3928s20.2138,8.5143,20.2138,8.5143s0.2302,0.2755,0.5269,0.7704
          c2.0724,3.4564,1.2505,7.9342-1.8035,10.5637C52.0326,63.551,36.5991,65.7993,16.5066,65.6836c0,0-3.7502,1.1456-4.6096-3.574
          c0,0-0.7689-20.9388,3.8178-35.6261c0,0-0.1965-6.0013,0.0307-9.9287c0.0388-0.67,0.3337-1.2971,0.827-1.7521
          c5.7789-5.3313,8.3742-6.1149,8.3742-6.1149l8.3881-1.4838c1.436,0.9837,4.7256,4.7388,3.5707,11.4953"
      />
      {/* Línea del torso inferior */}
      <Path
        fill="none"
        stroke="#000000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M34.5031,53.0878c0,0,10.8019,2.7012,19.2868-4.3269"
      />
      {/* Línea del antebrazo */}
      <Path
        fill="none"
        stroke="#000000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M27.4684,40.5519c-0.4282-4.2794-1.1326-12.7197-1.9548-13.7543c0,0,5.2009,1.1102,7.8117-2.9736"
      />
    </Svg>
  );
}
