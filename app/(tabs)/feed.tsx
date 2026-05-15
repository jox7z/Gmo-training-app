import { useState, useEffect, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import { colors, spacing, radius, RANKS, RankId } from '@/theme/tokens';
import { MOCK_FEED, MOCK_LEADERBOARD_WEEK } from '@/data/mockSocial';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAppStore } from '@/store/app';
import { Icon, IconName } from '@/components/Icon';

type Tab = 'feed' | 'leaderboard';

interface Entry {
  position: number;
  username: string;
  displayName: string;
  rankBadge: RankId;
  workouts: number;
  sets: number;
  durationMin: number;
  streakWeeks: number;
}

function mockToEntries(): Entry[] {
  return MOCK_LEADERBOARD_WEEK.map((e) => ({
    position: e.rank,
    username: e.username,
    displayName: e.displayName,
    rankBadge: e.rankBadge,
    workouts: e.workouts,
    sets: e.sets,
    durationMin: e.durationMin,
    streakWeeks: e.streakWeeks,
  }));
}

async function fetchLeaderboard(): Promise<Entry[]> {
  // Find the most recent week that has been aggregated by the cron job
  const { data: latest, error: latestErr } = await supabase
    .from('weekly_stats')
    .select('iso_year, iso_week')
    .order('iso_year', { ascending: false })
    .order('iso_week', { ascending: false })
    .limit(1)
    .single();

  if (latestErr || !latest) return [];

  const { data, error } = await supabase
    .from('weekly_stats')
    .select(
      'workout_days, profiles ( id, display_name, username, current_rank, streaks ( current_weeks ) )',
    )
    .eq('iso_year', latest.iso_year)
    .eq('iso_week', latest.iso_week)
    .order('workout_days', { ascending: false })
    .limit(25);

  if (error || !data) return [];

  return (data as any[])
    .filter((row) => row.profiles)
    .map((row, i) => {
      const streaksRaw = row.profiles.streaks;
      const currentWeeks = Array.isArray(streaksRaw)
        ? (streaksRaw[0]?.current_weeks ?? 0)
        : (streaksRaw?.current_weeks ?? 0);
      return {
        position: i + 1,
        username: row.profiles.username,
        displayName: row.profiles.display_name,
        rankBadge: row.profiles.current_rank as RankId,
        workouts: row.workout_days,
        sets: 0,
        durationMin: 0,
        streakWeeks: currentWeeks,
      };
    });
}

export default function FeedScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const [tab, setTab] = useState<Tab>('feed');
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(mockToEntries);
  const [loadingBoard, setLoadingBoard] = useState(isSupabaseConfigured);

  const loadLeaderboard = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const rows = await fetchLeaderboard();
      if (rows.length > 0) setEntries(rows);
    } catch {
      // keep current entries (mock or stale)
    } finally {
      setLoadingBoard(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  }, [loadLeaderboard]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable onPress={() => router.push('/coach')}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.info.soft,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.info.DEFAULT,
            }}
          >
            <Icon name="robot" size={20} color={colors.info.DEFAULT} />
          </View>
        </Pressable>
        <Text variant="title">Comunidad</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.bg.elevated,
          borderRadius: radius.lg,
          padding: 4,
          marginTop: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {(['feed', 'leaderboard'] as Tab[]).map((t) => {
          const active = t === tab;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: radius.md,
                backgroundColor: active ? colors.primary.DEFAULT : 'transparent',
              }}
            >
              <Text weight="bold" tone={active ? 'primary' : 'secondary'}>
                {t === 'feed' ? 'Feed' : 'Ranking'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        {tab === 'feed' ? (
          <FeedList />
        ) : (
          <Leaderboard
            entries={entries}
            myUsername={profile?.username}
            loading={loadingBoard}
          />
        )}
      </View>
    </Screen>
  );
}

function FeedList() {
  return (
    <View>
      {MOCK_FEED.map((p) => {
        const rankInfo = RANKS.find((r) => r.id === p.user.rank)!;
        return (
          <Card key={p.id} padding="lg" style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.bg.elevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: rankInfo.color,
                }}
              >
                <Text weight="black">{p.user.name[0]}</Text>
              </View>
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text weight="bold">{p.user.name}</Text>
                  <Badge label={rankInfo.label} tone="muted" />
                </View>
                <Text variant="caption" tone="muted">
                  @{p.user.username} · hace {p.createdAtMinAgo}min
                </Text>
              </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Text variant="heading" tone="brand">{p.workoutName}</Text>
              {p.caption && <Text variant="body" style={{ marginTop: 4 }}>{p.caption}</Text>}
            </View>

            <View
              style={{
                flexDirection: 'row',
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                justifyContent: 'space-around',
              }}
            >
              <Stat label="Tiempo" value={`${p.durationMin}m`} />
              <Stat label="Sets" value={`${p.sets}`} />
              <Stat label="Ejercicios" value={`${p.exercises}`} />
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, alignItems: 'center' }}>
              <Reaction icon="fire" iconColor={colors.accent.DEFAULT} count={p.reactions.fire} />
              <Reaction icon="muscle" iconColor={colors.primary.DEFAULT} count={p.reactions.muscle} />
              <Reaction icon="clap" iconColor={colors.warning} count={p.reactions.clap} />
              <View style={{ flex: 1 }} />
              <Pressable hitSlop={8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="chat" size={14} color={colors.text.muted} />
                  <Text variant="caption" tone="secondary">{p.comments}</Text>
                </View>
              </Pressable>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function Leaderboard({
  entries,
  myUsername,
  loading,
}: {
  entries: Entry[];
  myUsername?: string;
  loading: boolean;
}) {
  const myEntry = entries.find((e) => e.username === myUsername);

  if (loading) {
    return <Loader />;
  }

  if (entries.length === 0) {
    return (
      <Card padding="xl" style={{ alignItems: 'center' }}>
        <Text variant="heading" style={{ marginBottom: spacing.sm }}>Sin datos aún</Text>
        <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
          El ranking semanal se actualiza cada lunes a las 6 AM.
        </Text>
      </Card>
    );
  }

  return (
    <View>
      <Text variant="caption" tone="muted" style={{ marginBottom: spacing.md }}>
        RANKING SEMANAL
        {myEntry ? ` · Tu posición: #${myEntry.position}` : ''}
      </Text>

      {entries.map((e) => {
        const rankInfo = RANKS.find((r) => r.id === e.rankBadge) ?? RANKS[0];
        const isMe = e.username === myUsername;
        return (
          <Card
            key={e.position}
            padding="md"
            variant={isMe ? 'glow' : 'default'}
            style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}
            >
              <Text
                variant="title"
                tone={e.position <= 3 ? 'accent' : 'muted'}
                weight="black"
              >
                {e.position}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="bold">{isMe ? 'Tú' : e.displayName}</Text>
              <Text variant="caption" tone="muted">
                {e.workouts}w{e.sets > 0 ? ` · ${e.sets} sets` : ''} · {e.streakWeeks} sem racha
              </Text>
            </View>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: rankInfo.color,
              }}
            />
          </Card>
        );
      })}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="label" tone="muted">{label}</Text>
      <Text variant="heading" numeric style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function Reaction({ icon, iconColor, count }: { icon: IconName; iconColor: string; count: number }) {
  return (
    <Pressable hitSlop={8}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={14} color={iconColor} />
        <Text variant="caption" tone="secondary">{count}</Text>
      </View>
    </Pressable>
  );
}
