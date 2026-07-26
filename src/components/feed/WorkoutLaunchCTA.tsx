import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

interface WorkoutLaunchCTAProps {
  active: boolean;
  title: string;
  detail: string;
  bottom: number;
  onPress: () => void;
}

export function WorkoutLaunchCTA({
  active,
  title,
  detail,
  bottom,
  onPress,
}: WorkoutLaunchCTAProps) {
  const statusColor = active ? colors.success : colors.primary.DEFAULT;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom,
      }}
    >
      <PressableScale
        onPress={onPress}
        pressScale={0.975}
        haptic={Haptics.ImpactFeedbackStyle.Medium}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${detail}`}
        accessibilityHint={
          active ? 'Vuelve a tu entrenamiento en curso' : 'Abre tu próximo entrenamiento'
        }
        style={{
          minHeight: 76,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderWidth: 1,
          borderBottomWidth: 4,
          borderColor: active ? colors.primary.DEFAULT : colors.borderStrong,
          borderBottomColor: active ? colors.primary.dark : colors.bg.cardEdge,
          borderRadius: radius.xl,
          backgroundColor: colors.bg.card,
          ...shadow.card,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? colors.primary.muted : colors.bg.elevated,
            borderWidth: 1,
            borderColor: active ? colors.primary.DEFAULT : colors.border,
          }}
        >
          <Icon name="dumbbell" size={25} color={colors.primary.DEFAULT} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: radius.full,
                backgroundColor: statusColor,
              }}
            />
            <Text
              variant="label"
              style={{ color: statusColor, fontSize: 10, lineHeight: 13 }}
            >
              {active ? 'En curso' : 'Entrenar'}
            </Text>
          </View>
          <Text
            variant="heading"
            weight="bold"
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {title}
          </Text>
          <Text
            variant="caption"
            tone="secondary"
            numberOfLines={1}
            style={{ marginTop: 1 }}
          >
            {detail}
          </Text>
        </View>

        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary.DEFAULT,
          }}
        >
          <Icon name="chevron-right" size={18} color={colors.text.primary} />
        </View>
      </PressableScale>
    </View>
  );
}
