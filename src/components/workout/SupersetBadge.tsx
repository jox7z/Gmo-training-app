/**
 * SupersetBadge — indicador no interactivo que muestra que el ejercicio en curso
 * forma un superset con su compañero. Presentacional puro: un `Chip` sin onPress.
 */
import { Chip } from '@/components/ui/Chip';

interface Props {
  partnerName: string;
}

export function SupersetBadge({ partnerName }: Props) {
  return <Chip label={`Superset · con ${partnerName}`} leftIcon="link" variant="outline" />;
}
