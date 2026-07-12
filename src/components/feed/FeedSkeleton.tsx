import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCircle } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/theme/tokens';

function FeedItemSkeleton() {
  return (
    <Card padding="lg" style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonCircle size={44} />
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
        <Skeleton width={48} height={28} radius={14} />
        <Skeleton width={48} height={28} radius={14} />
        <Skeleton width={48} height={28} radius={14} />
      </View>
    </Card>
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <FeedItemSkeleton key={i} />
      ))}
    </View>
  );
}
