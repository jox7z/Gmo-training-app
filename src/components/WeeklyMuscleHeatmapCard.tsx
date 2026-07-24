/**
 * WeeklyMuscleHeatmapCard — mapa muscular semáforo de la SEMANA ACTUAL
 * (lunes–domingo). Colorea la silueta según las series reales entrenadas por
 * músculo esta semana, con conteo fraccional (sinergistas cuentan 0.5). Es un
 * periodo FIJO: no se conecta al selector 7d/30d/90d de Progreso.
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { spacing } from '@/theme/tokens';
import { MuscleMap, type MuscleKey } from '@/components/MuscleMap';
import { STATUS_COLOR } from '@/components/MuscleOptimizationTable';
import { weeklySetsByMuscle, muscleStatusFromWeeklySets } from '@/lib/optimizationScore';
import type { Workout } from '@/store/workouts';
import type { Sex } from '@/store/app';

interface Props {
  history: Workout[];
  sex?: Sex;
}

// Músculos que la silueta sabe pintar (full_body no tiene slug, se omite).
const MUSCLE_KEYS: MuscleKey[] = [
  'chest',
  'back',
  'front_delt',
  'lateral_delt',
  'rear_delt',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];

// Leyenda: orden y etiquetas propias del heatmap semanal (usa "Alto", no "Exceso").
const LEGEND = [
  { status: 'untrained', label: 'Sin entrenar' },
  { status: 'low', label: 'Bajo' },
  { status: 'optimal', label: 'Óptimo' },
  { status: 'high', label: 'Alto' },
] as const;

const VIEW_OPTIONS: { value: 'front' | 'back'; label: string }[] = [
  { value: 'front', label: 'Frente' },
  { value: 'back', label: 'Espalda' },
];

export function WeeklyMuscleHeatmapCard({ history, sex = 'male' }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front');

  const weekly = useMemo(() => weeklySetsByMuscle(history), [history]);

  const muscleColors = useMemo(() => {
    const out = {} as Record<MuscleKey, string>;
    for (const key of MUSCLE_KEYS) {
      out[key] = STATUS_COLOR[muscleStatusFromWeeklySets(weekly[key] ?? 0)];
    }
    return out;
  }, [weekly]);

  const isEmpty = MUSCLE_KEYS.every((k) => (weekly[k] ?? 0) === 0);

  return (
    <Card variant="raised" padding="lg">
      <Text variant="label" tone="secondary">Mapa muscular</Text>
      <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
        Semana actual
      </Text>

      {/* Toggle frente / espalda */}
      <SegmentedControl
        options={VIEW_OPTIONS}
        value={view}
        onChange={setView}
        variant="pill"
        style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
      />

      {/* Silueta */}
      <View style={{ alignItems: 'center' }}>
        <MuscleMap view={view} colors={muscleColors} size={200} gender={sex} />
      </View>

      {isEmpty ? (
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.lg, textAlign: 'center' }}>
          Aún no entrenas esta semana
        </Text>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.md,
            marginTop: spacing.lg,
            justifyContent: 'center',
          }}
        >
          {LEGEND.map(({ status, label }) => (
            <View key={status} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: STATUS_COLOR[status],
                }}
              />
              <Text variant="caption" tone="secondary">
                {label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
