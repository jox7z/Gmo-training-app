/**
 * ExerciseDetailSheet — hub de detalle de ejercicio en una hoja inferior.
 *
 * Absorbe la antigua hoja de progreso por ejercicio (su contenido pasa a ser la
 * pestaña Historial) y añade dos pestañas más: Ficha (imagen + músculos + equipo +
 * instrucciones del catálogo) y Récords (mejor serie + 1RM estimado, derivados
 * de computeExerciseRecords).
 *
 * El gesto de arrastre sobre el contenido está deshabilitado para no pelear con
 * el long-press del tooltip del chart. El selector de ejercicio es un segundo
 * BottomSheetModal apilado (stacking nativo de gorhom v5), restringido a los
 * ejercicios entrenados vía `onlyIds`. Todo el cálculo es en kg; la conversión a
 * la unidad del usuario se hace solo al renderizar.
 */

import { useState, useMemo, useEffect } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Icon, type IconName } from '@/components/Icon';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { ExercisePickerSheet } from '@/components/ExercisePickerSheet';
import { exerciseImage } from '@/data/exerciseImages';
import { exerciseById, MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '@/data/exercises';
import { colors, radius, spacing } from '@/theme/tokens';
import { toDisplay, formatWeight } from '@/lib/units';
import type { Unit } from '@/store/app';
import {
  buildExerciseTimeline,
  listTrainedExercises,
  type ExercisePeriod,
} from '@/lib/exerciseProgress';
import { detectPRs } from '@/lib/workoutCompare';
import {
  computeExerciseRecords,
  ONE_RM_FORMULAS,
  type OneRMFormula,
} from '@/lib/oneRepMax';
import { useWorkoutsStore } from '@/store/workouts';
import { useAppStore } from '@/store/app';

export type ExerciseDetailTab = 'about' | 'history' | 'records';

type MetricToggle = 'weight' | 'reps';

const PERIODS: { value: ExercisePeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'Todo' },
];

const METRIC_OPTIONS: { value: MetricToggle; label: string }[] = [
  { value: 'weight', label: 'Peso' },
  { value: 'reps', label: 'Reps' },
];

const TAB_OPTIONS: { value: ExerciseDetailTab; label: string }[] = [
  { value: 'about', label: 'Ficha' },
  { value: 'history', label: 'Historial' },
  { value: 'records', label: 'Récords' },
];

const FORMULA_OPTIONS: { value: OneRMFormula; label: string }[] = ONE_RM_FORMULAS.map((f) => ({
  value: f.id,
  label: f.label,
}));

interface Props {
  visible: boolean;
  onClose: () => void;
  unit: Unit;
  /** Si no se pasa, arranca en el ejercicio entrenado más reciente. */
  initialExerciseId?: string;
  initialTab?: ExerciseDetailTab;
  /** Cabecera con selector de ejercicio + Fijar (true en Progreso; false dentro del workout). */
  showSelector?: boolean;
  initialPeriod?: ExercisePeriod;
}

