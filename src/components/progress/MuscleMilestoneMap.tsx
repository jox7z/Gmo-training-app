import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type HostInstance } from 'react-native';

import { Icon } from '@/components/Icon';
import {
  MuscleMap,
  type MuscleKey,
  type MuscleMapPressEvent,
} from '@/components/MuscleMap';
import { MuscleMilestoneSelector } from '@/components/progress/MuscleMilestoneSelector';
import { WorkoutResultsModal } from '@/components/WorkoutResultsModal';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import {
  buildMuscleMilestones,
  MILESTONE_LEVEL_LABELS,
  MILESTONE_MUSCLES,
  type LiftMilestone,
  type MilestoneLevel,
  type MilestoneMuscle,
  type MuscleMilestoneContribution,
  type MuscleMilestoneResult,
} from '@/lib/muscleMilestones';
import { formatWeight } from '@/lib/units';
import type { Unit } from '@/store/app';
import type { Workout } from '@/store/workouts';
import { colors, radius, spacing } from '@/theme/tokens';

const LEVEL_COLORS: Readonly<Record<MilestoneLevel, string>> = {
  0: colors.borderStrong,
  1: colors.text.muted,
  2: colors.info.DEFAULT,
  3: colors.lime,
  4: colors.success,
  5: colors.warning,
  6: colors.accent.DEFAULT,
  7: colors.primary.DEFAULT,
};

interface Props {
  history: readonly Workout[];
  gender?: 'male' | 'female';
  unit: Unit;
}

