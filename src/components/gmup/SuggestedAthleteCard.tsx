import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { RANKS, spacing, type RankId } from '@/theme/tokens';
import type { DiscoverAthlete } from '@/lib/repos/social';

/** Ancho fijo del carrusel de atletas sugeridos. */
export const SUGGESTED_ATHLETE_WIDTH = 168;

interface Props {
  athlete: DiscoverAthlete;
  onOpen: () => void;
}

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

/**
 * Tarjeta vertical de atleta sugerido (`discover_athletes`).
 * El seguimiento se delega en `FollowButton`, que ya es optimista.
 */
export function SuggestedAthleteCard({ athlete, onOpen }: Props) {
  const info = rankInfo(athlete.currentRank);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Abrir perfil de ${athlete.displayName}`}
      accessibilityHint={`@${athlete.username}, rango ${info.label}`}
      onPress={onOpen}
      pressScale={0.97}
      haptic={false}
      style={{ width: SUGGESTED_ATHLETE_WIDTH }}
    >
      <Card
        variant="raised"
        padding="md"
        style={{ alignItems: 'center', gap: spacing.sm }}
      >
        <Avatar name={athlete.displayName} size={56} borderColor={info.color} />

        <View style={{ alignItems: 'center', gap: 2, alignSelf: 'stretch' }}>
          <Text weight="bold" numberOfLines={1} style={{ textAlign: 'center' }}>
            {athlete.displayName}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            @{athlete.username}
          </Text>
          <Text variant="label" style={{ color: info.color }} numberOfLines={1}>
            {info.label}
          </Text>
        </View>

        <FollowButton userId={athlete.id} isFollowing={athlete.isFollowing} size="sm" />
      </Card>
    </PressableScale>
  );
}