function formatDateEs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ExerciseDetailSheet({
  visible,
  onClose,
  unit,
  initialExerciseId,
  initialTab = 'about',
  showSelector = true,
  initialPeriod = '90d',
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const history = useWorkoutsStore((s) => s.history);
  const setPinnedExercise = useAppStore((s) => s.setPinnedExercise);

  const exercises = useMemo(() => listTrainedExercises(history), [history]);
  const trainedIds = useMemo(() => exercises.map((e) => e.exerciseId), [exercises]);
  const sessionsById = useMemo(
    () =>
      Object.fromEntries(
        exercises.map((e) => [e.exerciseId, `${e.sessions} ${e.sessions === 1 ? 'sesión' : 'sesiones'}`]),
      ),
    [exercises],
  );

  const [selectedId, setSelectedId] = useState<string | undefined>(
    initialExerciseId ?? exercises[0]?.exerciseId,
  );
  const [tab, setTab] = useState<ExerciseDetailTab>(initialTab);
  const [period, setPeriod] = useState<ExercisePeriod>(initialPeriod);
  const [metric, setMetric] = useState<MetricToggle>('weight');
  const [formula, setFormula] = useState<OneRMFormula>('epley');
  const [showPicker, setShowPicker] = useState(false);

  // History may hydrate after mount, leaving selectedId undefined; pick the
  // most-recent trained exercise once data is available.
  useEffect(() => {
    if (!selectedId && exercises.length > 0) {
      setSelectedId(exercises[0].exerciseId);
    }
  }, [exercises, selectedId]);

  const exercise = selectedId ? exerciseById(selectedId) : undefined;
  const selectedName =
    exercises.find((e) => e.exerciseId === selectedId)?.name ?? exercise?.name ?? selectedId ?? '';

  const timeline = useMemo(
    () => (selectedId ? buildExerciseTimeline(history, selectedId, period) : []),
    [history, selectedId, period],
  );

  const chartData = useMemo(() => {
    return timeline.map((p) => ({
      ms: new Date(p.date).getTime(),
      value: metric === 'weight' ? toDisplay(p.topWeightKg, unit) : p.repsAtTop,
    }));
  }, [timeline, metric, unit]);

  const stats = useMemo(() => {
    if (timeline.length === 0) return null;
    const values = metric === 'weight'
      ? timeline.map((p) => toDisplay(p.topWeightKg, unit))
      : timeline.map((p) => p.repsAtTop);
    const first = values[0];
    const last = values[values.length - 1];
    const max = Math.max(...values);
    const delta = last - first;
    return { first, last, max, delta, count: timeline.length };
  }, [timeline, metric, unit]);

  // PR detection: does current timeline's last session hold an all-time PR for this exercise?
  const allTimePrs = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const lastWorkout = history
      .filter((w) => w.exercises.some((e) => e.exerciseId === selectedId))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
    if (!lastWorkout) return new Set<string>();
    return detectPRs(history, lastWorkout);
  }, [history, selectedId]);

  const isPR = selectedId ? allTimePrs.has(selectedId) : false;

  // Récords del ejercicio seleccionado según la fórmula elegida.
  const selectedRecord = useMemo(() => {
    if (!selectedId) return undefined;
    return computeExerciseRecords(history, formula).find((r) => r.exerciseId === selectedId);
  }, [history, formula, selectedId]);

  const chartWidth = screenWidth - spacing.lg * 2;

  const deltaColor =
    stats === null
      ? colors.text.muted
      : stats.delta > 0
      ? colors.success
      : stats.delta < 0
      ? colors.danger
      : colors.text.muted;

  const formatLabel = metric === 'weight'
    ? (v: number) => `${v.toFixed(1)} ${unit}`
    : (v: number) => `${Math.round(v)} r`;

  const selectorImg = selectedId ? exerciseImage(selectedId) : undefined;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['80%']}
      enableContentPanningGesture={false}
      title={selectedName || 'Ejercicio'}
    >
      {/* Cabecera: selector de ejercicio + Fijar */}
      {showSelector && exercises.length > 0 && (
        <View style={{ marginTop: spacing.md }}>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              marginHorizontal: spacing.lg,
              padding: spacing.sm,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.bg.elevated : colors.bg.card,
            })}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.md,
                overflow: 'hidden',
                backgroundColor: colors.bg.elevated,
              }}
            >
              {selectorImg !== undefined ? (
                <Image source={selectorImg} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="dumbbell" size={20} color={colors.text.muted} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" tone="muted">Ejercicio</Text>
              <Text weight="bold" numberOfLines={1}>{selectedName}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.text.muted} />
          </Pressable>

          {/* Fijar */}
          <View style={{ flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.sm }}>
            <Pressable
              onPress={() => { if (selectedId) { setPinnedExercise(selectedId); onClose(); } }}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                paddingVertical: 7,
                borderRadius: radius.full,
                backgroundColor: pressed ? colors.primary.muted : colors.bg.elevated,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              })}
            >
              <Icon name="map-pin" size={13} color={colors.text.secondary} />
              <Text variant="caption" weight="semibold" tone="secondary">
                Fijar
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Tabs */}
      <SegmentedControl
        options={TAB_OPTIONS}
        value={tab}
        onChange={setTab}
        variant="inset"
        style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}
      />

      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Ficha ── */}
        {tab === 'about' && (
          exercise ? (
            <View style={{ marginTop: spacing.md }}>
              <View
                style={{
                  marginHorizontal: spacing.lg,
                  aspectRatio: 16 / 10,
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                  backgroundColor: colors.bg.elevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selectorImg !== undefined ? (
                  <Image source={selectorImg} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Icon name="dumbbell" size={48} color={colors.text.muted} />
                )}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                  marginHorizontal: spacing.lg,
                  marginTop: spacing.md,
                }}
              >
                <Badge label={MUSCLE_GROUP_LABELS[exercise.muscle]} tone="brand" />
                {exercise.secondary?.map((m) => (
                  <Badge key={m} label={MUSCLE_GROUP_LABELS[m]} tone="muted" />
                ))}
                <Badge label={EQUIPMENT_LABELS[exercise.equipment]} tone="info" />
                <Badge label={exercise.isCompound ? 'Compuesto' : 'Aislamiento'} tone="accent" />
              </View>

              <Card padding="lg" style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
                <Text variant="label" tone="secondary" style={{ marginBottom: spacing.sm }}>
                  CÓMO SE HACE
                </Text>
                <Text tone="secondary">{exercise.instructions}</Text>
              </Card>
            </View>
          ) : (
            <EmptyState icon="dumbbell" message="Selecciona un ejercicio para ver su ficha" />
          )
        )}

        {/* ── Historial ── */}
        {tab === 'history' && (
          <View style={{ marginTop: spacing.md }}>
            {/* Toggle Peso / Reps */}
            <SegmentedControl
              options={METRIC_OPTIONS}
              value={metric}
              onChange={setMetric}
              variant="inset"
              style={{ marginHorizontal: spacing.lg }}
            />

            {/* Filtro de período */}
            <SegmentedControl
              options={PERIODS}
              value={period}
              onChange={setPeriod}
              variant="inset"
              style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm }}
            />

            {/* Chart */}
            <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
              <TimeSeriesChart
                data={chartData}
                chartWidth={chartWidth}
                chartHeight={200}
                formatLabel={formatLabel}
                emptyMessage="Registra al menos 2 sesiones con este ejercicio para ver la evolución."
              />
            </View>

            {/* Stats */}
            {stats && (
              <Card padding="lg" style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
                  <StatCell
                    label={metric === 'weight' ? `Actual (${unit})` : 'Actual (reps)'}
                    value={metric === 'weight' ? stats.last.toFixed(1) : String(Math.round(stats.last))}
                  />
                  <StatCell
                    label={metric === 'weight' ? `Máx (${unit})` : 'Máx (reps)'}
                    value={metric === 'weight' ? stats.max.toFixed(1) : String(Math.round(stats.max))}
                  />
                  <StatCell
                    label="Delta"
                    value={`${stats.delta >= 0 ? '+' : ''}${metric === 'weight' ? stats.delta.toFixed(1) : Math.round(stats.delta)}`}
                    color={deltaColor}
                  />
                  <StatCell label="Sesiones" value={String(stats.count)} />
                </View>
                {isPR && (
                  <View
                    style={{
                      marginTop: spacing.md,
                      paddingTop: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: colors.accent.soft,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 3,
                        borderRadius: radius.full,
                        borderWidth: 1,
                        borderColor: colors.accent.DEFAULT,
                      }}
                    >
                      <Text variant="caption" weight="bold" style={{ color: colors.accent.DEFAULT }}>
                        PR
                      </Text>
                    </View>
                    <Text variant="caption" tone="secondary">
                      Record personal en la última sesión
                    </Text>
                  </View>
                )}
              </Card>
            )}

            {/* Session list */}
            {timeline.length > 0 && (
              <Card padding="lg" style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
                <Text variant="label" tone="secondary" style={{ marginBottom: spacing.md }}>
                  SESIONES
                </Text>
                <View style={{ gap: spacing.sm }}>
                  {[...timeline].reverse().map((pt, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: spacing.xs,
                        borderBottomWidth: i < timeline.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text variant="caption" tone="muted">
                        {formatDateEs(pt.date)}
                      </Text>
                      <Text variant="caption" weight="semibold" numeric>
                        {pt.topWeightKg <= 0
                          ? `Peso corporal · ${pt.repsAtTop} reps`
                          : `${formatWeight(pt.topWeightKg, unit)} × ${pt.repsAtTop} reps`}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </View>
        )}

        {/* ── Récords ── */}
        {tab === 'records' && (
          <View style={{ marginTop: spacing.md }}>
            <SegmentedControl
              options={FORMULA_OPTIONS}
              value={formula}
              onChange={setFormula}
              variant="pill"
              style={{ marginHorizontal: spacing.lg }}
            />
            {selectedRecord ? (
              <>
                <Card padding="lg" style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
                  <Text variant="label" tone="secondary" style={{ marginBottom: spacing.sm }}>
                    MEJOR SERIE
                  </Text>
                  <Text variant="metric" numeric>
                    {formatWeight(selectedRecord.bestWeightKg, unit)}
                  </Text>
                  <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                    {selectedRecord.bestWeightReps} reps · {formatDateEs(selectedRecord.bestWeightDate)}
                  </Text>
                </Card>

                <Card padding="lg" style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
                  <Text variant="label" tone="secondary" style={{ marginBottom: spacing.sm }}>
                    1RM ESTIMADO
                  </Text>
                  <Text variant="metric" numeric style={{ color: colors.medal.gold }}>
                    {formatWeight(selectedRecord.bestE1rmKg, unit, 0)}
                  </Text>
                  <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                    {formatWeight(selectedRecord.bestE1rmWeightKg, unit)} × {selectedRecord.bestE1rmReps} reps · {formatDateEs(selectedRecord.bestE1rmDate)}
                  </Text>
                </Card>
              </>
            ) : (
              <EmptyState icon="trophy" message="Entrena este ejercicio para generar récords" />
            )}
          </View>
        )}
      </BottomSheetScrollView>

      {/* Segundo sheet apilado sobre éste (stacking nativo de gorhom v5). */}
      {showSelector && (
        <ExercisePickerSheet
          visible={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={(ex) => {
            setSelectedId(ex.id);
            setShowPicker(false);
          }}
          onlyIds={trainedIds}
          selectedId={selectedId}
          metaById={sessionsById}
          title="Elegir ejercicio"
        />
      )}
    </AppBottomSheet>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ minWidth: 70 }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text
        variant="heading"
        weight="bold"
        numeric
        style={{ marginTop: 2, color: color ?? colors.text.primary }}
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['3xl'], gap: spacing.md }}>
      <Icon name={icon} size={40} color={colors.text.muted} />
      <Text tone="muted" style={{ textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  );
}
