import { useEffect } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { formatWeight } from '@/lib/units';
import type { Unit } from '@/store/app';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

interface Props {
  exerciseName: string;
  weightKg: number;
  reps: number;
  unit: Unit;
  onDismiss: () => void;
}

export function LivePrBanner({
  exerciseName,
  weightKg,
  reps,
  unit,
  onDismiss,
}: Props) {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16)}
      exiting={FadeOutUp.duration(180)}
      style={{
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.metal.gold.DEFAULT,
        backgroundColor: colors.bg.card,
        ...shadow.glowAccent,
      }}
    >
      <PressableScale
        onPress={onDismiss}
        haptic={Haptics.ImpactFeedbackStyle.Light}
        pressScale={0.98}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.xl,
        }}
      >
        <View
          style={{
            width: spacing['3xl'],
            height: spacing['3xl'],
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent.soft,
          }}
        >
          <Icon name="trophy" size={24} color={colors.metal.gold.DEFAULT} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            variant="label"
            weight="bold"
            style={{ color: colors.metal.gold.DEFAULT }}
          >
            Nuevo PR
          </Text>
          <Text weight="bold" numberOfLines={1}>
            {exerciseName}
          </Text>
          <Text variant="caption" tone="secondary" numeric>
            {formatWeight(weightKg, unit)} × {reps} reps
          </Text>
        </View>

        <Text variant="caption" tone="muted">
          Cerrar
        </Text>
      </PressableScale>
    </Animated.View>
  );
}
