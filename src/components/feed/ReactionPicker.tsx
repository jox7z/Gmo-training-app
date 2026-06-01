import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View, Text as RNText } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, shadow } from '@/theme/tokens';
import { REACTIONS } from './reactions';
import type { ReactionKind } from '@/lib/repos/posts';

interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  anchor: AnchorRect | null;
  onSelect: (kind: ReactionKind) => void;
  onDismiss: () => void;
  activeKind?: ReactionKind | null;
}

const ITEM_SIZE = 44;
const ITEM_GAP = 6;
const PADDING_X = 10;
const PADDING_Y = 8;
const PICKER_WIDTH = REACTIONS.length * ITEM_SIZE + (REACTIONS.length - 1) * ITEM_GAP + PADDING_X * 2;
const PICKER_HEIGHT = ITEM_SIZE + PADDING_Y * 2;

/**
 * Selector estilo Facebook. Aparece arriba del botón ancla (long-press).
 * - Animación: fade + scale + translateY
 * - Cada item entra con stagger
 * - Tap fuera cierra
 */
export function ReactionPicker({ visible, anchor, onSelect, onDismiss, activeKind }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const itemAnims = useRef(REACTIONS.map(() => new Animated.Value(0))).current;
  const [, force] = useStateForce();

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 110, useNativeDriver: true }),
        Animated.stagger(
          35,
          itemAnims.map((a) =>
            Animated.spring(a, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
          ),
        ),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.85);
      itemAnims.forEach((a) => a.setValue(0));
    }
  }, [visible, opacity, scale, itemAnims]);

  if (!visible || !anchor) return null;

  // Posicionar arriba del ancla; si no cabe, debajo.
  const anchorCenterX = anchor.x + anchor.width / 2;
  let left = anchorCenterX - PICKER_WIDTH / 2;
  if (left < 12) left = 12;
  // top: arriba del ancla con un pequeño gap
  let top = anchor.y - PICKER_HEIGHT - 10;
  if (top < 60) top = anchor.y + anchor.height + 10;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onDismiss}>
      <Pressable
        onPress={onDismiss}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      >
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top,
            left,
            opacity,
            transform: [{ scale }],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: ITEM_GAP,
              paddingHorizontal: PADDING_X,
              paddingVertical: PADDING_Y,
              borderRadius: radius.full,
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadow.card,
            }}
          >
            {REACTIONS.map((r, idx) => {
              const isActive = activeKind === r.key;
              return (
                <Animated.View
                  key={r.key}
                  style={{
                    opacity: itemAnims[idx],
                    transform: [
                      {
                        translateY: itemAnims[idx].interpolate({
                          inputRange: [0, 1],
                          outputRange: [16, 0],
                        }),
                      },
                      {
                        scale: itemAnims[idx].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      onSelect(r.key);
                    }}
                    hitSlop={4}
                    style={({ pressed }) => [
                      {
                        width: ITEM_SIZE,
                        height: ITEM_SIZE,
                        borderRadius: ITEM_SIZE / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isActive ? `${r.color}22` : 'transparent',
                        borderWidth: isActive ? 1.5 : 0,
                        borderColor: isActive ? r.color : 'transparent',
                      },
                      pressed && {
                        transform: [{ scale: 1.18 }],
                        backgroundColor: `${r.color}33`,
                      },
                    ]}
                  >
                    <RNText style={{ fontSize: 28, lineHeight: 32 }}>{r.emoji}</RNText>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// Tiny helper para forzar re-render si hace falta (no usado por ahora; reservado).
function useStateForce(): [number, () => void] {
  const ref = useRef(0);
  return [ref.current, () => (ref.current += 1)];
}
