/**
 * SupersetBadge — indicador no interactivo que muestra que el ejercicio en curso
 * forma un grupo (superset/triset/circuito) con sus compañeros. Presentacional
 * puro: un `Chip` sin onPress. La etiqueta se adapta al tamaño total del grupo.
 */
import { Chip } from '@/components/ui/Chip';
import { supersetLabel } from '@/lib/supersets';

interface Props {
  partnerNames: string[];
}

// Con un circuito de 4 (hasta 3 compañeros) la lista de nombres concatenada podría
// desbordar la píldora — acota a 2 nombres y resume el resto en vez de dejar que
// el Chip (sin numberOfLines) crezca sin límite.
function joinPartnerNames(names: string[]): string {
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`;
}

export function SupersetBadge({ partnerNames }: Props) {
  const label = `${supersetLabel(partnerNames.length + 1)} · con ${joinPartnerNames(partnerNames)}`;
  return <Chip label={label} leftIcon="link" variant="outline" />;
}
