/**
 * Sheet — chrome único para modales y hojas.
 *
 * Unifica backdrop, radios, cabecera, cierre y safe area de los modales que
 * hoy se dibujan a mano con `<Modal>` (cada uno con su propio `animationType`,
 * su propio velo y su propio botón de cerrar).
 *
 * - `variant="bottom"`: hoja anclada abajo, para selectores y detalles largos.
 * - `variant="center"`: diálogo centrado, para confirmaciones y avisos cortos.
 *
 * Respeta "reducir movimiento": desactiva la animación de entrada.
 */
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { useReduceMotion } from './useReduceMotion';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Descripción breve bajo el título. */
  subtitle?: string;
  variant?: 'bottom' | 'center';
  /** Altura máxima como fracción de la ventana. Solo aplica a `bottom`. */
  maxHeightRatio?: number;
  /** Envuelve el contenido en un ScrollView. */
  scroll?: boolean;
  /** Cerrar al tocar el velo. Desactívalo en flujos que exigen decisión. */
  dismissOnBackdrop?: boolean;
  showClose?: boolean;
  closeAccessibilityLabel?: string;
  /** Zona fija inferior para acciones. */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  variant = 'bottom',
  maxHeightRatio = 0.85,
  scroll = false,
  dismissOnBackdrop = true,
  showClose = true,
  closeAccessibilityLabel = 'Cerrar',
  footer,
  contentStyle,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const isBottom = variant === 'bottom';
  const animationType = reduceMotion ? 'none' : isBottom ? 'slide' : 'fade';
  const hasHeader = Boolean(title) || showClose;

  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? {
        contentContainerStyle: { padding: spacing.lg, gap: spacing.md },
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: 'handled' as const,
      }
    : { style: { padding: spacing.lg, gap: spacing.md } };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.root,
          isBottom ? styles.rootBottom : styles.rootCenter,
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
          accessible={dismissOnBackdrop}
          accessibilityRole={dismissOnBackdrop ? 'button' : undefined}
          accessibilityLabel={dismissOnBackdrop ? closeAccessibilityLabel : undefined}
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.panel,
            isBottom
              ? {
                  maxHeight: height * maxHeightRatio,
                  paddingBottom: insets.bottom,
                  borderBottomWidth: 0,
                }
              : { maxHeight: height * 0.8, borderWidth: 1 },
            contentStyle,
          ]}
        >
          {isBottom ? <View style={styles.grabber} /> : null}

          {hasHeader ? (
            <View style={styles.header}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                {title ? (
                  <Text variant="heading" weight="bold" numberOfLines={1} accessibilityRole="header">
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text variant="caption" tone="secondary" numberOfLines={2}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {showClose ? (
                <IconButton
                  name="close"
                  accessibilityLabel={closeAccessibilityLabel}
                  onPress={onClose}
                  variant="ghost"
                  size="sm"
                />
              ) : null}
            </View>
          ) : null}

          <Body {...bodyProps}>{children}</Body>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
  },
  rootBottom: {
    justifyContent: 'flex-end',
  },
  rootCenter: {
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: spacing['2xl'] + spacing.sm,
    height: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
