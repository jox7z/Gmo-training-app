import { type DimensionValue, View, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

interface SkeletonProps extends Omit<ViewProps, 'children'> {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}

/** Placeholder estático para carga inicial. */
export function Skeleton({
  width = '100%',
  height = 12,
  borderRadius = radius.sm,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <View
      {...rest}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius, backgroundColor: colors.bg.track, opacity: 0.65 }, style]}
    />
  );
}

export function SkeletonRows({
  rows = 6,
  avatar = true,
  accessibilityLabel = 'Cargando lista',
}: {
  rows?: number;
  avatar?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <SkeletonGroup accessibilityLabel={accessibilityLabel} style={{ gap: spacing.md }}>
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}
        >
          {avatar ? <Skeleton width={44} height={44} borderRadius={radius.full} /> : null}
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton width="56%" height={12} />
            <Skeleton width="34%" height={10} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

export function SkeletonGroup({
  accessibilityLabel = 'Cargando contenido',
  accessibilityState,
  children,
  ...rest
}: ViewProps) {
  return (
    <View
      {...rest}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityState={{ ...accessibilityState, busy: true }}
    >
      {children}
    </View>
  );
}
