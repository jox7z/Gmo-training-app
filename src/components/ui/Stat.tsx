/**
 * Stat — indicador único de la app: una etiqueta y un valor.
 *
 * Es la fuente única del patrón "label + número". Sustituye a `MiniStat`,
 * `WorkoutStat` y `SocialStat`, que repetían el mismo bloque con tipografías
 * y órdenes distintos.
 *
 * Solo presenta datos ya calculados: no deriva, no compara y no emite juicios.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, spacing, type TypographyVariant } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type StatTone = 'default' | 'brand' | 'accent' | 'info' | 'success' | 'danger';
type StatSize = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  icon?: IconName;
  tone?: StatTone;
  size?: StatSize;
  align?: 'left' | 'center';
  /** `value-first` para contadores sociales; `label-first` para métricas de sesión. */
  layout?: 'label-first' | 'value-first';
  onPress?: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const VALUE_VARIANT: Record<StatSize, TypographyVariant> = {
  sm: 'body',
  md: 'heading',
  lg: 'metric',
};

const LABEL_VARIANT: Record<StatSize, TypographyVariant> = {
  sm: 'caption',
  md: 'caption',
  lg: 'label',
};

const TONE_MAP: Record<StatTone, 'primary' | 'brand' | 'accent' | 'info' | 'success' | 'danger'> = {
  default: 'primary',
  brand: 'brand',
  accent: 'accent',
  info: 'info',
  success: 'success',
  danger: 'danger',
};

export function Stat({
  label,
  value,
  unit,
  icon,
  tone = 'default',
  size = 'lg',
  align = 'left',
  layout = 'label-first',
  onPress,
  accessibilityHint,
  style,
}: Props) {
  const valueTone = TONE_MAP[tone];
  const centered = align === 'center';

  const labelNode = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        justifyContent: centered ? 'center' : 'flex-start',
      }}
    >
      {icon ? (
        <Icon
          name={icon}
          size={size === 'sm' ? spacing.md : spacing.lg}
          color={tone === 'default' ? colors.text.muted : colors.text.secondary}
        />
      ) : null}
      <Text variant={LABEL_VARIANT[size]} tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  const valueNode = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.xs,
        justifyContent: centered ? 'center' : 'flex-start',
      }}
    >
      <Text variant={VALUE_VARIANT[size]} tone={valueTone} weight="bold" numeric>
        {value}
      </Text>
      {unit ? (
        <Text variant={size === 'lg' ? 'body' : 'caption'} tone="secondary">
          {unit}
        </Text>
      ) : null}
    </View>
  );

  const content = (
    <View style={{ gap: spacing.xs, alignItems: centered ? 'center' : 'stretch' }}>
      {layout === 'label-first' ? labelNode : valueNode}
      {layout === 'label-first' ? valueNode : labelNode}
    </View>
  );

  const accessibilityLabel = `${label}: ${value}${unit ? ` ${unit}` : ''}`;

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel} style={style}>
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={spacing.sm}
      pressScale={0.95}
      haptic={false}
      style={style}
    >
      {content}
    </PressableScale>
  );
}
