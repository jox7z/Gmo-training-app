import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';
import { useFollow, useUnfollow } from '@/lib/queries/feed';
import { useToast } from '@/components/ui/Toast';

interface Props {
  userId: string;
  isFollowing: boolean;
  size?: 'sm' | 'md';
  onChange?: (next: boolean) => void;
  onChangeFailed?: (restored: boolean) => void;
}

export function FollowButton({ userId, isFollowing, size = 'md', onChange, onChangeFailed }: Props) {
  const follow = useFollow();
  const unfollow = useUnfollow();
  const toast = useToast();
  const isSm = size === 'sm';
  const busy = follow.isPending || unfollow.isPending;
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => setOverride(null), [isFollowing]);
  const effective = override ?? isFollowing;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = !effective;
    setOverride(next);
    onChange?.(next);

    if (effective) {
      unfollow.mutate(userId, {
        onError: (error) => {
          setOverride(null);
          toast.show({ message: error?.message ?? 'No se pudo dejar de seguir', tone: 'danger' });
          onChangeFailed?.(true);
        },
      });
    } else {
      follow.mutate(userId, {
        onError: (error) => {
          setOverride(null);
          toast.show({ message: error?.message ?? 'No se pudo seguir', tone: 'danger' });
          onChangeFailed?.(false);
        },
      });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy}
      style={({ pressed }) => [
        {
          paddingHorizontal: isSm ? spacing.md : spacing.lg,
          paddingVertical: isSm ? 6 : spacing.sm,
          borderRadius: radius.sm,
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: isSm ? 96 : 120,
          backgroundColor: effective ? 'transparent' : colors.primary.DEFAULT,
          borderColor: colors.primary.DEFAULT,
        },
        pressed && !busy ? { opacity: 0.8 } : null,
        busy ? { opacity: 0.55 } : null,
      ]}
    >
      <Text weight="semibold" style={{ fontSize: isSm ? 12 : 14, color: effective ? colors.primary.DEFAULT : colors.bg.base }}>
        {effective ? 'Siguiendo' : 'Seguir'}
      </Text>
    </Pressable>
  );
}
