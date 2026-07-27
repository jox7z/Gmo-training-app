// Fachada única de iconos de la app: delega en lucide-react-native para el
// grueso del catálogo y mantiene excepciones custom (react-native-svg) para
// glyphs sin equivalente lucide fiel (`scale` báscula, `instagram` sin icono
// de marca en lucide v1). La API pública (IconName + firma de Icon) es
// estable: 156 call sites dependen de ella.
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import {
  Bot,
  Dumbbell,
  BicepsFlexed,
  X,
  ArrowUp,
  ChevronRight,
  ChevronLeft,
  Check,
  Dot,
  Flame,
  Trophy,
  Zap,
  Target,
  Sprout,
  Medal,
  MessageSquare,
  Settings,
  Camera,
  Pencil,
  Lock,
  MapPin,
  Bell,
  Users,
  Share2,
  Image as ImageIcon,
  Globe,
  Eye,
  EyeOff,
  Plus,
  LogOut,
  Heart,
  Calendar,
  Clock,
  Route,
  ChartColumn,
  Search,
  ArrowLeftRight,
  Home,
  User,
  LayoutGrid,
  GripVertical,
  Trash2,
  Link2,
  Unlink2,
  type LucideIcon,
} from 'lucide-react-native';

export type IconName =
  | 'robot'
  | 'dumbbell'
  | 'barbell'
  | 'muscle'
  | 'close'
  | 'send'
  | 'chevron-right'
  | 'chevron-left'
  | 'check'
  | 'dot'
  | 'fire'
  | 'trophy'
  | 'lightning'
  | 'target'
  | 'seedling'
  | 'medal'
  | 'chat'
  | 'settings'
  | 'camera'
  | 'edit'
  | 'lock'
  | 'map-pin'
  | 'bell'
  | 'users'
  | 'share'
  | 'image'
  | 'globe'
  | 'eye'
  | 'eye-off'
  | 'plus'
  | 'logout'
  | 'heart'
  | 'calendar'
  | 'clock'
  | 'route'
  | 'chart'
  | 'search'
  | 'scale'
  | 'swap'
  | 'instagram'
  | 'home'
  | 'user'
  | 'layout-grid'
  | 'grip'
  | 'trash'
  | 'link'
  | 'unlink';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  /** Si true, rellena el path del ícono (usado en reacciones activas: heart/muscle). */
  filled?: boolean;
}

interface RegistryEntry {
  Comp: LucideIcon;
  /** strokeWidth lucide; por defecto 2. */
  strokeWidth?: number;
  /** Si true, `filled` rellena el glyph con `color`. */
  fillable?: boolean;
}

// Mapa nombre → icono lucide. `scale` e `instagram` no están aquí: se dibujan
// a mano (ver Icon()).
const REGISTRY: Record<Exclude<IconName, 'scale' | 'instagram'>, RegistryEntry> = {
  robot: { Comp: Bot },
  dumbbell: { Comp: Dumbbell },
  // Mismo glyph que dumbbell (histórico); lo usa achievements.ts (fuerza).
  barbell: { Comp: Dumbbell },
  muscle: { Comp: BicepsFlexed, fillable: true },
  close: { Comp: X, strokeWidth: 2.5 },
  // Flecha hacia arriba (el glyph histórico era una flecha, no el avión Send).
  send: { Comp: ArrowUp, strokeWidth: 2.5 },
  'chevron-right': { Comp: ChevronRight, strokeWidth: 2.5 },
  'chevron-left': { Comp: ChevronLeft, strokeWidth: 2.5 },
  check: { Comp: Check, strokeWidth: 2.5 },
  dot: { Comp: Dot },
  fire: { Comp: Flame, fillable: true },
  trophy: { Comp: Trophy },
  lightning: { Comp: Zap },
  target: { Comp: Target },
  seedling: { Comp: Sprout },
  medal: { Comp: Medal },
  chat: { Comp: MessageSquare },
  settings: { Comp: Settings },
  camera: { Comp: Camera },
  edit: { Comp: Pencil },
  lock: { Comp: Lock },
  'map-pin': { Comp: MapPin },
  bell: { Comp: Bell },
  users: { Comp: Users },
  share: { Comp: Share2 },
  image: { Comp: ImageIcon },
  globe: { Comp: Globe },
  eye: { Comp: Eye },
  'eye-off': { Comp: EyeOff },
  plus: { Comp: Plus },
  logout: { Comp: LogOut },
  heart: { Comp: Heart, fillable: true },
  calendar: { Comp: Calendar },
  clock: { Comp: Clock },
  route: { Comp: Route },
  // ChartColumn = reemplazo canónico del antiguo BarChart3 (eje-L + barras).
  chart: { Comp: ChartColumn },
  search: { Comp: Search },
  swap: { Comp: ArrowLeftRight },
  home: { Comp: Home },
  user: { Comp: User },
  'layout-grid': { Comp: LayoutGrid },
  // Handle de arrastre (drag & drop del editor de rutina): 6 puntos verticales.
  grip: { Comp: GripVertical },
  trash: { Comp: Trash2 },
  link: { Comp: Link2 },
  unlink: { Comp: Unlink2 },
};

export function Icon({ name, size = 24, color = '#FFFFFF', filled = false }: Props) {
  // `scale` (báscula corporal): sin equivalente lucide fiel, se conserva el SVG a mano.
  if (name === 'scale') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="6" width="18" height="14" rx="2" stroke={color} strokeWidth={2} />
        <Path d="M8 10h8M12 10v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <Circle cx="12" cy="15" r="2" stroke={color} strokeWidth={2} />
      </Svg>
    );
  }

  // `instagram`: lucide v1 quitó los iconos de marca; se conserva el logo
  // simplificado a mano (rectángulo redondeado + círculo + punto de flash).
  if (name === 'instagram') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth={2} />
        <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2} />
        <Circle cx="17.5" cy="6.5" r="1.2" fill={color} />
      </Svg>
    );
  }

  const entry = REGISTRY[name];
  const { Comp } = entry;
  return (
    <Comp
      size={size}
      color={color}
      strokeWidth={entry.strokeWidth ?? 2}
      fill={filled && entry.fillable ? color : 'none'}
    />
  );
}