export function MuscleMilestoneMap({
  history,
  gender = 'male',
  unit,
}: Props) {
  const summary = useMemo(() => buildMuscleMilestones(history), [history]);
  const [selectedMuscle, setSelectedMuscle] =
    useState<MilestoneMuscle | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const selectorReturnFocusTarget = useRef<HostInstance | null>(null);
  const resultByMuscle = useMemo(
    () =>
      new Map(
        summary.muscles.map((result) => [result.muscle, result] as const),
      ),
    [summary.muscles],
  );
  const mapColors = useMemo(
    () =>
      Object.fromEntries(
        summary.muscles.map((result) => [
          result.muscle,
          LEVEL_COLORS[result.level],
        ]),
      ) as Record<MuscleKey, string>,
    [summary.muscles],
  );
  const mapPriorities = useMemo(
    () =>
      Object.fromEntries(
        summary.muscles.map((result) => [
          result.muscle,
          result.level,
        ]),
      ) as Record<MuscleKey, number>,
    [summary.muscles],
  );
  const selectedResult = selectedMuscle
    ? resultByMuscle.get(selectedMuscle) ?? null
    : null;
  const openWorkout = (workoutId: string) => {
    const workout = history.find((candidate) => candidate.id === workoutId);
    if (workout) setSelectedWorkout(workout);
  };

  const handleMapPress = ({ muscles }: MuscleMapPressEvent) => {
    const candidates = muscles
      .filter(
        (muscle): muscle is MilestoneMuscle =>
          MILESTONE_MUSCLES.includes(muscle as MilestoneMuscle),
      )
      .map((muscle) => resultByMuscle.get(muscle))
      .filter(
        (result): result is MuscleMilestoneResult => result !== undefined,
      )
      .sort(
        (a, b) =>
          b.level - a.level ||
          MILESTONE_MUSCLES.indexOf(a.muscle) -
            MILESTONE_MUSCLES.indexOf(b.muscle),
      );
    const current = candidates.find(
      (result) => result.muscle === selectedMuscle,
    );
    const next = current ?? candidates[0];
    if (next) setSelectedMuscle(next.muscle);
  };

  return (
    <>
      <Card variant="section" padding="lg">
        <View style={styles.heading}>
          <Text variant="heading">Mapa de hitos</Text>
          <Text variant="caption" tone="secondary">
            Carga máxima registrada en cuatro levantamientos base
          </Text>
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={
            selectedResult
              ? `Cambiar músculo. Seleccionado: ${selectedResult.muscleLabel}`
              : 'Elegir músculo del mapa de hitos'
          }
          accessibilityHint="Abre un selector buscable con filtros de hitos"
          accessibilityState={{ expanded: selectorVisible }}
          onPress={(event) => {
            selectorReturnFocusTarget.current = event.currentTarget;
            setSelectorVisible(true);
          }}
          haptic={false}
          pressScale={0.98}
          style={styles.selectorButton}
        >
          <View style={styles.selectorIcon}>
            <Icon
              name="filter"
              size={spacing.lg}
              color={colors.primary.DEFAULT}
            />
          </View>
          <View style={styles.selectorCopy}>
            <Text weight="bold">
              Músculo: {selectedResult?.muscleLabel ?? 'Todos'}
            </Text>
            <Text variant="caption" tone="muted">
              {selectedResult?.levelLabel ?? 'Con hitos · Sin hitos'}
            </Text>
          </View>
          <Icon
            name="chevron-right"
            size={spacing.lg}
            color={colors.text.secondary}
          />
        </PressableScale>

        <View style={styles.maps}>
          <BodyView
            label="Frente"
            view="front"
            colors={mapColors}
            priorities={mapPriorities}
            selectedMuscle={selectedMuscle}
            gender={gender}
            onPress={handleMapPress}
          />
          <BodyView
            label="Espalda"
            view="back"
            colors={mapColors}
            priorities={mapPriorities}
            selectedMuscle={selectedMuscle}
            gender={gender}
            onPress={handleMapPress}
          />
        </View>

        <View
          style={styles.legend}
          accessibilityLabel="Niveles del mapa de hitos"
        >
          {MILESTONE_LEVEL_LABELS.map((label, level) => (
            <View key={label} style={styles.legendItem}>
              <View
                style={[
                  styles.legendSwatch,
                  {
                    backgroundColor:
                      LEVEL_COLORS[level as MilestoneLevel],
                  },
                ]}
              />
              <Text variant="caption" tone="secondary">
                {label}
              </Text>
            </View>
          ))}
        </View>

        <Text variant="caption" tone="muted" style={styles.disclaimer}>
          Cargas reales; sin 1RM estimado ni comparación con otras personas.
          Secundarios: un nivel menos.
        </Text>

        {selectedResult ? (
          <MuscleDetail
            result={selectedResult}
            unit={unit}
            onOpenWorkout={openWorkout}
          />
        ) : null}

        <View style={styles.lifts}>
          <Text variant="label" tone="muted">
            LEVANTAMIENTOS BASE
          </Text>
          {summary.lifts.map((lift, index) => (
            <LiftRow
              key={lift.exerciseId}
              lift={lift}
              unit={unit}
              showDivider={index > 0}
              onOpenWorkout={openWorkout}
            />
          ))}
        </View>

      </Card>

      <MuscleMilestoneSelector
        visible={selectorVisible}
        results={summary.muscles}
        selectedMuscle={selectedMuscle}
        onSelect={setSelectedMuscle}
        onClose={() => setSelectorVisible(false)}
        returnFocusTarget={selectorReturnFocusTarget.current}
      />

      <WorkoutResultsModal
        visible={selectedWorkout !== null}
        workout={selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
      />
    </>
  );
}

function BodyView({
  label,
  view,
  colors: muscleColors,
  priorities,
  selectedMuscle,
  gender,
  onPress,
}: {
  label: string;
  view: 'front' | 'back';
  colors: Record<MuscleKey, string>;
  priorities: Record<MuscleKey, number>;
  selectedMuscle: MilestoneMuscle | null;
  gender: 'male' | 'female';
  onPress: (event: MuscleMapPressEvent) => void;
}) {
  return (
    <View style={styles.bodyColumn}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        style={styles.bodyMap}
      >
        <MuscleMap
          view={view}
          colors={muscleColors}
          colorPriority={priorities}
          selectedMuscles={selectedMuscle ? [selectedMuscle] : []}
          gender={gender}
          size={132}
          onBodyPartPress={onPress}
        />
      </View>
    </View>
  );
}

function LiftRow({
  lift,
  unit,
  showDivider,
  onOpenWorkout,
}: {
  lift: LiftMilestone;
  unit: Unit;
  showDivider: boolean;
  onOpenWorkout: (workoutId: string) => void;
}) {
  const evidence = lift.evidence;

  return (
    <PressableScale
      accessibilityRole={evidence ? 'button' : undefined}
      accessibilityLabel={`${lift.exerciseName}, ${lift.levelLabel}, ${
        evidence
          ? `carga máxima ${formatWeight(evidence.weightKg, unit)}, ${evidence.reps} repeticiones, ${formatEvidenceDate(evidence.workoutStartedAt)}, ${evidence.workoutName}`
          : 'sin serie válida registrada'
      }`}
      accessibilityHint={evidence ? 'Abre el registro de esta sesión' : undefined}
      disabled={!evidence}
      onPress={() => {
        if (evidence) onOpenWorkout(evidence.workoutId);
      }}
      haptic={false}
      pressScale={0.98}
      style={[styles.liftRow, showDivider && styles.rowDivider]}
    >
      <View style={styles.liftCopy}>
        <Text weight="bold">{lift.exerciseName}</Text>
        <Text variant="caption" tone="muted">
          {evidence
            ? `${formatWeight(evidence.weightKg, unit)} × ${evidence.reps} reps`
            : 'Sin serie válida registrada'}
        </Text>
        {evidence ? (
          <Text variant="caption" tone="secondary">
            {formatEvidenceDate(evidence.workoutStartedAt)} ·{' '}
            {evidence.workoutName}
          </Text>
        ) : null}
      </View>
      <LevelLabel level={lift.level} label={lift.levelLabel} />
      {evidence ? (
        <Icon
          name="chevron-right"
          size={spacing.lg}
          color={colors.text.secondary}
        />
      ) : null}
    </PressableScale>
  );
}

function MuscleDetail({
  result,
  unit,
  onOpenWorkout,
}: {
  result: MuscleMilestoneResult;
  unit: Unit;
  onOpenWorkout: (workoutId: string) => void;
}) {
  return (
    <View
      style={styles.detail}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Detalle de ${result.muscleLabel}, ${result.levelLabel}`}
    >
      <View style={styles.detailHeader}>
        <Text variant="subheading" weight="bold" style={styles.detailTitle}>
          {result.muscleLabel}
        </Text>
        <LevelLabel level={result.level} label={result.levelLabel} />
      </View>

      {result.contributions.length > 0 ? (
        <View style={styles.contributions}>
          <Text variant="label" tone="muted">
            LEVANTAMIENTOS QUE APORTAN
          </Text>
          {result.contributions.map((contribution, index) => (
            <ContributionRow
              key={`${contribution.exerciseId}-${contribution.role}`}
              contribution={contribution}
              unit={unit}
              showDivider={index > 0}
              onOpenWorkout={onOpenWorkout}
            />
          ))}
        </View>
      ) : (
        <View style={styles.noContribution}>
          <Icon name="info" size={spacing.lg} color={colors.text.muted} />
          <Text variant="caption" tone="muted" style={styles.noContributionText}>
            Ninguno de los cuatro levantamientos base usa este grupo como
            principal o secundario.
          </Text>
        </View>
      )}
    </View>
  );
}

function ContributionRow({
  contribution,
  unit,
  showDivider,
  onOpenWorkout,
}: {
  contribution: MuscleMilestoneContribution;
  unit: Unit;
  showDivider: boolean;
  onOpenWorkout: (workoutId: string) => void;
}) {
  const { evidence } = contribution;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${contribution.exerciseName}, ${
        contribution.role === 'primary' ? 'evidencia principal' : 'evidencia secundaria'
      }, ${formatWeight(evidence.weightKg, unit)}, ${evidence.reps} repeticiones, ${formatEvidenceDate(evidence.workoutStartedAt)}, ${evidence.workoutName}`}
      accessibilityHint="Abre el registro de esta sesión"
      onPress={() => onOpenWorkout(evidence.workoutId)}
      haptic={false}
      pressScale={0.98}
      style={[styles.contributionRow, showDivider && styles.rowDivider]}
    >
      <View style={styles.contributionCopy}>
        <Text weight="semibold">{contribution.exerciseName}</Text>
        <Text variant="caption" tone="muted">
          {contribution.role === 'primary' ? 'Principal' : 'Secundario'}
          {` · ${formatWeight(evidence.weightKg, unit)} × ${evidence.reps} reps`}
        </Text>
        <Text variant="caption" tone="secondary">
          {formatEvidenceDate(evidence.workoutStartedAt)} ·{' '}
          {evidence.workoutName}
        </Text>
      </View>
      <LevelLabel
        level={contribution.level}
        label={contribution.levelLabel}
      />
      <Icon
        name="chevron-right"
        size={spacing.lg}
        color={colors.text.secondary}
      />
    </PressableScale>
  );
}

function formatEvidenceDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Fecha sin datos';
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function LevelLabel({
  level,
  label,
}: {
  level: MilestoneLevel;
  label: string;
}) {
  return (
    <View
      style={[
        styles.levelLabel,
        { borderColor: LEVEL_COLORS[level] },
      ]}
    >
      <View
        style={[
          styles.levelDot,
          { backgroundColor: LEVEL_COLORS[level] },
        ]}
      />
      <Text variant="caption" weight="semibold">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  maps: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-evenly',
    marginTop: spacing.lg,
  },
  bodyColumn: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  bodyMap: {
    alignItems: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  legend: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: spacing.xl,
  },
  legendSwatch: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: spacing.md,
    width: spacing.md,
  },
  disclaimer: {
    marginTop: spacing.sm,
  },
  lifts: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  liftRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: spacing['4xl'],
    paddingVertical: spacing.md,
  },
  liftCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  rowDivider: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  selectorButton: {
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: spacing['4xl'],
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  selectorIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary.muted,
    borderRadius: radius.sm,
    height: spacing['2xl'],
    justifyContent: 'center',
    width: spacing['2xl'],
  },
  selectorCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  detail: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  detailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailTitle: {
    flex: 1,
  },
  contributions: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  contributionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: spacing['3xl'] + spacing.sm,
    paddingVertical: spacing.sm,
  },
  contributionCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  noContribution: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  noContributionText: {
    flex: 1,
  },
  levelLabel: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: spacing['2xl'],
    paddingHorizontal: spacing.sm,
  },
  levelDot: {
    borderRadius: radius.full,
    height: spacing.sm,
    width: spacing.sm,
  },
});
