/**
 * LeaderboardRow — fila compartida de leaderboard.
 * Consolida las dos filas que existían duplicadas: el ranking global de
 * `app/discover.tsx` (tarjetas sueltas, navegables) y el leaderboard por rango
 * de `app/(tabs)/progress.tsx` (filas dentro de una Card compartida).
 *
 * Ejes de configuración:
 * - `variant`: 'card' → cada fila es su propia Card (lista con gap, discover);
 *              'list' → fila plana con divisor, pensada para ir DENTRO de una
 *              Card contenedora (progress).
 * - `onPress`: su sola presencia hace la fila navegable (PressableScale). Sin
 *              `onPress` la fila es estática — así el modo "Mi rango" de
 *              progress mantiene el comportamiento actual (no navega) y el
 *              global navega al perfil, sin un flag extra tipo `navigable`.
 * - `isMe` / `isFollowing`: banderas sociales; `isMe` tiñe el fondo y añade
 *              "(tú)", `isFollowing` marca la relación en la línea del @username.
 *
 * Acepta cualquier entrada estructural (`LeaderboardEntry` de la query por
 * rango y `GlobalRankEntry` del RPC `global_leaderboard`): ambas cumplen
 * `LeaderboardRowEntry`.
 */
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radius, spacing, RANKS, podiumColor, type RankId } from '@/theme/tokens';

export interface LeaderboardRowEntry {
  id: string;
  username: string;
  displayName: string;
  currentRank: RankId;
  rankPoints: number;
  avatarUrl?: string;
}

interface Props {
  entry: LeaderboardRowEntry;
  /** Posición 1-based (colorea el número vía podiumColor). */
  position: number;
  /** 'card' = tarjeta suelta; 'list' = fila dentro de una Card contenedora. */
  variant?: 'card' | 'list';
  /** Resalta la fila del usuario actual. */
  isMe?: boolean;
  /** Marca que el usuario actual sigue a este atleta. */
  isFollowing?: boolean;
  /** Solo en variant='list': divisor inferior (falso en el último). */
  showDivider?: boolean;
  /** Si se pasa, la fila es pulsable (típicamente navega al perfil). */
  onPress?: () => void;
}

export function LeaderboardRow({
  entry,
  position,
  variant = 'list',
  isMe = false,
  isFollowing = false,
  showDivider = false,
  onPress,
}: Props) {
  const info = RANKS.find((r) => r.id === entry.currentRank) ?? RANKS[0];
  const posColor = podiumColor(position);
  const isCard = variant === 'card';

  const inner = (
    <>
      <Text
        weight={isCard ? 'black' : 'bold'}
        numeric
        style={{
          width: isCard ? 30 : 28,
          textAlign: 'center',
          color: posColor,
          fontSize: isCard ? undefined : 13,
        }}
      >
        {position}
      </Text>
      <Avatar
        uri={entry.avatarUrl}
        name={entry.displayName}
        size={isCard ? 42 : 36}
        borderColor={info.color}
      />
      <View style={{ flex: 1, marginLeft: isCard ? 0 : spacing.sm }}>
        <Text weight={isCard ? 'bold' : 'semibold'} numberOfLines={1}>
          {entry.displayName}
          {isMe ? ' (tú)' : ''}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          @{entry.username}
          {isFollowing && !isMe ? ' · Sigues' : ''}
        </Text>
      </View>
      {isCard ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text weight="bold" numeric style={{ color: info.color }}>
            {entry.rankPoints.toLocaleString()}
          </Text>
          <Text variant="label" tone="muted" style={{ fontSize: 9 }}>
            {info.label}
          </Text>
        </View>
      ) : (
        <Text variant="caption" weight="bold" numeric style={{ color: info.color }}>
          {entry.rankPoints.toLocaleString()}
        </Text>
      )}
    </>
  );

  const body = isCard ? (
    <Card
      padding="md"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: isMe ? colors.primary.muted : undefined,
      }}
    >
      {inner}
    </Card>
  ) : (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.border,
        backgroundColor: isMe ? colors.primary.muted : 'transparent',
        borderRadius: isMe ? radius.md : 0,
      }}
    >
      {inner}
    </View>
  );

  if (!onPress) return body;

  return (
    <PressableScale
      onPress={onPress}
      pressScale={0.98}
      haptic={false}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${entry.displayName}`}
    >
      {body}
    </PressableScale>
  );
}
