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
import {
  useCallback,
  useEffect,
  useRef,
  type Component,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  InteractionManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type HostInstance,
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
  /** Eleva una hoja inferior sobre el teclado abierto. */
  keyboardOffset?: number;
  /** Destino anunciado al mostrarse; por defecto usa el título. */
  initialFocusRef?: RefObject<HostInstance | null>;
  /** Control nativo que abrió la hoja. */
  returnFocusTarget?: HostInstance | number | null;
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
  keyboardOffset = 0,
  initialFocusRef,
  returnFocusTarget,
  contentStyle,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const headingRef = useRef<View | null>(null);
  const wasVisibleRef = useRef(false);

  const isBottom = variant === 'bottom';
  const safeKeyboardOffset =
    isBottom && Number.isFinite(keyboardOffset)
      ? Math.max(0, Math.min(height * 0.7, keyboardOffset))
      : 0;
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

  const focusInitialElement = useCallback(() => {
    const handle = resolveNodeHandle(
      initialFocusRef?.current ?? headingRef.current,
    );
    if (typeof handle === 'number') {
      AccessibilityInfo.setAccessibilityFocus(handle);
    }
  }, [initialFocusRef]);

  useEffect(() => {
    if (visible) {
      wasVisibleRef.current = true;
      return;
    }
    if (!wasVisibleRef.current) return;
    wasVisibleRef.current = false;
    const returnHandle = resolveNodeHandle(returnFocusTarget);
    if (typeof returnHandle !== 'number') return;

    const task = InteractionManager.runAfterInteractions(() => {
      AccessibilityInfo.setAccessibilityFocus(returnHandle);
    });
    return () => task.cancel();
  }, [returnFocusTarget, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      onShow={focusInitialElement}
      statusBarTranslucent
    >
      <View
        style={[
          styles.root,
          isBottom ? styles.rootBottom : styles.rootCenter,
          safeKeyboardOffset > 0 && {
            paddingBottom: safeKeyboardOffset,
          },
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
                  maxHeight:
                    safeKeyboardOffset > 0
                      ? height - safeKeyboardOffset
                      : height * maxHeightRatio,
                  paddingBottom:
                    safeKeyboardOffset > 0 ? 0 : insets.bottom,
                  borderBottomWidth: 0,
                }
              : { maxHeight: height * 0.8, borderWidth: 1 },
            contentStyle,
          ]}
        >
          {isBottom ? <View style={styles.grabber} /> : null}

          {hasHeader ? (
            <View style={styles.header}>
              <View
                ref={headingRef}
                accessible={Boolean(title || subtitle)}
                accessibilityRole={title || subtitle ? 'header' : undefined}
                accessibilityLabel={
                  [title, subtitle].filter(Boolean).join('. ') || undefined
                }
                style={{ flex: 1, gap: spacing.xs }}
              >
                {title ? (
                  <Text
                    accessible={false}
                    variant="heading"
                    weight="bold"
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text
                    accessible={false}
                    variant="caption"
                    tone="secondary"
                    numberOfLines={2}
                  >
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

function resolveNodeHandle(
  target: HostInstance | number | null | undefined,
): number | null {
  if (typeof target === 'number') return target;
  return findNodeHandle(
    (target ?? null) as Component<unknown, unknown> | null,
  ) ?? null;
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
