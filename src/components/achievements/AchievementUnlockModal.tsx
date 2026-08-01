import { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';
import type { UnlockedAchievement } from '@/store/achievements';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  queue: UnlockedAchievement[];
  visible: boolean;
  onClose: () => void;
}

/** Aviso de logro desbloqueado, intencionalmente estático. */
export function AchievementUnlockModal({ queue, visible, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const current = queue[index] ?? null;

  useEffect(() => {
    if (visible) {
      setIndex(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [visible]);

  if (!current) return null;

  const isLast = index >= queue.length - 1;
  const color = current.def.color;
  const handleNext = () => {
    if (isLast) onClose();
    else setIndex((value) => value + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleNext}>
      <View
        style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center',
          justifyContent: 'center', paddingHorizontal: spacing.xl,
        }}
      >
        <View
          style={{
            width: 132, height: 132, borderRadius: radius.full, alignItems: 'center',
            justifyContent: 'center', backgroundColor: `${color}22`, borderWidth: 2,
            borderColor: color,
          }}
        >
          <View
            style={{
              width: 98, height: 98, borderRadius: radius.full, backgroundColor: colors.bg.elevated,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Icon name={current.def.icon} size={46} color={color} />
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Text variant="label" style={{ color, letterSpacing: 3 }}>LOGRO DESBLOQUEADO</Text>
          <Text style={{ fontSize: fontSize['2xl'], fontWeight: '900', color: colors.text.primary, textAlign: 'center', marginTop: spacing.sm, letterSpacing: -0.5 }}>
            {current.def.title}
          </Text>
          <View style={{ marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}66` }}>
            <Text weight="bold" style={{ color }}>{current.tier.label}</Text>
          </View>
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.md, textAlign: 'center' }}>
            {current.def.description}
          </Text>
          {queue.length > 1 ? (
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }} numeric>
              {index + 1} / {queue.length}
            </Text>
          ) : null}
        </View>

        <View style={{ alignSelf: 'stretch', marginTop: spacing['2xl'] }}>
          <Button title={isLast ? 'Genial' : 'Siguiente'} variant="primary" size="lg" fullWidth onPress={handleNext} />
        </View>

        <Pressable onPress={handleNext} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_H * 0.2 }} />
      </View>
    </Modal>
  );
}
