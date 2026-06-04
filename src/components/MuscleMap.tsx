/**
 * MuscleMap — silueta estilizada de cuerpo completo coloreable por grupo muscular.
 * Dos vistas: 'front' y 'back'. Cada grupo muscular es un path SVG posicionado
 * anatómicamente. Los pares izquierda/derecha comparten el mismo color.
 *
 * ViewBox fijo: "0 0 200 400". Prop `size` escala el ancho manteniendo aspect ratio.
 */
import Svg, { Path, G } from 'react-native-svg';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type MuscleKey =
  | 'chest'
  | 'back'
  | 'front_delt'
  | 'lateral_delt'
  | 'rear_delt'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

interface Props {
  view: 'front' | 'back';
  colors: Partial<Record<MuscleKey, string>>;
  /** Ancho en px; la altura se calcula automáticamente (aspect ratio 200:400). */
  size?: number;
}

// ─── Constantes visuales ────────────────────────────────────────────────────

const BASE_FILL = 'rgba(255,255,255,0.07)';
const STROKE = 'rgba(255,255,255,0.18)';
const STROKE_WIDTH = 1.2;
const BODY_FILL = 'rgba(255,255,255,0.04)';
const BODY_STROKE = 'rgba(255,255,255,0.12)';

// ─── Paths de la silueta base (cabeza + cuello + torso + brazos + piernas) ──
// Dibujados sobre un viewBox 0 0 200 400.
// Son constantes de módulo para no recrearlos en cada render.

const HEAD_PATH = 'M100 10 C87 10 78 20 78 33 C78 46 87 56 100 56 C113 56 122 46 122 33 C122 20 113 10 100 10 Z';
const NECK_PATH = 'M91 55 L91 70 L109 70 L109 55 Z';
const TORSO_PATH = 'M70 70 C60 72 52 80 50 95 L46 155 C44 168 50 178 62 180 L80 182 L80 220 L120 220 L120 182 L138 180 C150 178 156 168 154 155 L150 95 C148 80 140 72 130 70 Z';

// Brazos (izquierdo = lado derecho del viewer, derecho = lado izquierdo del viewer)
// Brazo izquierdo (left arm en la silueta)
const LEFT_ARM_PATH = 'M50 95 C42 98 36 106 34 116 L28 150 C26 160 30 168 38 170 L46 172 L52 140 L54 110 Z';
// Brazo derecho (right arm en la silueta)
const RIGHT_ARM_PATH = 'M150 95 C158 98 164 106 166 116 L172 150 C174 160 170 168 162 170 L154 172 L148 140 L146 110 Z';

// Antebrazo izquierdo
const LEFT_FOREARM_PATH = 'M38 170 L34 202 C33 210 36 216 42 218 L48 220 L52 190 L46 172 Z';
// Antebrazo derecho
const RIGHT_FOREARM_PATH = 'M162 170 L166 202 C167 210 164 216 158 218 L152 220 L148 190 L154 172 Z';

// Piernas
const LEFT_LEG_PATH = 'M80 220 L74 310 C72 324 76 334 84 338 L96 342 L98 310 L96 220 Z';
const RIGHT_LEG_PATH = 'M120 220 L126 310 C128 324 124 334 116 338 L104 342 L102 310 L104 220 Z';

// Pantorrillas (debajo de la rodilla ~295)
const LEFT_CALF_PATH = 'M84 295 L78 355 C76 366 82 374 90 374 L98 375 L100 348 L96 290 Z';
const RIGHT_CALF_PATH = 'M116 295 L122 355 C124 366 118 374 110 374 L102 375 L100 348 L104 290 Z';

// ─── Paths de grupos musculares (FRENTE) ───────────────────────────────────

// Pecho: dos bloques redondeados simétricos en el torso superior
const CHEST_LEFT = 'M72 80 C66 82 62 88 62 96 L64 116 C65 122 70 126 76 124 L95 120 L95 88 C90 80 80 78 72 80 Z';
const CHEST_RIGHT = 'M128 80 C134 82 138 88 138 96 L136 116 C135 122 130 126 124 124 L105 120 L105 88 C110 80 120 78 128 80 Z';

