/**
 * Barrel de las primitivas de UI.
 *
 * Existe para que las migraciones del rediseño toquen una línea de import por
 * archivo en vez de una por componente. Los módulos internos deben seguir
 * importándose por ruta directa (p. ej. `theme/motion.ts` → `./useReduceMotion`)
 * para no crear ciclos con este índice.
 */
export { Badge } from './Badge';
export { Button } from './Button';
export { Card } from './Card';
export { Chip, type ChipProps } from './Chip';
export { IconButton, type IconButtonProps } from './IconButton';
export { Input } from './Input';
export { Loader } from './Loader';
export { PressableScale } from './PressableScale';
export { Screen } from './Screen';
export {
  SegmentedControl,
  type SegmentOption,
  type SegmentedControlProps,
} from './SegmentedControl';
export { Skeleton, SkeletonGroup } from './Skeleton';
export { Stat } from './Stat';
export { Text } from './Text';
export { ToastProvider, useToast } from './Toast';
export { useReduceMotion } from './useReduceMotion';
