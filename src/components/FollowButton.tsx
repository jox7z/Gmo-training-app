import { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';
import { useFollow, useUnfollow } from '@/lib/queries/feed';
import { useToast } from '@/components/ui/Toast';

interface Props {
  userId: string;
  isFollowing: boolean;
  /** 'sm' → botón compacto (listas), 'md' → botón normal (perfil). Default: 'md'. */
  size?: 'sm' | 'md';
}

export function FollowButton({ userId, isFollowing, size = 'md' }: Props) {
  const follow = useFollow();
  const unfollow = useUnfollow();
  const toast = useToast();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isSm = size === 'sm';
  const busy = follow.isPending || unfollow.isPending;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // scale 1.0 → 0.95 → 1.0 en 120ms
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 60, useNativeDriver: true }),
    ]).start();

    if (isFollowing) {
      unfollow.mutate(userId, {
        onError: (err) =>
          toast.show({ message: err?.message ?? 'No se pudo dejar de seguir', tone: 'danger' }),
      });
    } else {
      follow.mutate(userId, {
        onError: (err) =>
          toast.show({ message: err?.message ?? 'No se pudo seguir', tone: 'danger' }),
      });
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        disabled={busy}
        style={({ pressed }) => [
          {
            paddingHorizontal: isSm ? spacing.md : spacing.lg,
            paddingVertical: isSm ? 6 : spacing.sm,
            borderRadius: radius.full,
            borderWidth: 1.5,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            backgroundColor: isFollowing ? 'transparent' : colors.primary.DEFAULT,
            borderColor: colors.primary.DEFAULT,
          },
          pressed && !busy && { opacity: 0.8 },
          busy && { opacity: 0.55 },
        ]}
      >
        <Text
          weight="semibold"
          style={{
            fontSize: isSm ? 12 : 14,
            color: isFollowing ? colors.primary.DEFAULT : '#0B0B0B',
          }}
        >
          {isFollowing ? 'Siguiendo' : 'Seguir'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
