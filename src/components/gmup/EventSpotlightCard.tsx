import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { formatEventWhen } from '@/components/EventCard';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';
import type { CommunityEvent } from '@/lib/repos/events';

/** Ancho fijo del carrusel de eventos destacados. */
export const EVENT_SPOTLIGHT_WIDTH = 272;

interface Props {
  event: CommunityEvent;
  onPress: () => void;
}

/**
 * Tarjeta de evento del carrusel "Próximos eventos".
 *
 * Añade bloque de fecha y contador de participantes sobre la geometría del
 * design system. La lista vertical a ancho completo sigue usando `EventCard`.
 */
export function EventSpotlightCard({ event, onPress }: Props) {
  const isChallenge = event.kind === 'challenge';
  const accent = isChallenge ? colors.primary.DEFAULT : colors.info.DEFAULT;
  const accentSoft = isChallenge ? colors.primary.muted : colors.info.soft;
  const when = formatEventWhen(event.startsAt, event.endsAt);

  const start = new Date(event.startsAt);
  const validDate = !Number.isNaN(start.getTime());
  const day = validDate ? String(start.getDate()) : '–';
  const month = validDate
    ? start.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
    : '';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${isChallenge ? 'Reto' : 'Quedada'}: ${event.title}. ${when}`}
      accessibilityHint={`${event.participantCount} participantes. Abre el detalle del evento`}
      onPress={onPress}
      pressScale={0.97}
      haptic={false}
      style={{ width: EVENT_SPOTLIGHT_WIDTH }}
    >
      <Card
        variant="raised"
        padding="md"
        style={{ gap: spacing.md, borderColor: accent }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {/* Bloque de fecha */}
          <View
            style={{
              width: spacing['3xl'] + spacing.sm,
              paddingVertical: spacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: accent,
              backgroundColor: accentSoft,
            }}
          >
            <Text
              weight="black"
              numeric
              style={{ fontSize: fontSize.xl, lineHeight: 28, color: accent }}
            >
              {day}
            </Text>
            <Text variant="label" style={{ color: accent }} numberOfLines={1}>
              {month}
            </Text>
          </View>

          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Badge
                label={isChallenge ? 'RETO' : 'QUEDADA'}
                tone={isChallenge ? 'brand' : 'info'}
              />
              {event.isJoined ? <Badge label="INSCRITO" tone="success" /> : null}
            </View>
            <Text weight="bold" numberOfLines={2}>
              {event.title}
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.xs }}>
          <SpotlightMeta icon="calendar" label={when} />
          {isChallenge && event.metric ? (
            <SpotlightMeta icon="target" label={event.metric} />
          ) : null}
          {!isChallenge && event.location ? (
            <SpotlightMeta icon="map-pin" label={event.location} />
          ) : null}
          {event.communityName ? (
            <SpotlightMeta icon="users" label={event.communityName} />
          ) : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: spacing.sm,
          }}
        >
          <Icon name="users" size={spacing.lg} color={accent} />
          <Text variant="caption" weight="bold" style={{ color: accent }} numeric>
            {event.participantCount.toLocaleString()}
          </Text>
          <Text variant="caption" tone="muted">
            {event.participantCount === 1 ? 'participante' : 'participantes'}
          </Text>
        </View>
      </Card>
    </PressableScale>
  );
}

function SpotlightMeta({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Icon name={icon} size={spacing.md} color={colors.text.muted} />
      <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}
