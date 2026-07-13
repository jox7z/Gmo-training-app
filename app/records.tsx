/**
 * Pantalla de Récords — mejores marcas por ejercicio y 1RM estimado.
 *
 * Deriva todo del historial local de workouts. Para cada ejercicio muestra el
 * mejor peso levantado (con reps y fecha) y el 1RM estimado según la fórmula
 * elegida (Epley/Brzycki). El 1RM es una estimación, no un valor medido.
 */
import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme/tokens';
import { useWorkoutsStore } from '@/store/workouts';
import { useAppStore } from '@/store/app';
import { formatWeight } from '@/lib/units';
import { exerciseImage } from '@/data/exerciseImages';
import {
  computeExerciseRecords,
  ONE_RM_FORMULAS,
  type OneRMFormula,
  type ExerciseRecord,
} from '@/lib/oneRepMax';

const FORMULA_OPTIONS: { value: OneRMFormula; label: string }[] = ONE_RM_FORMULAS.map((f) => ({
  value: f.id,
  label: f.label,
}));

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Miniatura cuadrada del ejercicio con fallback a icono dumbbell.
function ExerciseThumb({ exerciseId, size = 48 }: { exerciseId: string; size?: number }) {
  const img = exerciseImage(exerciseId);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.bg.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {img !== undefined ? (
        <Image source={img} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={120} />
      ) : (
        <Icon name="dumbbell" size={Math.round(size * 0.45)} color={colors.text.muted} />
      )}
    </View>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const history = useWorkoutsStore((s) => s.history);
  const unit = useAppStore((s) => s.profile?.unit ?? 'kg');
  const [formula, setFormula] = useState<OneRMFormula>('epley');

  const records = useMemo(() => computeExerciseRecords(history, formula), [history, formula]);

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
          Récords
        </Text>
        <Text variant="caption" tone="secondary" weight="bold" numeric>
          {records.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['4xl'] }}>
        {/* Toggle de fórmula 1RM */}
        <SegmentedControl options={FORMULA_OPTIONS} value={formula} onChange={setFormula} variant="pill" />
        <Text variant="caption" tone="muted">
          1RM estimado según fórmula — no es un valor medido
        </Text>

        {records.length === 0 ? (
          <Card variant="raised" padding="xl" style={{ alignItems: 'center', marginTop: spacing.lg }}>
            <Text tone="muted" style={{ textAlign: 'center' }}>
              Completa tu primer entreno para ver tus récords
            </Text>
          </Card>
        ) : (
          records.map((r) => <RecordCard key={r.exerciseId} record={r} unit={unit} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecordCard({ record, unit }: { record: ExerciseRecord; unit: 'kg' | 'lb' }) {
  return (
    <Card variant="raised" padding="md">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <ExerciseThumb exerciseId={record.exerciseId} size={48} />
        <View style={{ flex: 1 }}>
          <Text weight="bold" numberOfLines={1}>
            {record.name}
          </Text>
          <Text variant="caption" tone="muted" numeric style={{ marginTop: 2 }}>
            Mejor: {formatWeight(record.bestWeightKg, unit)} × {record.bestWeightReps} · {formatShortDate(record.bestWeightDate)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text weight="black" numeric style={{ fontSize: 20, color: colors.medal.gold }}>
            {formatWeight(record.bestE1rmKg, unit, 0)}
          </Text>
          <Text variant="caption" tone="muted">
            1RM est.
          </Text>
        </View>
      </View>
    </Card>
  );
}