// Hombro frontal (anterior): bloque en la parte superior del deltoides
const FRONT_DELT_LEFT = 'M54 90 C50 92 46 98 46 106 L50 116 L58 114 L62 100 L60 90 Z';
const FRONT_DELT_RIGHT = 'M146 90 C150 92 154 98 154 106 L150 116 L142 114 L138 100 L140 90 Z';

// Hombro lateral: bloque lateral del hombro
const LATERAL_DELT_LEFT = 'M44 106 C40 110 38 118 40 126 L44 134 L52 130 L54 116 L50 108 Z';
const LATERAL_DELT_RIGHT = 'M156 106 C160 110 162 118 160 126 L156 134 L148 130 L146 116 L150 108 Z';

// Bíceps: bloque anterior del brazo superior
const BICEPS_LEFT = 'M42 128 C38 132 36 140 38 148 L42 160 L50 158 L52 142 L48 130 Z';
const BICEPS_RIGHT = 'M158 128 C162 132 164 140 162 148 L158 160 L150 158 L148 142 L152 130 Z';

// Core / abdomen: bloque central del torso inferior
const CORE_PATH = 'M80 126 C76 128 74 134 74 142 L74 172 C74 178 78 182 84 182 L116 182 C122 182 126 178 126 172 L126 142 C126 134 124 128 120 126 Z';

// Cuádriceps: parte anterior del muslo
const QUADS_LEFT = 'M80 224 L76 290 C75 298 80 304 88 304 L96 304 L98 234 L94 222 Z';
const QUADS_RIGHT = 'M120 224 L124 290 C125 298 120 304 112 304 L104 304 L102 234 L106 222 Z';

// ─── Paths de grupos musculares (ESPALDA) ──────────────────────────────────

// Espalda (trapecio + dorsales): bloque posterior del torso
const BACK_UPPER_LEFT = 'M72 78 C65 80 60 88 60 98 L62 122 C64 130 70 134 78 132 L95 128 L95 86 C90 78 80 76 72 78 Z';
const BACK_UPPER_RIGHT = 'M128 78 C135 80 140 88 140 98 L138 122 C136 130 130 134 122 132 L105 128 L105 86 C110 78 120 76 128 78 Z';
const BACK_LOWER = 'M78 132 L80 182 L120 182 L122 132 L105 128 L95 128 Z';

// Hombro posterior (rear delt)
const REAR_DELT_LEFT = 'M44 90 C40 94 38 102 40 110 L44 120 L52 118 L56 106 L54 92 Z';
const REAR_DELT_RIGHT = 'M156 90 C160 94 162 102 160 110 L156 120 L148 118 L144 106 L146 92 Z';

// Tríceps: parte posterior del brazo superior
const TRICEPS_LEFT = 'M40 116 C36 120 34 130 36 140 L40 152 L48 150 L50 134 L46 118 Z';
const TRICEPS_RIGHT = 'M160 116 C164 120 166 130 164 140 L160 152 L152 150 L150 134 L154 118 Z';

// Glúteos: bloque posterior de la cadera
const GLUTES_LEFT = 'M80 186 L76 226 C74 234 78 240 86 240 L96 240 L98 220 L96 184 Z';
const GLUTES_RIGHT = 'M120 186 L124 226 C126 234 122 240 114 240 L104 240 L102 220 L104 184 Z';

// Isquiotibiales: parte posterior del muslo
const HAMSTRINGS_LEFT = 'M80 240 L76 295 C75 302 80 308 88 308 L96 308 L98 244 L94 238 Z';
const HAMSTRINGS_RIGHT = 'M120 240 L124 295 C125 302 120 308 112 308 L104 308 L102 244 L106 238 Z';

// Gemelos (espalda) — iguales para front y back ya que son visibles en ambas
const CALF_BACK_LEFT = 'M82 298 L78 356 C76 366 82 374 90 374 L98 375 L100 348 L96 294 Z';
const CALF_BACK_RIGHT = 'M118 298 L122 356 C124 366 118 374 110 374 L102 375 L100 348 L104 294 Z';

