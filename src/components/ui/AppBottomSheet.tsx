/**
 * AppBottomSheet — hoja inferior declarativa sobre @gorhom/bottom-sheet.
 *
 * Úsalo para menús de acciones (action sheets), formularios cortos y selectores
 * que suben desde abajo. NO lo uses para celebraciones (logros / PR) ni para
 * diálogos centrados de confirmación: esos van con `Modal` centrado.
 *
 * API declarativa: controla la visibilidad con `visible` + `onClose`. El swipe
 * hacia abajo y el toque en el backdrop también disparan `onClose`. El contenido
 * es responsable de su propio padding inferior (`insets.bottom + spacing.lg`);
 * el wrapper no lo añade.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { colors, radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

export interface AppBottomSheetProps {
  visible: boolean;
  /** Llamado también en onDismiss (swipe hacia abajo o toque en el backdrop). */
  onClose: () => void;
  /** Ignorado si `enableDynamicSizing`. Por defecto ['60%']. */
  snapPoints?: (string | number)[];
  /** true para action sheets: la hoja se ajusta a la altura del contenido. */
  enableDynamicSizing?: boolean;
  keyboardBehavior?: 'extend' | 'interactive' | 'fillParent';
  /** Passthrough al gesto de arrastre sobre el contenido. */
  enableContentPanningGesture?: boolean;
  /** Cabecera opcional (Text semibold centrado). */
  title?: string;
  /**
   * Footer nativo de gorhom, pinneado sobre el teclado. Úsalo para inputs fijos
   * (p. ej. la barra de comentarios): recibe `animatedFooterPosition` y debe
   * renderizar `<BottomSheetFooter {...props}>`. No lo montes como `children`.
   */
  footerComponent?: React.FC<BottomSheetFooterProps>;
  children: React.ReactNode;
}

export const AppBottomSheet = forwardRef<BottomSheetModal, AppBottomSheetProps>(
  function AppBottomSheet(
    {
      visible,
      onClose,
      snapPoints = ['60%'],
      enableDynamicSizing = false,
      keyboardBehavior,
      enableContentPanningGesture = true,
      title,
      footerComponent,
      children,
    },
    ref,
  ) {
    const sheetRef = useRef<BottomSheetModal>(null);
    // Expone la instancia interna para casos avanzados (present/dismiss/snapTo).
    useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal);

    // La visibilidad manda: presenta o descarta la hoja según cambie `visible`.
    useEffect(() => {
      if (visible) sheetRef.current?.present();
      else sheetRef.current?.dismiss();
    }, [visible]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.7}
          pressBehavior="close"
        />
      ),
      [],
    );

    const handleDismiss = useCallback(() => {
      // Solo propaga si el consumidor aún cree que está abierto: evita un doble
      // onClose cuando el cierre lo originó el propio consumidor (visible=false).
      if (visible) onClose();
    }, [visible, onClose]);

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={enableDynamicSizing ? undefined : snapPoints}
        enableDynamicSizing={enableDynamicSizing}
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        footerComponent={footerComponent}
        backgroundStyle={{
          backgroundColor: colors.bg.card,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong, width: 36 }}
        keyboardBehavior={keyboardBehavior}
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableContentPanningGesture={enableContentPanningGesture}
      >
        {title ? (
          <View style={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg }}>
            <Text weight="semibold" style={{ textAlign: 'center' }}>
              {title}
            </Text>
          </View>
        ) : null}
        {children}
      </BottomSheetModal>
    );
  },
);
