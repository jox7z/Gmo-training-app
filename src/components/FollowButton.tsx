import { useEffect, useRef, useState } from 'react';
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
  /** Notifica el nuevo estado de forma optimista (para que la pantalla refleje el cambio sin esperar al refetch). */
  onChange?: (next: boolean) => void;
  /** Revierte el estado optimista si la mutación falla (recibe el valor a restaurar). */
  onChangeFailed?: (restored: boolean) => void;
}

export function FollowButton({ userId, isFollowing, size = 'md', onChange, onChangeFailed }: Props) {
  const follow = useFollow();
  const unfollow = useUnfollow();
  const toast = useToast();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isSm = size === 'sm';
  const busy = follow.isPending || unfollow.isPending;

  // Estado optimista local: el botón refleja el cambio al instante aunque la
  // lista que lo contiene no se refetchee (las mutaciones usan refetchType:'none'
  // para no resetear el scroll). Se reconcilia cuando cambia el prop real.
  const [override, setOverride] = useState<boolean | null>(null);
  useEffect(() => {
    setOverride(null);
  }, [isFollowing]);
  const effective = override ?? isFollowing;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // scale 1.0 → 0.95 → 1.0 en 120ms
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 60, useNativeDriver: true }),
    ]).start();

    const next = !effective;
    setOverride(next);
    onChange?.(next);

    if (effective) {
      unfollow.mutate(userId, {
        onError: (err) => {
          setOverride(null);
          toast.show({ message: err?.message ?? 'No se pudo dejar de seguir', tone: 'danger' });
          onChangeFailed?.(true);
        },
      });
    } else {
      follow.mutate(userId, {
        onError: (err) => {
          setOverride(null);
          toast.show({ message: err?.message ?? 'No se pudo seguir', tone: 'danger' });
          onChangeFailed?.(false);
        },
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
            borderRadius: radius.sm,
            borderWidth: 1.5,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            minWidth: isSm ? 96 : 120,
            backgroundColor: effective ? 'transparent' : colors.primary.DEFAULT,
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
            color: effective ? colors.primary.DEFAULT : colors.bg.base,
          }}
        >
          {effective ? 'Siguiendo' : 'Seguir'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
