import { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/Avatar';
import { RankBadge } from '@/components/RankBadge';
import { ActivityCard, ActivityItem } from '@/components/ActivityCard';
import { Icon, IconName } from '@/components/Icon';
import { Loader } from '@/components/ui/Loader';
import { colors, spacing, radius, rankFromPoints } from '@/theme/tokens';
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
  { id: 'trophy', label: 'Trofeo mes', icon: 'trophy', color: '#FFD700', earned: false },
  { id: 'lightning', label: 'Explosivo', icon: 'lightning', color: colors.accent.DEFAULT, earned: false },
];

type Tab = 'activity' | 'photos' | 'workouts';

export default function SocialProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAppStore((s) => s.profile);
  const streakWeeks = useAppStore((s) => s.streakWeeks);
  const history = useWorkoutsStore((s) => s.history);
  const [tab, setTab] = useState<Tab>('activity');

  if (!profile) return <Loader />;

  const rank = rankFromPoints(profile.rankPoints);

  const totalSets = history.reduce(
    (a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length, 0),
    0,
  );
  const totalDuration = history.reduce((a, w) => a + (w.durationSeconds ?? 0), 0);
  const totalVolume = history.reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0);

  const muscleGroups = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach((w) =>
      w.exercises.forEach((e) => {
        map.set(e.muscleGroup, (map.get(e.muscleGroup) ?? 0) + 1);
      }),
    );
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [history]);

  const activities: ActivityItem[] = useMemo(
    () =>
      history.map((w) => ({
        id: w.id,
        title: w.routineName ?? 'Entrenamiento libre',
        subtitle: `${w.exercises.length} ejercicios`,
        date: new Date(w.startedAt).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' }),
        durationLabel: formatDuration(w.durationSeconds ?? 0),
        volumeLabel: `${Math.round(w.totalVolumeKg).toLocaleString()} kg`,
        setsLabel: String(w.exercises.reduce((b, e) => b + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length, 0)),
        feeling: w.feeling,
        photoUri: w.photoUri,
        type: 'workout',
        authorName: profile.displayName,
        authorAvatarUrl: profile.avatarUrl,
      })),
    [history, profile.displayName, profile.avatarUrl],
  );

  const photos = activities.filter((a) => !!a.photoUri);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.base }}>
      {/* Floating header */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 0,
          right: 0,
          zIndex: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
        }}
      >
        <FloatingIconButton icon="chevron-left" onPress={() => router.back()} />
        <FloatingIconButton icon="share" onPress={() => {}} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Hero banner */}
        <View style={{ position: 'relative' }}>
          <LinearGradient
            colors={[rank.gradient[0] + 'B0', colors.bg.base]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ height: 220 + insets.top, width: '100%' }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: -50,
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <Avatar
              uri={profile.avatarUrl}
              name={profile.displayName}
              size={120}
              borderColor={colors.bg.base}
            />
          </View>
        </View>

        <View style={{ marginTop: 60, paddingHorizontal: spacing.lg }}>
          {/* Name + identity */}
          <View style={{ alignItems: 'center' }}>
            <Text variant="title" weight="black">{profile.displayName}</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>@{profile.username}</Text>
            {!!profile.fullName && (
              <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>{profile.fullName}</Text>
            )}

            {!!profile.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
                <Icon name="map-pin" size={14} color={colors.text.muted} />
                <Text variant="caption" tone="muted">
                  {profile.location}{profile.country ? `, ${profile.country}` : ''}
                </Text>
              </View>
            )}

            {!!profile.bio && (
              <Text
                variant="body"
                tone="secondary"
                style={{ marginTop: spacing.md, textAlign: 'center', maxWidth: '92%', lineHeight: 22 }}
              >
                {profile.bio}
              </Text>
            )}

            {/* Rank pill */}
            <View style={{ marginTop: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 6,
                  borderRadius: radius.full,
                  backgroundColor: colors.bg.elevated,
                  borderWidth: 1,
                  borderColor: rank.color,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: rank.color,
                  }}
                />
                <Text variant="caption" weight="bold" style={{ color: rank.color }}>
                  {rank.label.toUpperCase()} · {profile.rankPoints} pts
                </Text>
              </View>
            </View>
          </View>

          {/* Followers row */}
          <Card padding="lg" variant="elevated" style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: 'row' }}>
              <FollowerCol label="Seguidores" value={profile.followers} />
              <VDivider />
              <FollowerCol label="Siguiendo" value={profile.following} />
              <VDivider />
              <FollowerCol label="Actividades" value={history.length} />
              <VDivider />
              <FollowerCol label="Racha" value={streakWeeks} suffix="sem" />
            </View>
          </Card>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Editar perfil"
                variant="secondary"
                onPress={() => router.push('/profile/edit')}
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Compartir"
                variant="ghost"
                onPress={() => {}}
                leftIcon={<Icon name="share" size={16} color={colors.text.primary} />}
                fullWidth
              />
            </View>
          </View>

          {/* Rank progress */}
          <Card padding="lg" variant="outlined" style={{ marginTop: spacing.lg }}>
            <RankBadge points={profile.rankPoints} size="lg" showProgress />
          </Card>

          {/* Aggregate stats */}
          <Text variant="heading" style={{ marginTop: spacing['2xl'], marginBottom: spacing.md }}>
            Resumen general
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <BigStat icon="dumbbell" label="Workouts" value={String(history.length)} tone={colors.primary.DEFAULT} />
            <BigStat icon="clock" label="Tiempo" value={formatDuration(totalDuration)} tone={colors.info.DEFAULT} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <BigStat icon="muscle" label="Volumen" value={`${Math.round(totalVolume / 1000)}t`} tone={colors.accent.DEFAULT} />
            <BigStat icon="check" label="Sets" value={totalSets.toLocaleString()} tone={colors.success} />
          </View>

          {/* Training types */}
          {muscleGroups.length > 0 && (
            <>
              <Text variant="heading" style={{ marginTop: spacing['2xl'], marginBottom: spacing.md }}>
                Tipos de entrenamiento
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {muscleGroups.map(([group, count]) => (
                  <View
                    key={group}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 8,
                      borderRadius: radius.full,
                      backgroundColor: colors.bg.elevated,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: colors.primary.DEFAULT,
                      }}
                    />
                    <Text variant="caption" weight="semibold">{group}</Text>
                    <Text variant="caption" tone="muted">· {count}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Achievements */}
          <Text variant="heading" style={{ marginTop: spacing['2xl'], marginBottom: spacing.md }}>
            Logros
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {BADGES.map((b) => (
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

          {/* Tabs */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: spacing['2xl'],
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <TabPill label="Actividad" active={tab === 'activity'} onPress={() => setTab('activity')} />
            <TabPill label="Fotos" active={tab === 'photos'} onPress={() => setTab('photos')} />
            <TabPill label="Entrenamientos" active={tab === 'workouts'} onPress={() => setTab('workouts')} />
          </View>

          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            {tab === 'activity' && (
              activities.length ? (
                activities.slice(0, 10).map((a) => <ActivityCard key={a.id} item={a} />)
              ) : (
                <EmptyState icon="dumbbell" text="No tienes actividad publicada" />
              )
            )}
            {tab === 'photos' && (
              photos.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {photos.map((p) => (
                    <View
                      key={p.id}
                      style={{
                        width: '32%',
                        aspectRatio: 1,
                        borderRadius: radius.md,
                        backgroundColor: colors.bg.elevated,
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        source={{ uri: p.photoUri! }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState icon="image" text="Aún no compartes fotos" />
              )
            )}
            {tab === 'workouts' && (
              activities.length ? (
                activities.slice(0, 20).map((a) => (
                  <Card key={a.id} padding="lg">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="heading">{a.title}</Text>
                        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{a.date}</Text>
                      </View>
                      <Icon name="chevron-right" size={18} color={colors.text.muted} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md }}>
                      {a.durationLabel && <MiniInline label="Tiempo" value={a.durationLabel} />}
                      {a.volumeLabel && <MiniInline label="Volumen" value={a.volumeLabel} />}
                      {a.setsLabel && <MiniInline label="Sets" value={a.setsLabel} />}
                    </View>
                  </Card>
                ))
              ) : (
                <EmptyState icon="calendar" text="No has registrado entrenamientos" />
              )
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FloatingIconButton({ icon, onPress }: { icon: IconName; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [pressed && { transform: [{ scale: 0.92 }] }]}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.full,
          backgroundColor: 'rgba(0,0,0,0.45)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={18} color={colors.text.primary} />
      </View>
    </Pressable>
  );
}

function FollowerCol({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text variant="heading" weight="black" numeric>{value.toLocaleString()}</Text>
        {suffix && <Text variant="caption" tone="muted">{suffix}</Text>}
      </View>
      <Text variant="label" tone="muted" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function VDivider() {
  return <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 4 }} />;
}

function BigStat({ icon, label, value, tone }: { icon: IconName; label: string; value: string; tone: string }) {
  return (
    <Card padding="lg" style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: radius.full,
            backgroundColor: tone + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={16} color={tone} />
        </View>
        <Text variant="label" tone="muted">{label}</Text>
      </View>
      <Text variant="metric" weight="black" numeric>{value}</Text>
    </Card>
  );
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
      <Text
        variant="caption"
        weight={active ? 'bold' : 'medium'}
        tone={active ? 'primary' : 'muted'}
      >
        {label}
      </Text>
      <View
        style={{
          height: 2,
          width: '60%',
          backgroundColor: active ? colors.primary.DEFAULT : 'transparent',
          marginTop: spacing.sm,
          borderRadius: 1,
        }}
      />
    </Pressable>
  );
}

function EmptyState({ icon, text }: { icon: IconName; text: string }) {
  return (
    <Card padding="lg" variant="outlined" style={{ alignItems: 'center' }}>
      <Icon name={icon} size={28} color={colors.text.muted} />
      <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>{text}</Text>
    </Card>
  );
}

function MiniInline({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="label" tone="muted">{label}</Text>
      <Text weight="bold" numeric style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

