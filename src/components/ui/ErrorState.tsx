import { StyleProp, ViewStyle } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Estado de error reutilizable: envoltura fina de EmptyState con tono `danger`,
 * icono `close` y un botón "Reintentar" (variante `secondary`, igual que
 * FeedErrorState). `onRetry` opcional: sin él no se muestra el botón.
 */
export function ErrorState({
  title = 'No se pudo cargar',
  message = 'Revisa tu conexión y vuelve a intentarlo.',
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <EmptyState
      tone="danger"
      icon="close"
      title={title}
      subtitle={message}
      action={onRetry ? { label: 'Reintentar', onPress: onRetry, variant: 'secondary' } : undefined}
      style={style}
    />
  );
}
