// Iconos de la tab bar: wrapper fino sobre la fachada Icon (lucide).
import { Icon, IconName } from '@/components/Icon';
import { colors } from '@/theme/tokens';

type Name = 'home' | 'routines' | 'feed' | 'profile' | 'progress';

interface Props {
  name: Name;
  color: string;
  focused: boolean;
}

const ICON_BY_TAB: Record<Name, IconName> = {
  home: 'home',
  routines: 'layout-grid',
  feed: 'globe',
  progress: 'chart',
  profile: 'user',
};

export function TabIcon({ name, color }: Props) {
  return <Icon name={ICON_BY_TAB[name]} size={26} color={color || colors.text.muted} />;
}
