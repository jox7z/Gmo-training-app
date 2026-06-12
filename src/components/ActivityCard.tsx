import { View, Pressable, Image } from 'react-native';
import { Card } from './ui/Card';
import { Text } from './ui/Text';
import { Avatar } from './Avatar';
import { Icon, IconName } from './Icon';
import { colors, spacing, radius } from '@/theme/tokens';

export interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  durationLabel?: string;
  setsLabel?: string;
  distanceLabel?: string;
  feeling?: 'great' | 'good' | 'tired' | 'bad';
  photoUri?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  likes?: number;
  comments?: number;
  type?: 'workout' | 'run' | 'bike' | 'walk';
}

const TYPE_ICON: Record<NonNullable<ActivityItem['type']>, IconName> = {
  workout: 'dumbbell',
  run: 'fire',
  bike: 'lightning',
  walk: 'route',
};

const FEELING_DOT: Record<NonNullable<ActivityItem['feeling']>, string> = {
  great: colors.success,
  good: colors.info.DEFAULT,
  tired: colors.warning,
  bad: colors.danger,
};

interface Props {
  item: ActivityItem;
  onPress?: () => void;
  compact?: boolean;
}

export function ActivityCard({ item, onPress, compact }: Props) {
  const icon = TYPE_ICON[item.type ?? 'workout'];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      <Card padding={0} variant="raised" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: item.photoUri ? spacing.md : spacing.sm,
            gap: spacing.md,
          }}
        >
          <Avatar uri={item.authorAvatarUrl} name={item.authorName} size={36} bordered={false} />
          <View style={{ flex: 1 }}>
            <Text weight="semibold" numberOfLines={1}>
              {item.authorName ?? 'Tú'}
            </Text>
            <Text variant="caption" tone="muted">
              {item.date}
            </Text>
          </View>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              backgroundColor: colors.primary.muted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={16} color={colors.primary.DEFAULT} />
          </View>
        </View>

        {/* Title */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {item.feeling && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: FEELING_DOT[item.feeling],
                }}
              />
            )}
            <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {item.title}
            </Text>
          </View>
          {item.subtitle && (
            <Text variant="caption" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
              {item.subtitle}
            </Text>
          )}
        </View>

        {/* Photo */}
        {item.photoUri && (
          <Image
            source={{ uri: item.photoUri }}
            style={{ width: '100%', height: compact ? 140 : 200, backgroundColor: colors.bg.elevated }}
            resizeMode="cover"
          />
        )}

        {/* Stats row */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: (item.likes !== undefined || item.comments !== undefined) ? spacing.md : spacing.lg,
            gap: spacing.xl,
          }}
        >
          {item.durationLabel && <MiniStat label="Tiempo" value={item.durationLabel} />}
          {item.distanceLabel && <MiniStat label="Distancia" value={item.distanceLabel} />}
          {item.setsLabel && <MiniStat label="Sets" value={item.setsLabel} />}
        </View>

        {/* Footer (likes/comments) */}
        {(item.likes !== undefined || item.comments !== undefined) && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.lg,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: spacing.sm,
            }}
          >
            {item.likes !== undefined && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="heart" size={16} color={colors.text.muted} />
                <Text variant="caption" tone="secondary">{item.likes}</Text>
              </View>
            )}
            {item.comments !== undefined && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="chat" size={16} color={colors.text.muted} />
                <Text variant="caption" tone="secondary">{item.comments}</Text>
              </View>
            )}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="label" tone="muted">{label}</Text>
      <Text variant="heading" style={{ marginTop: 2 }} numeric>{value}</Text>
    </View>
  );
}
