/**
 * Pantalla de logros — vista completa estilo Duolingo.
 *
 * Agrupa los tracks por categoría y muestra, para cada uno, la medalla con su
 * nivel, una barra de progreso hacia el siguiente hito y la tira de niveles
 * (conseguidos vs. bloqueados). Todo se deriva del historial local.
 */
import { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/Icon';
import { AchievementMedal } from '@/components/achievements/AchievementMedal';
import { colors, radius, spacing } from '@/theme/tokens';
import { useWorkoutsStore } from '@/store/workouts';
import {
  evaluateAchievements,
  groupByCategory,
  type AchievementProgress,
} from '@/lib/achievements';

export default function AchievementsScreen() {
  const router = useRouter();
  const history = useWorkoutsStore((s) => s.history);

  const { groups, totalLevels, unlockedLevels } = useMemo(() => {
    const progress = evaluateAchievements({ history });
    const groups = groupByCategory(progress);
    const totalLevels = progress.reduce((a, p) => a + p.maxLevel, 0);
    const unlockedLevels = progress.reduce((a, p) => a + p.level, 0);
    return { groups, totalLevels, unlockedLevels };
  }, [history]);

  const pct = totalLevels > 0 ? Math.round((unlockedLevels / totalLevels) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="chevron-left" size={24} color={colors.text.primary} />
        </Pressable>
        <Text variant="heading" style={{ flex: 1 }}>
          Logros
        </Text>
        <Text variant="caption" tone="secondary" weight="bold" numeric>
          {unlockedLevels}/{totalLevels}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Resumen global */}
        <Card variant="raised" padding="lg">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.accent.soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="trophy" size={26} color={colors.accent.DEFAULT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="bold" style={{ fontSize: 16 }}>
                {pct}% completado
              </Text>
              <Text variant="caption" tone="muted">
                {unlockedLevels} de {totalLevels} niveles conseguidos
              </Text>
            </View>
          </View>
          <ProgressBar value={pct / 100} color={colors.accent.DEFAULT} style={{ marginTop: spacing.md }} />
        </Card>

        {groups.map((group) => (
          <View key={group.category} style={{ gap: spacing.md }}>
            <Text variant="label" tone="muted" tracking="wider" style={{ marginTop: spacing.xs }}>
              {group.label.toUpperCase()}
            </Text>
            {group.items.map((item) => (
              <TrackCard key={item.def.id} progress={item} />
            ))}
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
    <Card variant="raised" padding="lg">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <AchievementMedal icon={def.icon} color={color} level={level} maxLevel={maxLevel} size={64} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text weight="bold" style={{ flex: 1 }} numberOfLines={1}>
              {def.title}
            </Text>
            {completed && (
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                  borderRadius: radius.full,
                  backgroundColor: `${color}22`,
                  borderWidth: 1,
                  borderColor: `${color}66`,
                }}
              >
                <Text variant="caption" weight="bold" style={{ color }}>
                  Máx.
                </Text>
              </View>
            )}
          </View>
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
            {def.description}
          </Text>

          {/* Valor actual + objetivo */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.sm }}>
            <Text weight="black" numeric style={{ fontSize: 18, color }}>
              {formatValue(value)}{unit}
            </Text>
            {nextTier && (
              <Text variant="caption" tone="muted" numeric>
                / {formatValue(nextTier.threshold)}{unit} · {nextTier.label}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Barra hacia el próximo nivel */}
      {nextTier ? (
        <ProgressBar value={progressToNext} color={color} style={{ marginTop: spacing.md }} />
      ) : (
        <ProgressBar value={1} color={color} style={{ marginTop: spacing.md }} />
      )}

      {/* Tira de niveles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md }}>
        {def.tiers.map((tier) => {
          const unlocked = value >= tier.threshold;
          const isCurrent = currentTier?.id === tier.id;
          return (
            <View
              key={tier.id}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: unlocked ? `${color}22` : colors.bg.elevated,
                borderWidth: 1,
                borderColor: isCurrent ? color : unlocked ? `${color}55` : colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {unlocked && <Icon name="check" size={11} color={color} />}
              <Text
                variant="caption"
                weight={unlocked ? 'bold' : 'regular'}
                style={{ fontSize: 11, color: unlocked ? color : colors.text.muted }}
              >
                {tier.label}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function ProgressBar({ value, color, style }: { value: number; color: string; style?: object }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      style={[
        { height: 8, borderRadius: radius.full, backgroundColor: colors.bg.elevated, overflow: 'hidden' },
        style,
      ]}
    >
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: radius.full }} />
    </View>
  );
}

function formatValue(n: number): string {
  return n >= 1000 ? n.toLocaleString('es-ES') : String(n);
}
