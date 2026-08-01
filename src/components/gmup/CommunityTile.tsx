import { View } from 'react-native';
import { Image } from 'expo-image';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colorForName } from '@/lib/avatarColor';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Community } from '@/lib/repos/communities';

/** Ancho fijo del tile: mantiene el ritmo del carrusel entre secciones. */
export const COMMUNITY_TILE_WIDTH = 168;

interface Props {
  community: Community;
  onPress: () => void;
}

/**
 * Tile compacto de comunidad para los carruseles del hub GMUP.
 * La lista vertical a ancho completo sigue usando `CommunityCard`.
 */
export function CommunityTile({ community, onPress }: Props) {
  const accent = colorForName(community.name);
  const initial = community.name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Comunidad ${community.name}`}
      accessibilityHint={`${community.memberCount} miembros. Abre el detalle de la comunidad`}
      onPress={onPress}
      pressScale={0.97}
      haptic={false}
      style={{ width: COMMUNITY_TILE_WIDTH }}
    >
      <Card variant="raised" padding={0} style={{ overflow: 'hidden' }}>
        <View style={{ width: '100%', height: 86 }}>
          {community.coverUrl ? (
            <Image
              source={{ uri: community.coverUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              accessible={false}
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: accent + '22',
              }}
            >
              <Text weight="black" style={{ fontSize: 40, lineHeight: 46, color: accent }}>
                {initial}
              </Text>
            </View>
          )}

          {community.isPrivate ? (
            <View
              style={{
                position: 'absolute',
                top: spacing.xs,
                right: spacing.xs,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingHorizontal: spacing.sm,
                paddingVertical: 3,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                backgroundColor: colors.bg.overlay,
              }}
            >
              <Icon name="lock" size={spacing.md} color={colors.text.secondary} />
              <Text variant="label" tone="secondary">
                Privada
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ padding: spacing.md, gap: spacing.xs }}>
          <Text weight="bold" numberOfLines={1}>
            {community.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="users" size={spacing.md} color={colors.text.muted} />
            <Text variant="label" tone="muted" numberOfLines={1}>
              {community.memberCount.toLocaleString()}
            </Text>
          </View>
        </View>
      </Card>
    </PressableScale>
  );
}

/** Primer tile del carrusel: atajo permanente a crear comunidad. */
export function CommunityCreateTile({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Crear comunidad"
      accessibilityHint="Abre el formulario para crear una comunidad nueva"
      onPress={onPress}
      pressScale={0.97}
      haptic={false}
      style={{ width: COMMUNITY_TILE_WIDTH }}
    >
      <Card
        variant="raised"
        padding="md"
        style={{
          minHeight: 148,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderColor: colors.primary.DEFAULT,
          backgroundColor: colors.primary.muted,
        }}
      >
        <View
          style={{
            width: spacing['2xl'] + spacing.sm,
            height: spacing['2xl'] + spacing.sm,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.primary.glow,
            backgroundColor: colors.bg.elevated,
          }}
        >
          <Icon name="plus" size={spacing.xl} color={colors.primary.DEFAULT} />
        </View>
        <Text variant="caption" weight="bold" tone="brand" numberOfLines={1}>
          Crear comunidad
        </Text>
      </Card>
    </PressableScale>
  );
}
