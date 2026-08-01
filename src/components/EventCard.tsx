import { View, Pressable } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import type { CommunityEvent } from '@/lib/repos/events';

/**
 * Un evento se considera terminado solo cuando tiene fin declarado y ya pasó.
 * Sin `endsAt` sigue vigente: no inferimos duración.
 *
 * Fuente única del criterio: la consume `formatEventWhen` y el filtro de
 * próximos eventos de `app/(tabs)/gmup.tsx`.
 */
export function isEventFinished(startsAt: string, endsAt?: string): boolean {
  if (!endsAt) return false;
  const end = new Date(endsAt).getTime();
  return Number.isFinite(end) && end < Date.now();
}

/** "Hoy 18:30", "mañana", "vie 6 jun · 09:00", o "Finalizó" para eventos pasados. */
export function formatEventWhen(startsAt: string, endsAt?: string): string {
  const start = new Date(startsAt);
  const now = new Date();

  if (isEventFinished(startsAt, endsAt)) return 'Finalizó';

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const time = start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (sameDay(start, now)) return start.getTime() < now.getTime() ? `En curso · hoy` : `Hoy · ${time}`;
  if (sameDay(start, tomorrow)) return `Mañana · ${time}`;

  const date = start.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${date} · ${time}`;
}

interface Props {
  event: CommunityEvent;
  onPress?: () => void;
  layout?: 'contained' | 'stream';
}

export function EventCard({ event, onPress, layout = 'contained' }: Props) {
  const isChallenge = event.kind === 'challenge';
  const when = formatEventWhen(event.startsAt, event.endsAt);
  const isPast = when === 'Finalizó';
  const isStream = layout === 'stream';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.88 }]}>
      <Card
        variant={isStream ? 'stream' : 'raised'}
        padding={isStream ? 'lg' : 'md'}
        style={{ gap: spacing.sm, opacity: isPast ? 0.6 : 1 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isChallenge ? colors.primary.muted : colors.info.soft,
            }}
          >
            <Icon
              name={isChallenge ? 'trophy' : 'map-pin'}
              size={22}
              color={isChallenge ? colors.primary.DEFAULT : colors.info.DEFAULT}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Badge label={isChallenge ? 'RETO' : 'QUEDADA'} tone={isChallenge ? 'brand' : 'info'} />
              {event.isJoined && <Badge label="INSCRITO" tone="success" />}
            </View>
            <Text weight="bold" numberOfLines={1} style={{ marginTop: 4 }}>
              {event.title}
            </Text>
          </View>
        </View>

        {event.description ? (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
          <MetaItem icon="calendar" label={when} />
          {isChallenge && event.metric ? <MetaItem icon="target" label={event.metric} /> : null}
          {!isChallenge && event.location ? <MetaItem icon="map-pin" label={event.location} /> : null}
          <MetaItem icon="users" label={`${event.participantCount}`} />
        </View>
      </Card>
    </Pressable>
  );
}

function MetaItem({ icon, label }: { icon: 'calendar' | 'target' | 'map-pin' | 'users'; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={13} color={colors.text.muted} />
      <Text variant="caption" tone="muted" numberOfLines={1} style={{ maxWidth: 160 }}>
        {label}
      </Text>
    </View>
  );
}
