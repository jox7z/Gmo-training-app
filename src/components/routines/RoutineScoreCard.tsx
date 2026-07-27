/**
 * RoutineScoreCard — card "compacto expandible" del Score de optimización de una rutina.
 *
 * Presentación pura: recibe un `RoutineScore` ya calculado con
 * `computeRoutineScore(routine, profile)` y no consulta stores ni Supabase.
 * Se comparte entre la pestaña Rutina (`app/(tabs)/routines.tsx`, score de la
 * rutina guardada) y el editor (`app/routine/[id].tsx`, score en vivo del
 * borrador en memoria) para que ambos muestren exactamente lo mismo.
 *
 * Colapsado (default): anillo SVG animado + 1 línea de resumen
 * ("Buena rutina · falta trabajar Pecho"). Un tap en la fila expande el
 * desglose completo (5 métricas con icono, barra y valor + grupos más
 * débiles). La transición la resuelve `LinearTransition` sobre el contenido
 * interno de la Card — no hay medición manual de alturas ni `onLayout`.
 *
 * El anillo es un arco SVG real (mismo idioma visual que `StreakRing` /
 * `RestRing`), no un borde decorativo: su `strokeDashoffset` se anima con
 * Reanimated 4 en cada cambio de `score.score`, así que en el editor el
 * usuario ve el anillo llenarse/vaciarse al agregar o quitar un ejercicio.
 *
 * Default por pantalla (vía `defaultExpanded`):
 * - `routines.tsx` (resumen de la rutina activa) monta `defaultExpanded`: es
 *   la pantalla de análisis, no compite con nada urgente arriba y el usuario
 *   llega ahí específicamente a leer el estado de su rutina.
 * - `routine/[id].tsx` (editor) monta colapsado (default): el score vive
 *   arriba de la lista de ejercicios que hay que scrollear para editar, así
 *   que por defecto ocupa lo mínimo — una fila — y el detalle queda a un tap.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import { MUSCLE_LABELS, type RoutineScore } from '@/lib/optimizationScore';

interface Props {
  score: RoutineScore;
  /** Estilo del contenedor (márgenes propios de cada pantalla). */
  style?: StyleProp<ViewStyle>;
  /**
   * Estado inicial del desglose. `false` (default) = colapsado — pensado
   * para el editor, que no debe estorbar el scroll de ejercicios. La
   * pantalla de resumen monta con `defaultExpanded` (ver cabecera del
   * archivo). Solo afecta el render inicial: el usuario puede alternar
   * libremente con un tap sin importar de qué pantalla vino.
   */
  defaultExpanded?: boolean;
}

const BREAKDOWN_KEYS = ['coverage', 'balance', 'volume', 'frequency', 'separation'] as const;

const BREAKDOWN_LABELS: Record<(typeof BREAKDOWN_KEYS)[number], string> = {
  coverage: 'Cobertura',
  balance: 'Balance',
  volume: 'Volumen',
  frequency: 'Frecuencia',
  separation: 'Separación',
};

/**
 * Un icono por métrica: ancla cada dimensión a un símbolo reconocible en vez
 * de obligar a comparar longitudes de barra. Ninguno pisa un uso semántico
 * previo de la app (`scale` ya es peso corporal, `layout-grid` ya es el tab
 * Rutinas — por eso no se usan acá).
 */
const BREAKDOWN_ICONS: Record<(typeof BREAKDOWN_KEYS)[number], IconName> = {
  coverage: 'target',
  balance: 'swap',
  volume: 'dumbbell',
  frequency: 'calendar',
  separation: 'route',
};

// Anillo del estado colapsado (también visible expandido: es la misma fila).
const RING_SIZE = 56;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** Diámetro interior del anillo — lo usa el disco tenue de fondo del número. */
const RING_INNER = (RING_RADIUS - RING_STROKE / 2) * 2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Semáforo compartido por el anillo, el resumen y cada fila: >80 verde, >=50 ámbar, resto rojo. */
function toneFor(value: number): string {
  if (value > 80) return colors.success;
  if (value >= 50) return colors.warning;
  return colors.danger;
}

function qualityLabel(value: number): string {
  if (value > 80) return 'Rutina excelente';
  if (value >= 50) return 'Buena rutina';
  return 'Necesita ajustes';
}

/**
 * Línea de resumen del estado colapsado. Nunca contradice la fila de
 * "Balance" del desglose: "buen equilibrio general" solo aparece si
 * `breakdown.balance` también es alto, no solo el score total (un score >80
 * es alcanzable con balance mediocre si coverage/frequency/separation
 * compensan — mostrar "buen equilibrio" ahí contradiría la fila ámbar de
 * Balance a un tap de distancia). El grupo más débil solo se nombra cuando
 * no se pudo afirmar buen equilibrio (weakGroups siempre trae 2 músculos —
 * hasta en una rutina de 95 — porque son los MÁS bajos relativos, no
 * necesariamente insuficientes).
 */
function summaryLine(score: RoutineScore): string {
  if (score.breakdown.coverage === 0) {
    return 'Agrega ejercicios a tu rutina para ver el análisis';
  }
  const quality = qualityLabel(score.score);
  if (score.score > 80 && score.breakdown.balance > 80) {
    return `${quality} · buen equilibrio general`;
  }
  const weak = score.weakGroups[0];
  const weakLabel = weak ? MUSCLE_LABELS[weak] ?? weak : null;
  return weakLabel ? `${quality} · falta trabajar ${weakLabel}` : quality;
}

