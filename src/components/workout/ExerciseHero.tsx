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
 * Imagen hero del ejercicio con un único scrim funcional para legibilidad.
 * Sin borde decorativo ni brillo.
 */
export function ExerciseHero({ exerciseId, name, subtitle, style }: Props) {
  const img = exerciseImage(exerciseId);

  return (
    <View
      style={[
        {
          borderRadius: radius.lg,
          overflow: 'hidden',
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

      {/* Único gradiente funcional: lectura del nombre sobre la foto. */}
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
