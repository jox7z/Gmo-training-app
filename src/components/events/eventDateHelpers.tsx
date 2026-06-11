/**
 * Constantes y helpers compartidos entre new.tsx y edit/[id].tsx.
 */
import { Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

export const DAY_OPTIONS = [
  { label: 'Hoy',    offset: 0 },
  { label: 'Mañana', offset: 1 },
  { label: '+2 días', offset: 2 },
  { label: '+3 días', offset: 3 },
  { label: '+1 sem',  offset: 7 },
  { label: '+2 sem',  offset: 14 },
] as const;

export const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00',
  '12:00', '17:00', '18:00', '19:00', '20:00', '21:00',
] as const;

export type TimeOption = typeof TIME_OPTIONS[number];

export function buildDate(dayOffset: number, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Dado un ISO string de fecha, devuelve el dayOffset y time más cercanos
 * de las listas disponibles.
 */
export function parseDateToChips(isoDate: string): { dayOffset: number; time: string } {
  const date = new Date(isoDate);
  const now = new Date();
  // días desde hoy (redondeado al entero más cercano)
  const diffMs = date.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // encontrar el offset más cercano disponible
  const offsets = DAY_OPTIONS.map((d) => d.offset);
  const closestOffset = offsets.reduce((prev, curr) =>
    Math.abs(curr - diffDays) < Math.abs(prev - diffDays) ? curr : prev,
  );

  // hora: extraer HH:mm de la fecha original
  const orig = new Date(isoDate);
  const hh = orig.getHours().toString().padStart(2, '0');
  const mm = orig.getMinutes().toString().padStart(2, '0');
  const rawTime = `${hh}:${mm}`;

  // encontrar la opción de tiempo más cercana
  const closestTime = (TIME_OPTIONS as readonly string[]).reduce((prev, curr) => {
    const [ph, pm] = prev.split(':').map(Number);
    const [ch, cm] = curr.split(':').map(Number);
    const [rh, rm] = rawTime.split(':').map(Number);
    const prevDiff = Math.abs(ph * 60 + pm - (rh * 60 + rm));
    const currDiff = Math.abs(ch * 60 + cm - (rh * 60 + rm));
    return currDiff < prevDiff ? curr : prev;
  });

  return { dayOffset: closestOffset, time: closestTime };
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.primary.DEFAULT : colors.border,
        backgroundColor: active ? colors.primary.muted : colors.bg.elevated,
      }}
    >
      <Text
        variant="caption"
        weight="bold"
        style={{ color: active ? colors.primary.DEFAULT : colors.text.secondary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
