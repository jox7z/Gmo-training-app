import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { exerciseImage } from '@/data/exerciseImages';

interface Props {
  exerciseId: string;
  name: string;
  subtitle?: string;
  /** El alto lo controla el padre (flex / maxHeight). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Tarjeta hero del ejercicio: imagen a sangre con gradiente inferior para
 * legibilidad y el nombre grande encima. Fallback a icono si no hay imagen.
 */
export function ExerciseHero({ exerciseId, name, subtitle, style }: Props) {
  const img = exerciseImage(exerciseId);

  return (
    <View
      style={[
        {
          borderRadius: radius['3xl'],
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.accent.DEFAULT,
          backgroundColor: colors.bg.elevated,
          minHeight: 160,
        },
        style,
      ]}
    >
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

      <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing.lg }}>
        <Text
          style={{
            fontSize: fontSize['2xl'],
            fontWeight: '900',
            color: colors.text.primary,
            letterSpacing: -0.5,
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
    </View>
  );
}
