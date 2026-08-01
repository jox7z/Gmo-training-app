/**
 * ScreenHeader — cabecera única de pantalla.
 *
 * Sustituye las cabeceras dibujadas a mano en `app/*` (Pressable crudo + título
 * suelto). Garantiza el mismo alto, el mismo botón atrás accesible y el mismo
 * tratamiento de título/descripción/acciones en todas las rutas.
 */
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, spacing } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props {
  title: string;
  /** Descripción breve bajo el título: qué es esta pantalla o su estado. */
  subtitle?: string;
  /** Muestra el botón atrás. Desactívalo en raíces de pila. */
  showBack?: boolean;
  /** Sustituye la navegación por defecto (`router.back()`). */
  onBack?: () => void;
  /**
   * Afordancia del control: `chevron-left` navega en pila, `close` cierra una
   * hoja modal. Debe coincidir con la `presentation` declarada en `_layout`.
   */
  backIcon?: 'chevron-left' | 'close';
  backAccessibilityLabel?: string;
  /** Acciones principales de la pantalla, alineadas a la derecha. */
  right?: ReactNode;
  /** Separador inferior. Úsalo cuando la cabecera va a ancho completo. */
  border?: boolean;
  /** Aplica el padding horizontal estándar. Desactívalo si el contenedor ya lo pone. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  backIcon = 'chevron-left',
  backAccessibilityLabel,
  right,
  border = false,
  padded = true,
  style,
}: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) router.back();
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: spacing['3xl'] + spacing.md,
          paddingHorizontal: padded ? spacing.lg : 0,
          paddingVertical: spacing.md,
        },
        border && {
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      {showBack ? (
        <IconButton
          name={backIcon}
          accessibilityLabel={
            backAccessibilityLabel ?? (backIcon === 'close' ? 'Cerrar' : 'Volver')
          }
          onPress={handleBack}
          variant="surface"
          size="sm"
        />
      ) : null}

      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="heading" weight="bold" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {right}
        </View>
      ) : null}
    </View>
  );
}
