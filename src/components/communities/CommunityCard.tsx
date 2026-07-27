import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import type { Community, CommunityRole } from '@/lib/repos/communities';
import { colorForName } from '@/lib/avatarColor';

const ROLE_LABEL: Record<CommunityRole, string> = {
  owner:     'Owner',
  moderator: 'Mod',
  member:    'Miembro',
};

interface Props {
  community: Community;
  onPress: () => void;
}

export function CommunityCard({ community, onPress }: Props) {
  const accentColor = colorForName(community.name);
  const initial = community.name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <Card variant="raised" padding={0} style={{ overflow: 'hidden' }}>
        {/* Cover */}
        <View style={{ width: '100%', aspectRatio: 16 / 7 }}>
          {community.coverUrl ? (
            <Image
              source={{ uri: community.coverUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: accentColor + '22',
              }}
            >
              <Text
                weight="black"
                style={{
                  fontSize: 64,
                  color: accentColor,
                  opacity: 0.9,
                  lineHeight: 72,
                }}
              >
                {initial}
              </Text>
            </View>
          )}

          {/* Badges sobre cover */}
          <View
            style={{
              position: 'absolute',
              top: spacing.sm,
              right: spacing.sm,
              flexDirection: 'row',
              gap: spacing.xs,
            }}
          >
            {community.isPrivate && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                  borderRadius: radius.full,
                  backgroundColor: 'rgba(0,0,0,0.72)',
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                }}
              >
                <Icon name="lock" size={11} color={colors.text.secondary} />
                <Text variant="label" style={{ fontSize: 11, color: colors.text.secondary }}>
                  Privada
                </Text>
              </View>
            )}
            {community.myRole && (
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                  borderRadius: radius.full,
                  backgroundColor: accentColor + 'CC',
                }}
              >
                <Text variant="label" style={{ fontSize: 11, color: colors.text.primary }}>
                  {ROLE_LABEL[community.myRole]}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Info */}
        <View style={{ padding: spacing.md, gap: spacing.xs }}>
          <Text weight="bold" numberOfLines={1} style={{ fontSize: 16 }}>
            {community.name}
          </Text>
          {community.description ? (
            <Text variant="caption" tone="secondary" numberOfLines={2}>
              {community.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}>
            <Icon name="users" size={13} color={colors.text.muted} />
            <Text variant="label" tone="muted">
              {community.memberCount.toLocaleString()} miembro{community.memberCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
