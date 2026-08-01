import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

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
          minHeight: 68,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary.DEFAULT,
          borderRadius: radius.lg,
          backgroundColor: colors.bg.raised,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceVeil,
          }}
        >
          <Icon name="dumbbell" size={22} color={colors.primary.DEFAULT} />
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

        <Icon name="chevron-right" size={20} color={colors.primary.DEFAULT} />
      </PressableScale>
    </View>
  );
}
