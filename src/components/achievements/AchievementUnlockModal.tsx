/**
 * Celebración de logro desbloqueado — estilo Duolingo.
 *
 * Recibe una cola de logros recién conseguidos y los presenta de uno en uno
 * con: ráfaga de confeti, anillo que estalla, medalla con rebote elástico y un
 * brillo que barre la insignia. No es un simple fade: es una secuencia coreografiada
 * pensada para sentirse como una recompensa.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, View, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/Icon';
import { colors, spacing, radius, fontSize } from '@/theme/tokens';
import type { UnlockedAchievement } from '@/store/achievements';

const { height: SCREEN_H } = Dimensions.get('window');
const CONFETTI_COLORS = ['#FFD700', '#FF3B3B', '#FF7A00', '#1E90FF', '#22C55E', '#8B5CF6'];

interface Particle {
  angle: number;
  distance: number;
  color: string;
  size: number;
  spin: number;
  delay: number;
}

function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5;
    return {
      angle,
      distance: 90 + Math.random() * 130,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 7,
      spin: (Math.random() - 0.5) * 8,
      delay: Math.random() * 80,
    };
  });
}

interface Props {
  queue: UnlockedAchievement[];
  visible: boolean;
  onClose: () => void;
}

export function AchievementUnlockModal({ queue, visible, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const particles = useMemo(() => makeParticles(18), []);

  const backdrop = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const medalScale = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  const current = queue[index] ?? null;

  // Reinicia al inicio de la cola cada vez que se abre.
  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  useEffect(() => {
    if (!visible || !current) return;

    backdrop.setValue(0);
    ringScale.setValue(0.2);
    ringOpacity.setValue(0);
    medalScale.setValue(0);
    content.setValue(0);
    burst.setValue(0);
    shine.setValue(0);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const anim = Animated.sequence([
      Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.parallel([
        // Anillo que estalla hacia afuera
        Animated.timing(ringScale, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.9, duration: 160, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]),
        // Confeti
        Animated.timing(burst, { toValue: 1, duration: 950, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        // Medalla con rebote
        Animated.spring(medalScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(content, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(shine, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    // Cancela la secuencia si el modal se cierra o avanza de nivel antes de
    // terminar — evita tocar Animated.Value/estado tras desmontar.
    return () => anim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index, current?.tier.id]);

  if (!current) return null;

  const isLast = index >= queue.length - 1;
  const color = current.def.color;

  const handleNext = () => {
    if (isLast) {
      Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleNext}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.82)',
          opacity: backdrop,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
        }}
      >
        {/* Glow ambiental del color del logro */}
        <LinearGradient
          colors={[`${color}26`, 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_H * 0.6 }}
        />

        {/* Anillo expansivo */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: 90,
            borderWidth: 2,
            borderColor: color,
            opacity: ringOpacity,
            transform: [{ scale: ringScale.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6] }) }],
          }}
        />

        {/* Confeti */}
        <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, top: SCREEN_H * 0.36 }}>
          {particles.map((p, i) => {
            const tx = burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
            const ty = burst.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.sin(p.angle) * p.distance + 140], // + gravedad
            });
            const rotate = burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin * 360}deg`] });
            const opacity = burst.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] });
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: p.size,
                  height: p.size * 1.4,
                  borderRadius: 2,
                  backgroundColor: p.color,
                  opacity,
                  transform: [{ translateX: tx }, { translateY: ty }, { rotate }],
                }}
              />
            );
          })}
        </View>

        {/* Medalla */}
        <Animated.View style={{ transform: [{ scale: medalScale }], alignItems: 'center' }}>
          <View
            style={{
              width: 132,
              height: 132,
              borderRadius: 66,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 22,
              elevation: 14,
            }}
          >
            <LinearGradient
              colors={[color, `${color}88`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', width: 132, height: 132 }}
            />
            <View
              style={{
                width: 98,
                height: 98,
                borderRadius: 49,
                backgroundColor: colors.bg.elevated,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <Icon name={current.def.icon} size={46} color={color} />
            </View>
            {/* Brillo que barre la medalla */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 40,
                backgroundColor: 'rgba(255,255,255,0.35)',
                transform: [
                  { rotate: '20deg' },
                  { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] }) },
                ],
              }}
            />
          </View>
        </Animated.View>

        {/* Texto */}
        <Animated.View
          style={{
            opacity: content,
            transform: [{ translateY: content.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            alignItems: 'center',
            marginTop: spacing.xl,
          }}
        >
          <Text variant="label" tracking="widest" style={{ color }}>
            LOGRO DESBLOQUEADO
          </Text>
          <Text
            tracking="tight"
            style={{
              fontSize: fontSize['2xl'],
              fontWeight: '900',
              color: colors.text.primary,
              textAlign: 'center',
              marginTop: spacing.sm,
            }}
          >
            {current.def.title}
          </Text>
          <View
            style={{
              marginTop: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: 6,
              borderRadius: radius.full,
              backgroundColor: `${color}22`,
              borderWidth: 1,
              borderColor: `${color}66`,
            }}
          >
            <Text weight="bold" style={{ color }}>
              {current.tier.label}
            </Text>
          </View>
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.md, textAlign: 'center' }}>
            {current.def.description}
          </Text>

          {queue.length > 1 && (
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }} numeric>
              {index + 1} / {queue.length}
            </Text>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: content, alignSelf: 'stretch', marginTop: spacing['2xl'] }}>
          <Button
            title={isLast ? '¡Genial!' : 'Siguiente'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleNext}
          />
        </Animated.View>

        {/* Tap fuera del botón también avanza */}
        <Pressable
          onPress={handleNext}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_H * 0.2 }}
        />
      </Animated.View>
    </Modal>
  );
}
