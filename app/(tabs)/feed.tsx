import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { RankBadge } from '@/components/RankBadge';
import { colors, spacing, radius, RANKS } from '@/theme/tokens';
import { MOCK_FEED, MOCK_LEADERBOARD_WEEK } from '@/data/mockSocial';

type Tab = 'feed' | 'leaderboard';

export default function FeedScreen() {
  const [tab, setTab] = useState<Tab>('feed');

  return (
    <Screen>
      <Text variant="title">Comunidad</Text>

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
        {tab === 'feed' ? <FeedList /> : <Leaderboard />}
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
                <Text variant="caption" tone="muted">@{p.user.username} · hace {p.createdAtMinAgo}min</Text>
              </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Text variant="heading" tone="brand">{p.workoutName}</Text>
              {p.caption && (
                <Text variant="body" style={{ marginTop: 4 }}>{p.caption}</Text>
              )}
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
              <Stat label="Volumen" value={`${(p.volumeKg / 1000).toFixed(1)}t`} />
              <Stat label="Ejercicios" value={`${p.exercises}`} />
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
              <Reaction emoji="🔥" count={p.reactions.fire} />
              <Reaction emoji="💪" count={p.reactions.muscle} />
              <Reaction emoji="👏" count={p.reactions.clap} />
              <View style={{ flex: 1 }} />
              <Pressable hitSlop={8}>
                <Text variant="caption" tone="secondary">💬 {p.comments}</Text>
              </Pressable>
              <Pressable hitSlop={8}>
                <Text variant="caption" tone="secondary">↗ Compartir</Text>
              </Pressable>
            </View>
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

function Reaction({ emoji, count }: { emoji: string; count: number }) {
  return (
    <Pressable hitSlop={8}>
      <Text variant="caption" tone="secondary">{emoji} {count}</Text>
    </Pressable>
  );
}

function Leaderboard() {
  return (
    <View>
      <Text variant="caption" tone="muted" style={{ marginBottom: spacing.md }}>
        RANKING SEMANAL · Tu rango (Silver)
      </Text>
      {MOCK_LEADERBOARD_WEEK.map((e) => {
        const rankInfo = RANKS.find((r) => r.id === e.rankBadge)!;
        const isMe = e.username === 'gmo_athlete';
        return (
          <Card
            key={e.rank}
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
              <Text variant="title" tone={e.rank <= 3 ? 'accent' : 'muted'} weight="black">
                {e.rank}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="bold">{e.displayName}</Text>
              <Text variant="caption" tone="muted">
                {e.workouts} workouts · {(e.volumeKg / 1000).toFixed(1)}t · 🔥 {e.streakWeeks}w
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
