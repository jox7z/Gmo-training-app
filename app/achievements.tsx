/**
 * Colección de logros derivada del historial local. Esta vista detalla las
 * medallas; el Perfil solo ofrece una vitrina compacta para evitar redundancia.
 */
import { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Icon } from '@/components/Icon';
import { AchievementMedal } from '@/components/achievements/AchievementMedal';
import { colors, radius, spacing } from '@/theme/tokens';
import { useWorkoutsStore } from '@/store/workouts';
import { useAppStore } from '@/store/app';
import {
  evaluateAchievements,
  groupByCategory,
  type AchievementProgress,
} from '@/lib/achievements';

const GMO_START = require('../assets/brand/gmo-mascot-start.webp');
const GMO_MOTIVATING = require('../assets/brand/gmo-mascot-motivating.webp');
const GMO_PR = require('../assets/brand/gmo-mascot-pr.webp');

interface AchievementMood {
  source: number;
  label: string;
  title: string;
  message: string;
}

function resolveAchievementMood(unlockedLevels: number, totalLevels: number): AchievementMood {
  const completion = totalLevels > 0 ? unlockedLevels / totalLevels : 0;
  if (unlockedLevels === 0) {
    return {
      source: GMO_START,
      label: 'GMO tranquilo, listo para el primer logro',
      title: 'Tu primera medalla te espera',
      message: 'Completa un hito para empezar.',
    };
  }
  if (completion < 0.5) {
    return {
      source: GMO_MOTIVATING,
      label: 'GMO motivándote a continuar tus logros',
      title: 'Tu colección ya está en marcha',
      message: 'Cada entreno suma para el siguiente hito.',
    };
  }
  return {
    source: GMO_PR,
    label: 'GMO orgulloso de tu colección de logros',
    title: completion === 1 ? 'Colección completa' : 'Vas construyendo algo grande',
    message: completion === 1 ? 'Has alcanzado todos los niveles disponibles.' : 'Tus medallas muestran constancia real.',
  };
}

export default function AchievementsScreen() {
  const history = useWorkoutsStore((state) => state.history);
  const weeklyGoalDays = useAppStore((state) => state.profile?.weeklyGoalDays);
  const streakWeeks = useAppStore((state) => state.streakWeeks);

  const { groups, totalLevels, unlockedLevels, nextTracks } = useMemo(() => {
    const progress = evaluateAchievements({ history, weeklyGoalDays });
    const nextTracks = progress
      .filter((item) => item.nextTier)
      .sort((a, b) => b.progressToNext - a.progressToNext)
      .slice(0, 3);
    return {
      groups: groupByCategory(progress),
      totalLevels: progress.reduce((total, item) => total + item.maxLevel, 0),
      unlockedLevels: progress.reduce((total, item) => total + item.level, 0),
      nextTracks,
    };
  }, [history, weeklyGoalDays]);

  const pct = totalLevels > 0 ? Math.round((unlockedLevels / totalLevels) * 100) : 0;
  const mood = resolveAchievementMood(unlockedLevels, totalLevels);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      <ScreenHeader
        title="Logros"
        border
        right={
          <Text
            variant="caption"
            tone="secondary"
            weight="bold"
            numeric
            accessibilityLabel={`${unlockedLevels} de ${totalLevels} niveles`}
          >
            {unlockedLevels}/{totalLevels}
          </Text>
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing['4xl'] }}>
        <Card variant="section" padding="lg">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="label" tone="brand">TU COLECCIÓN</Text>
              <Text variant="heading">{mood.title}</Text>
              <Text variant="caption" tone="muted">{mood.message}</Text>
            </View>
            <Image
              source={mood.source}
              style={{ width: 88, height: 88 }}
              contentFit="contain"
              accessibilityLabel={mood.label}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="black" numeric>{pct}%</Text>
              <Text variant="caption" tone="muted">colección completa</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="black" numeric>{unlockedLevels}/{totalLevels}</Text>
              <Text variant="caption" tone="muted">niveles alcanzados</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="black" numeric>{streakWeeks}</Text>
              <Text variant="caption" tone="muted">semanas de racha</Text>
            </View>
          </View>
        </Card>

        {nextTracks.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text variant="label" tone="muted" style={{ letterSpacing: 2 }}>MÁS CERCA</Text>
            <Card variant="section" padding="lg" style={{ gap: spacing.md }}>
              {nextTracks.map((item) => (
                <View key={item.def.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <AchievementMedal icon={item.def.icon} color={item.def.color} level={item.level} maxLevel={item.maxLevel} size={44} hideLevel />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text weight="bold">{item.def.title}</Text>
                    <Text variant="caption" tone="muted">Siguiente: {item.nextTier?.label}</Text>
                    <ProgressBar value={item.progressToNext} color={item.def.color} />
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.category} style={{ gap: spacing.md }}>
            <Text variant="label" tone="muted" style={{ letterSpacing: 2 }}>{group.label.toUpperCase()}</Text>
            {group.items.map((item) => <TrackCard key={item.def.id} progress={item} />)}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function TrackCard({ progress }: { progress: AchievementProgress }) {
  const { def, value, currentTier, nextTier, progressToNext, level, maxLevel } = progress;
  const color = def.color;
  const unit = def.unit ? ` ${def.unit}` : '';
  const completed = !nextTier;

  return (
    <Card variant="section" padding="lg" style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <AchievementMedal icon={def.icon} color={color} level={level} maxLevel={maxLevel} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="bold" numberOfLines={1}>{def.title}</Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>{def.description}</Text>
          <Text weight="black" numeric style={{ fontSize: 18, color, marginTop: spacing.xs }}>
            {formatValue(value)}{unit}
          </Text>
        </View>
        {completed ? (
          <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}66` }}>
            <Text variant="caption" weight="bold" style={{ color }}>Máx.</Text>
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text variant="caption" tone="muted">{nextTier ? `Siguiente: ${nextTier.label}` : 'Todos los niveles alcanzados'}</Text>
          <Text variant="caption" tone="secondary" numeric>{level}/{maxLevel}</Text>
        </View>
        <ProgressBar value={nextTier ? progressToNext : 1} color={color} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {def.tiers.map((tier) => {
          const unlocked = value >= tier.threshold;
          const isCurrent = currentTier?.id === tier.id;
          return (
            <View key={tier.id} style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: unlocked ? `${color}22` : colors.bg.elevated, borderWidth: 1, borderColor: isCurrent ? color : unlocked ? `${color}55` : colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {unlocked ? <Icon name="check" size={11} color={color} /> : null}
              <Text variant="caption" weight={unlocked ? 'bold' : 'regular'} style={{ fontSize: 11, color: unlocked ? color : colors.text.muted }}>{tier.label}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ height: 8, borderRadius: radius.sm, backgroundColor: colors.bg.elevated, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: radius.sm }} />
    </View>
  );
}

function formatValue(value: number): string {
  return value >= 1000 ? value.toLocaleString('es-ES') : String(value);
}