// ─── Componente ─────────────────────────────────────────────────────────────

const VB_W = 200;
const VB_H = 400;

export function MuscleMap({ view, colors: muscleColors, size = 180 }: Props) {
  const height = (size / VB_W) * VB_H;

  const fill = (key: MuscleKey) => muscleColors[key] ?? BASE_FILL;

  const muscleProps = (key: MuscleKey) => ({
    fill: fill(key),
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {/* ── Silueta base ── */}
      <Path d={HEAD_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={NECK_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={TORSO_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={LEFT_ARM_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={RIGHT_ARM_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={LEFT_FOREARM_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={RIGHT_FOREARM_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={LEFT_LEG_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={RIGHT_LEG_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={LEFT_CALF_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />
      <Path d={RIGHT_CALF_PATH} fill={BODY_FILL} stroke={BODY_STROKE} strokeWidth={1} />

      {view === 'front' ? (
        <G>
          {/* Pecho */}
          <Path d={CHEST_LEFT} {...muscleProps('chest')} />
          <Path d={CHEST_RIGHT} {...muscleProps('chest')} />
          {/* Hombro frontal */}
          <Path d={FRONT_DELT_LEFT} {...muscleProps('front_delt')} />
          <Path d={FRONT_DELT_RIGHT} {...muscleProps('front_delt')} />
          {/* Hombro lateral */}
          <Path d={LATERAL_DELT_LEFT} {...muscleProps('lateral_delt')} />
          <Path d={LATERAL_DELT_RIGHT} {...muscleProps('lateral_delt')} />
          {/* Bíceps */}
          <Path d={BICEPS_LEFT} {...muscleProps('biceps')} />
          <Path d={BICEPS_RIGHT} {...muscleProps('biceps')} />
          {/* Core */}
          <Path d={CORE_PATH} {...muscleProps('core')} />
          {/* Cuádriceps */}
          <Path d={QUADS_LEFT} {...muscleProps('quads')} />
          <Path d={QUADS_RIGHT} {...muscleProps('quads')} />
          {/* Gemelos */}
          <Path d={LEFT_CALF_PATH} {...muscleProps('calves')} />
          <Path d={RIGHT_CALF_PATH} {...muscleProps('calves')} />
        </G>
      ) : (
        <G>
          {/* Espalda */}
          <Path d={BACK_UPPER_LEFT} {...muscleProps('back')} />
          <Path d={BACK_UPPER_RIGHT} {...muscleProps('back')} />
          <Path d={BACK_LOWER} {...muscleProps('back')} />
          {/* Hombro posterior */}
          <Path d={REAR_DELT_LEFT} {...muscleProps('rear_delt')} />
          <Path d={REAR_DELT_RIGHT} {...muscleProps('rear_delt')} />
          {/* Hombro lateral */}
          <Path d={LATERAL_DELT_LEFT} {...muscleProps('lateral_delt')} />
          <Path d={LATERAL_DELT_RIGHT} {...muscleProps('lateral_delt')} />
          {/* Tríceps */}
          <Path d={TRICEPS_LEFT} {...muscleProps('triceps')} />
          <Path d={TRICEPS_RIGHT} {...muscleProps('triceps')} />
          {/* Glúteos */}
          <Path d={GLUTES_LEFT} {...muscleProps('glutes')} />
          <Path d={GLUTES_RIGHT} {...muscleProps('glutes')} />
          {/* Isquiotibiales */}
          <Path d={HAMSTRINGS_LEFT} {...muscleProps('hamstrings')} />
          <Path d={HAMSTRINGS_RIGHT} {...muscleProps('hamstrings')} />
          {/* Gemelos (espalda) */}
          <Path d={CALF_BACK_LEFT} {...muscleProps('calves')} />
          <Path d={CALF_BACK_RIGHT} {...muscleProps('calves')} />
        </G>
      )}
    </Svg>
  );
}
