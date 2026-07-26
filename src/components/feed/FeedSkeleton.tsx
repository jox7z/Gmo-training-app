import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import {
  SocialStreamColumn,
  type SocialLayout,
} from '@/components/social/SocialStreamColumn';
import { colors, radius, spacing } from '@/theme/tokens';

function FeedItemSkeleton({ layout }: { layout: SocialLayout }) {
  return (
    <SocialStreamColumn
      layout={layout}
      style={{ marginBottom: layout === 'stream' ? spacing.sm : spacing.md }}
    >
      <Card variant={layout === 'stream' ? 'stream' : 'default'} padding="lg">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={44} height={44} borderRadius={radius.full} />
          <View style={{ marginLeft: spacing.md, flex: 1, gap: 6 }}>
            <Skeleton width={140} height={14} />
            <Skeleton width={90} height={10} />
          </View>
        </View>
        <View style={{ marginTop: spacing.lg, gap: 8 }}>
          <Skeleton width="80%" height={18} />
          <Skeleton width="50%" height={12} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md,
            marginTop: spacing.lg,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Skeleton width={48} height={44} />
          <Skeleton width={48} height={44} />
          <Skeleton width={48} height={44} />
        </View>
      </Card>
    </SocialStreamColumn>
  );
}

export function FeedSkeleton({
  count = 4,
  layout = 'contained',
}: {
  count?: number;
  layout?: SocialLayout;
}) {
  return (
    <SkeletonGroup accessibilityLabel="Cargando publicaciones">
      <View>
        {Array.from({ length: count }).map((_, i) => (
          <FeedItemSkeleton key={i} layout={layout} />
        ))}
      </View>
    </SkeletonGroup>
  );
}
