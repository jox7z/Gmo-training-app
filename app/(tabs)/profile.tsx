import { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/Avatar';
import { RankBadge } from '@/components/RankBadge';
import { Heatmap } from '@/components/Heatmap';
import { ActivityCard, ActivityItem } from '@/components/ActivityCard';
import { Icon, IconName } from '@/components/Icon';
import { colors, spacing, radius } from '@/theme/tokens';
import { Loader } from '@/components/ui/Loader';
import { useAppStore } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { formatDuration } from '@/lib/units';

const BADGES: { id: string; label: string; icon: IconName; color: string; earned: boolean }[] = [
  { id: 'first', label: 'Primer workout', icon: 'medal', color: '#CD7F32', earned: true },
  { id: 'streak3', label: 'Racha 3 sem', icon: 'fire', color: colors.accent.DEFAULT, earned: true },
  { id: 'streak10', label: 'Racha 10 sem', icon: 'fire', color: colors.accent.DEFAULT, earned: false },
  { id: 'volume', label: 'Bestia +10t', icon: 'muscle', color: colors.primary.DEFAULT, earned: false },
  { id: 'early', label: 'Madrugador', icon: 'seedling', color: colors.success, earned: true },
  { id: 'social', label: 'Influencer', icon: 'target', color: colors.info.DEFAULT, earned: false },
];

export default function Profile() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const streakWeeks = useAppStore((s) => s.streakWeeks);
  const history = useWorkoutsStore((s) => s.history);

  // useMemo ANTES del early return. Lee profile con optional chaining para
  // que sea seguro cuando profile === null durante el sign-out (un render
  // transitorio antes de que _layout desmonte esta pantalla).
  const recent: ActivityItem[] = useMemo(
    () =>
      history.slice(0, 3).map((w) => ({
        id: w.id,
        title: w.routineName ?? 'Entrenamiento libre',
        subtitle: `${w.exercises.length} ejercicios`,
        date: new Date(w.startedAt).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }),
        durationLabel: formatDuration(w.durationSeconds ?? 0),
        volumeLabel: `${Math.round(w.totalVolumeKg).toLocaleString()} kg`,
        setsLabel: String(w.exercises.reduce((b, e) => b + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length, 0)),
        feeling: w.feeling,
        photoUri: w.photoUri,
        type: 'workout',
        authorName: profile?.displayName ?? '',
        authorAvatarUrl: profile?.avatarUrl,
      })),
    [history, profile?.displayName, profile?.avatarUrl],
  );

  if (!profile) return <Loader />;

  const totalSets = history.reduce(
    (a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length, 0),
    0,
  );
  const totalDuration = history.reduce((a, w) => a + (w.durationSeconds ?? 0), 0);
  const totalVolume = history.reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0);

  const earnedCount = BADGES.filter((b) => b.earned).length;

  return (
    <Screen>
      {/* Top bar: avatar (left) — title — gear (right) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.xl,
        }}
      >
        <Pressable
          onPress={() => router.push('/profile/social')}
          hitSlop={10}
          style={({ pressed }) => [pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <Avatar uri={profile.avatarUrl} name={profile.displayName} size={44} />
        </Pressable>
        <Text variant="heading" weight="bold">Tú</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <IconButton icon="robot" onPress={() => router.push('/coach')} tone="info" />
          <IconButton icon="settings" onPress={() => router.push('/profile/settings')} tone="default" />
        </View>
      </View>

      {/* Identity card */}
      <Pressable onPress={() => router.push('/profile/social')}>
        <Card padding="lg" variant="elevated">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <Avatar uri={profile.avatarUrl} name={profile.displayName} size={80} />
            <View style={{ flex: 1 }}>
              <Text variant="title">{profile.displayName}</Text>
              <Text variant="caption" tone="muted">@{profile.username}</Text>
              {!!profile.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Icon name="map-pin" size={12} color={colors.text.muted} />
                  <Text variant="caption" tone="muted">{profile.location}</Text>
                </View>
              )}
            </View>
            <Icon name="chevron-right" size={20} color={colors.text.muted} />
          </View>

          {!!profile.bio && (
            <Text variant="caption" tone="secondary" style={{ marginTop: spacing.md }}>
              {profile.bio}
            </Text>
          )}

          {/* Followers row */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: spacing.lg,
              paddingTop: spacing.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <SocialStat label="Seguidores" value={profile.followers} />
            <Divider />
            <SocialStat label="Siguiendo" value={profile.following} />
            <Divider />
            <SocialStat label="Actividades" value={history.length} />
          </View>
        </Card>
      </Pressable>

      {/* Rank */}
      <Card padding="lg" variant="outlined" style={{ marginTop: spacing.md }}>
        <RankBadge points={profile.rankPoints} size="lg" showProgress />
      </Card>

      {/* Big stats grid */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
        <Card padding="lg" style={{ flex: 1 }}>
          <Stat label="Workouts" value={history.length} tone="brand" />
        </Card>
        <Card padding="lg" style={{ flex: 1 }}>
          <Stat label="Racha" value={streakWeeks} unit="sem" tone="accent" />
        </Card>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
        <Card padding="lg" style={{ flex: 1 }}>
          <Stat label="Sets" value={totalSets.toLocaleString()} tone="info" />
        </Card>
        <Card padding="lg" style={{ flex: 1 }}>
          <Stat label="Tiempo" value={formatDuration(totalDuration)} tone="info" />
        </Card>
      </View>
      <Card padding="lg" style={{ marginTop: spacing.md }}>
        <Stat label="Volumen total" value={`${Math.round(totalVolume).toLocaleString()} ${profile.unit}`} tone="brand" />
      </Card>

      {/* Heatmap */}
      <View style={{ marginTop: spacing['2xl'] }}>
        <Heatmap />
      </View>

      {/* Achievements preview */}
      <SectionHeader
        title="Logros"
        right={`${earnedCount}/${BADGES.length}`}
        onPress={() => router.push('/profile/social')}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {BADGES.slice(0, 4).map((b) => (
          <Card
            key={b.id}
            padding="md"
            variant={b.earned ? 'glow' : 'outlined'}
            glowColor={b.color}
            style={{ width: '47%', alignItems: 'center', opacity: b.earned ? 1 : 0.4 }}
          >
            <Icon name={b.icon} size={28} color={b.color} />
            <Text variant="caption" weight="bold" style={{ marginTop: 6, textAlign: 'center' }}>
              {b.label}
            </Text>
            {b.earned && <Badge label="Conseguido" tone="accent" />}
          </Card>
        ))}
      </View>

      {/* Recent activity */}
      <SectionHeader
        title="Actividad reciente"
        right={recent.length ? 'Ver todo' : undefined}
        onPress={recent.length ? () => router.push('/profile/social') : undefined}
      />
      {recent.length ? (
        <View style={{ gap: spacing.md }}>
          {recent.map((a) => (
            <ActivityCard key={a.id} item={a} compact onPress={() => router.push('/profile/social')} />
          ))}
        </View>
      ) : (
        <Card padding="lg" variant="outlined" style={{ alignItems: 'center' }}>
          <Icon name="dumbbell" size={28} color={colors.text.muted} />
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
            Aún no has registrado entrenamientos. {'\n'}Empieza tu primera rutina.
          </Text>
        </Card>
      )}

      <Text variant="caption" tone="muted" style={{ marginTop: spacing['2xl'], textAlign: 'center' }}>
        Gmo Training App · v0.1.0
      </Text>
    </Screen>
  );
}

function IconButton({
  icon,
  onPress,
  tone = 'default',
}: {
  icon: IconName;
  onPress?: () => void;
  tone?: 'default' | 'info';
}) {
  const bg = tone === 'info' ? colors.info.soft : colors.bg.elevated;
  const border = tone === 'info' ? colors.info.DEFAULT : colors.border;
  const fg = tone === 'info' ? colors.info.DEFAULT : colors.text.primary;
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [pressed && { transform: [{ scale: 0.92 }] }]}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={18} color={fg} />
      </View>
    </Pressable>
  );
}

function SocialStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="heading" weight="bold" numeric>{value.toLocaleString()}</Text>
      <Text variant="label" tone="muted" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 4 }} />;
}

function SectionHeader({
  title,
  right,
  onPress,
}: {
  title: string;
  right?: string;
  onPress?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing['2xl'],
        marginBottom: spacing.md,
      }}
    >
      <Text variant="heading">{title}</Text>
      {right ? (
        <Pressable onPress={onPress} hitSlop={6}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="caption" tone="secondary" weight="semibold">{right}</Text>
            {onPress && <Icon name="chevron-right" size={14} color={colors.text.secondary} />}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
