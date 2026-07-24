/**
 * Colores y función para generar color de avatar/comunidad a partir del nombre.
 * Compartido entre CommunityCard y CommunityDetailScreen.
 *
 * Paleta fija de avatares — excepción a tokens: es una paleta de dominio
 * autocontenida (hash → índice estable), no colores de tema. Debe mantenerse
 * íntegra para que el color derivado de un nombre no cambie.
 */
export const GRADIENT_COLORS = [
  '#FF3B3B', '#FF7A00', '#FFD700', '#22C55E',
  '#1E90FF', '#8B5CF6', '#EC4899',
] as const;

export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENT_COLORS[Math.abs(h) % GRADIENT_COLORS.length];
}
