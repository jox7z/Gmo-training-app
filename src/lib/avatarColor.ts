/**
 * Colores y función para generar color de avatar/comunidad a partir del nombre.
 * Compartido entre CommunityCard y CommunityDetailScreen.
 *
 * Los dos primeros salen de la rampa ember para que un avatar generado nunca
 * quede a un tono de distancia de un CTA: antes eran hex fijos del rojo/naranja
 * viejo y desentonaban en cuanto la paleta se movió.
 */
import { colors } from '@/theme/tokens';

export const GRADIENT_COLORS = [
  colors.ember[500], colors.ember[300], colors.metal.gold.DEFAULT, colors.success,
  colors.info.DEFAULT, '#8B5CF6', '#EC4899',
] as const;

export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENT_COLORS[Math.abs(h) % GRADIENT_COLORS.length];
}
