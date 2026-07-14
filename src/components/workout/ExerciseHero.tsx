import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { exerciseImage } from '@/data/exerciseImages';

interface Props {
  exerciseId: string;
  name: string;
  subtitle?: string;
  /** El alto lo controla el padre (flex / maxHeight). */
  style?: StyleProp<ViewStyle>;
  /** Si se pasa, la tarjeta se vuelve pulsable y muestra el affordance "Ficha". */
  onPress?: () => void;
}

/**
 * Tarjeta hero del ejercicio: imagen a sangre con gradiente inferior para
 * legibilidad y el nombre grande encima. Fallback a icono si no hay imagen.
 * Con `onPress`, la tarjeta abre la ficha del ejercicio (hub de detalle) y
 * muestra una píldora "Ficha" en la esquina superior derecha.
 */
export function ExerciseHero({ exerciseId, name, subtitle, style, onPress }: Props) {
  const img = exerciseImage(exerciseId);

  const cardStyle: StyleProp<ViewStyle> = [
    {
      borderRadius: radius['3xl'],
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 3,
      borderBottomColor: colors.bg.cardEdge,
      backgroundColor: colors.bg.elevated,
      minHeight: 160,
    },
    style,
  ];

  const inner = (
    <>
      {img !== undefined ? (
        <Image
          source={img}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}
        >
          <Icon name="dumbbell" size={48} color={colors.text.muted} />
        </View>
      )}

      {/* Gradiente transparente → casi negro en la mitad inferior */}
      <LinearGradient
        colors={['transparent', 'rgba(11,11,11,0.94)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }}
      />

      {/* Affordance "Ficha": solo cuando la tarjeta es pulsable */}
      {onPress ? (
        <View
          style={{
            position: 'absolute',
            top: spacing.sm,
            right: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingLeft: spacing.md,
            paddingRight: spacing.sm,
            paddingVertical: 5,
            borderRadius: radius.full,
            backgroundColor: colors.bg.overlay,
          }}
        >
          <Text variant="caption" weight="semibold">
            Ficha
          </Text>
          <Icon name="chevron-right" size={13} color={colors.text.primary} />
        </View>
      ) : null}

      <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing.lg }}>
        <Text
          tracking="tight"
          style={{
            fontSize: fontSize['2xl'],
            fontWeight: '900',
            color: colors.text.primary,
          }}
          numberOfLines={2}
        >
          {name}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} pressScale={0.98} style={cardStyle}>
        {inner}
      </PressableScale>
    );
  }

  return <View style={cardStyle}>{inner}</View>;
}