export function RoutineScoreCard({ score, style, defaultExpanded = false }: Props) {
  const hasData = score.breakdown.coverage > 0;
  const [expanded, setExpanded] = useState(defaultExpanded && hasData);
  const scoreColor = toneFor(score.score);

  // Progreso del anillo (0..1). Arranca vacío y se llena al montar; después
  // reacciona a cada recálculo del score en el editor (agregar/quitar un
  // ejercicio), que es la razón de que el anillo sea real y no decorativo.
  // El número del centro se actualiza al instante: solo el trazo anima
  // (mismo criterio que RestRing, donde el reloj no interpola).
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.min(Math.max(score.score, 0), 100) / 100, {
      duration: 550,
      easing: Easing.out(Easing.cubic),
    });
  }, [score.score, progress]);
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  // Rotación del chevron (→ colapsado, ↓ expandido) sincronizada con el
  // estado React vía shared value — el resto de la expansión la resuelve
  // LinearTransition solo, esto es lo único que necesita su propio driver.
  const rotation = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, { duration: 200 });
  }, [expanded, rotation]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 90}deg` }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(50).springify().damping(18)}
      layout={LinearTransition.springify().damping(18)}
      style={[{ alignItems: 'stretch' }, style]}
    >
      <Text variant="heading" style={{ marginBottom: spacing.md }}>Score de optimización</Text>
      <Card variant="raised" padding="lg">
        {/* Único nodo animado por layout dentro de la Card: al agregar/quitar
            el bloque expandido, este View resuelve su propio cambio de
            altura con spring en vez de saltar de golpe. */}
        <Animated.View layout={LinearTransition.springify().damping(18)}>
          <PressableScale
            onPress={hasData ? () => setExpanded((e) => !e) : undefined}
            disabled={!hasData}
            haptic={false}
            pressScale={0.99}
            accessibilityRole={hasData ? 'button' : undefined}
            accessibilityState={hasData ? { expanded } : undefined}
            accessibilityLabel={
              hasData ? (expanded ? 'Ocultar desglose del score' : 'Ver desglose del score') : undefined
            }
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
          >
            {hasData && (
              <View
                style={{
                  width: RING_SIZE,
                  height: RING_SIZE,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Disco tenue detrás del número: da cuerpo al anillo sin
                    competir con el trazo (alpha sobre el color del semáforo). */}
                <View
                  style={{
                    position: 'absolute',
                    width: RING_INNER,
                    height: RING_INNER,
                    borderRadius: RING_INNER / 2,
                    backgroundColor: scoreColor + '14',
                  }}
                />
                <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
                  {/* Track: `border` y no `bg.elevated` como RestRing — esta card
                      vive sobre `bg.card`, necesita el tono de borde para contrastar. */}
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={colors.border}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  <AnimatedCircle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={scoreColor}
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                    animatedProps={ringProps}
                    transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                  />
                </Svg>
                <View style={{ alignItems: 'center' }}>
                  <Text
                    numeric
                    weight="bold"
                    style={{ fontSize: 18, lineHeight: 20, color: scoreColor }}
                  >
                    {score.score}
                  </Text>
                  <Text style={{ fontSize: 9, color: scoreColor, opacity: 0.8 }}>/100</Text>
                </View>
              </View>
            )}

            <Text
              variant={hasData ? 'body' : 'caption'}
              tone={hasData ? 'primary' : 'muted'}
              weight={hasData ? 'semibold' : undefined}
              numberOfLines={hasData ? 2 : undefined}
              style={{ flex: 1 }}
            >
              {summaryLine(score)}
            </Text>

            {hasData && (
              <Animated.View style={chevronStyle}>
                <Icon name="chevron-right" size={20} color={colors.text.muted} />
              </Animated.View>
            )}
          </PressableScale>

          {expanded && hasData && (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(120)}
              style={{
                marginTop: spacing.lg,
                paddingTop: spacing.lg,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ gap: spacing.sm }}>
                {BREAKDOWN_KEYS.map((key) => {
                  const val = score.breakdown[key];
                  // Semáforo POR métrica, no el global: una barra roja debe
                  // leerse roja aunque el score total sea verde.
                  const tone = toneFor(val);
                  return (
                    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: tone + '22',
                          borderWidth: 1.5,
                          borderColor: tone,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={BREAKDOWN_ICONS[key]} size={14} color={tone} />
                      </View>
                      <Text
                        variant="caption"
                        tone="secondary"
                        numberOfLines={1}
                        style={{ width: 76 }}
                      >
                        {BREAKDOWN_LABELS[key]}
                      </Text>
                      <View
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: radius.full,
                          backgroundColor: colors.bg.elevated,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${val}%`,
                            borderRadius: radius.full,
                            backgroundColor: tone,
                          }}
                        />
                      </View>
                      <Text
                        variant="caption"
                        weight="semibold"
                        numeric
                        style={{ width: 34, textAlign: 'right', color: tone }}
                      >
                        {val}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text variant="label" tone="muted" style={{ marginTop: spacing.lg }}>
                Grupos más débiles
              </Text>
              <Text weight="semibold" style={{ marginTop: 4 }}>
                {score.weakGroups.map((g) => MUSCLE_LABELS[g] ?? g).join(' · ')}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </Card>
    </Animated.View>
  );
}
