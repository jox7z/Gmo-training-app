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
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, spacing, radius } from '@/theme/tokens';
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
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg }}>
        {(['front', 'back'] as const).map((v) => {
          const active = view === v;
          return (
            <PressableScale
              key={v}
              onPress={() => setView(v)}
              pressScale={0.96}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: radius.full,
                alignItems: 'center',
                backgroundColor: active ? colors.primary.DEFAULT : colors.bg.elevated,
                borderWidth: 1,
                borderColor: active ? colors.primary.DEFAULT : colors.border,
              }}
            >
              <Text variant="caption" weight="bold" tone={active ? 'primary' : 'secondary'}>
                {v === 'front' ? 'Frente' : 'Espalda'}
              </Text>
            </PressableScale>
          );
        })}
      </View>

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
