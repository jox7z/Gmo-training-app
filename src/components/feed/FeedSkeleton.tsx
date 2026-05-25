import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/theme/tokens';

function ShimmerBar({ width, height = 12, radius: r = 6, style }: { width: number | string; height?: number; radius?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: r,
          backgroundColor: colors.bg.elevated,
          opacity,
        },
        style,
      ]}
    />
  );
}

function FeedItemSkeleton() {
  return (
    <Card padding="lg" style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animated.View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.bg.elevated,
          }}
        />
        <View style={{ marginLeft: spacing.md, flex: 1, gap: 6 }}>
          <ShimmerBar width={140} height={14} />
          <ShimmerBar width={90} height={10} />
        </View>
      </View>
      <View style={{ marginTop: spacing.lg, gap: 8 }}>
        <ShimmerBar width="80%" height={18} />
        <ShimmerBar width="50%" height={12} />
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
        <ShimmerBar width={48} height={28} radius={14} />
        <ShimmerBar width={48} height={28} radius={14} />
        <ShimmerBar width={48} height={28} radius={14} />
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
