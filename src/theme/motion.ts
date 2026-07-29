/**
 * motion.ts — fuente única de tiempos, curvas y muelles.
 *
 * Convive con `tokens.ts`: si `tokens` define cómo se ve la app, `motion` define
 * cómo se mueve. Antes de este módulo cada animación llevaba números mágicos
 * inline (`damping: 18, stiffness: 320`, `friction: 5`), lo que hacía imposible
 * mantener un lenguaje de movimiento coherente.
 *
 * Reglas de uso:
 * - Animación **declarativa** (`entering` / `exiting` / `layout`): usa los
 *   helpers `enter()`, `exit()`, `layoutTransition()`. Encadenan
 *   `ReduceMotion.System`, que Reanimated resuelve en el hilo de UI. **No**
 *   consultes `useMotion().reduce` para esto: `useReduceMotion()` arranca en
 *   `true` y resuelve async, así que en arranque en frío se comería la primera
 *   entrada de cada pantalla.
 * - Animación **imperativa** (`withSpring` / `withTiming` sobre shared values):
 *   usa `useMotion()`, que sí necesita saber la preferencia en JS para poder
 *   asignar el valor final de golpe.
 */
import { useMemo } from 'react';
import {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/components/ui/useReduceMotion';

/** Duraciones en ms. `celebrate` es la única que supera el medio segundo. */
export const duration = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 360,
  slower: 520,
  celebrate: 950,
} as const;

export const easing = {
  /** Curva por defecto: entra rápido, asienta despacio. */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Para movimientos con recorrido largo o jerarquía alta. */
  emphasized: Easing.bezier(0.3, 0, 0, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
  linear: Easing.linear,
} as const;

/**
 * Muelles con nombre. `press` replica el feedback histórico de `PressableScale`
 * (damping 18 / stiffness 320) para no alterar el tacto ya validado.
 */
export const spring = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  enter: { damping: 20, stiffness: 180, mass: 1 },
  exit: { damping: 26, stiffness: 260, mass: 1 },
  /** Indicadores que siguen a un dedo o a una selección. */
  indicator: { damping: 22, stiffness: 260, mass: 0.9 },
  /** Rebote de celebración: rango/logro/PR. Equivale al friction 5 legacy. */
  celebrate: { damping: 9, stiffness: 140, mass: 1 },
} satisfies Record<string, WithSpringConfig>;

export const timing = {
  fast: { duration: duration.fast, easing: easing.standard },
  base: { duration: duration.base, easing: easing.standard },
  enter: { duration: duration.base, easing: easing.decelerate },
  exit: { duration: duration.fast, easing: easing.accelerate },
} satisfies Record<string, WithTimingConfig>;

/** Paso de escalonado entre elementos de una lista. */
export const STAGGER_STEP = 45;
/** Techo del escalonado: a partir de aquí todos entran a la vez. */
export const STAGGER_MAX = 8;

/** Retardo de entrada según el índice, con techo para listas largas. */
export function stagger(index: number, step: number = STAGGER_STEP): number {
  'worklet';
  return Math.min(Math.max(index, 0), STAGGER_MAX) * step;
}

/**
 * Entrada declarativa estándar de la app. Direccional (desde abajo) y
 * escalonada por índice.
 *
 * No usar nunca en items de FlashList: el reciclador puede corromper filas.
 */
export function enter(index = 0) {
  return FadeInDown.delay(stagger(index))
    .duration(duration.base)
    .easing(easing.decelerate)
    .reduceMotion(ReduceMotion.System);
}

/** Salida declarativa estándar. Más corta que la entrada, a propósito. */
export function exit() {
  return FadeOut.duration(duration.fast)
    .easing(easing.accelerate)
    .reduceMotion(ReduceMotion.System);
}

/** Transición de layout para inserción/borrado en listas no recicladas. */
export function layoutTransition() {
  return LinearTransition.springify()
    .damping(spring.enter.damping)
    .stiffness(spring.enter.stiffness)
    .reduceMotion(ReduceMotion.System);
}

/**
 * Acceso imperativo a los presets, ya resuelto contra "reducir movimiento".
 * Con la preferencia activa, `timing` devuelve duración 0 y `spring` fuerza
 * `ReduceMotion.Always`, de modo que el valor final se aplica sin recorrido.
 */
export function useMotion() {
  const reduce = useReduceMotion();

  return useMemo(
    () => ({
      reduce,
      spring: (preset: keyof typeof spring): WithSpringConfig =>
        reduce ? { ...spring[preset], reduceMotion: ReduceMotion.Always } : spring[preset],
      timing: (preset: keyof typeof timing): WithTimingConfig =>
        reduce ? { duration: 0 } : timing[preset],
      stagger: (index: number) => (reduce ? 0 : stagger(index)),
    }),
    [reduce],
  );
}
