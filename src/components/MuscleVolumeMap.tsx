import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MUSCLE_GROUP_LABELS } from '@/data/exercises';
import {
  MUSCLE_VOLUME_GROUPS,
  MUSCLE_VOLUME_ZONE_LABELS,
  type MuscleVolumeResult,
  type MuscleVolumeZone,
  type VolumeMuscleGroup,
} from '@/lib/muscleVolume';
import { colors, radius, spacing } from '@/theme/tokens';
import {
  MuscleMap,
  type MuscleKey,
  type MuscleMapPressEvent,
} from '@/components/MuscleMap';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

const ZONE_COLORS: Readonly<Record<MuscleVolumeZone, string>> = {
  none: '#3F3F46',
  minimal: '#FACC15',
  effective: '#A3E635',
  productive: colors.success,
  very_high: colors.danger,
};

const ZONE_PRIORITY: Readonly<Record<MuscleVolumeZone, number>> = {
  none: 0,
  minimal: 1,
  effective: 2,
  productive: 3,
  very_high: 4,
};

export interface MuscleVolumeMapProps {
  results: readonly MuscleVolumeResult[];
  title?: string;
  subtitle?: string;
  gender?: 'male' | 'female';
  mapSize?: number;
  selectorLayout?: 'rail' | 'grid';
  /** Unidad factual de frecuencia: "días", "sesiones", etc. */
  frequencyUnit?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function MuscleVolumeMap({
  results,
  title = 'Volumen por grupo muscular',
  subtitle = 'Toca una zona para ver su desglose.',
  gender = 'male',
  mapSize = 132,
  selectorLayout = 'rail',
  frequencyUnit = 'veces',
  style,
  testID,
}: MuscleVolumeMapProps) {
  const [selectedMuscles, setSelectedMuscles] = useState<
    readonly VolumeMuscleGroup[]
  >([]);

  const resultByMuscle = useMemo(
    () => new Map(results.map((result) => [result.muscle, result] as const)),
    [results],
  );
  const availableResults = useMemo(
    () => results.filter((result) => result.totalSets > 0),
    [results],
  );

  useEffect(() => {
    setSelectedMuscles((current) => {
      const next = current.filter(
        (muscle) => (resultByMuscle.get(muscle)?.totalSets ?? 0) > 0,
      );
      return next.length === current.length ? current : next;
    });
  }, [resultByMuscle]);

  const mapColors = useMemo(
    () =>
      Object.fromEntries(
        MUSCLE_VOLUME_GROUPS.map((muscle) => [
          muscle,
          ZONE_COLORS[resultByMuscle.get(muscle)?.zone ?? 'none'],
        ]),
      ) as Record<MuscleKey, string>,
    [resultByMuscle],
  );

  const mapPriorities = useMemo(
    () =>
      Object.fromEntries(
        MUSCLE_VOLUME_GROUPS.map((muscle) => [
          muscle,
          ZONE_PRIORITY[resultByMuscle.get(muscle)?.zone ?? 'none'],
        ]),
      ) as Record<MuscleKey, number>,
    [resultByMuscle],
  );

  const selectedResults = selectedMuscles
    .map((muscle) => resultByMuscle.get(muscle))
    .filter(
      (result): result is MuscleVolumeResult =>
        result !== undefined && result.totalSets > 0,
    );
  const hasSelectedVolume = selectedResults.length > 0;

  const handlePress = ({ muscles }: MuscleMapPressEvent) => {
    const mappedMuscles = muscles.filter(
      (muscle): muscle is VolumeMuscleGroup =>
        MUSCLE_VOLUME_GROUPS.includes(muscle),
    );
    const hasVolume = mappedMuscles.some(
      (muscle) => (resultByMuscle.get(muscle)?.totalSets ?? 0) > 0,
    );
    setSelectedMuscles(hasVolume ? mappedMuscles : []);
  };

  return (
    <Card
      variant="section"
      padding="lg"
      style={style}
      testID={testID}
      accessibilityLabel={title}
    >
      <View style={styles.heading}>
        <Text variant="heading" weight="bold">
          {title}
        </Text>
        <Text variant="caption" tone="secondary">
          {subtitle}
        </Text>
      </View>

      <View style={styles.maps}>
        <BodyView
          label="Frente"
          view="front"
          colors={mapColors}
          priorities={mapPriorities}
          selectedMuscles={selectedMuscles}
          gender={gender}
          size={mapSize}
          onPress={handlePress}
        />
        <BodyView
          label="Espalda"
          view="back"
          colors={mapColors}
          priorities={mapPriorities}
          selectedMuscles={selectedMuscles}
          gender={gender}
          size={mapSize}
          onPress={handlePress}
        />
      </View>

      <View style={styles.legend} accessibilityLabel="Leyenda de volumen">
        {(
          Object.keys(ZONE_COLORS) as MuscleVolumeZone[]
        ).map((zone) => (
          <View key={zone} style={styles.legendItem}>
            <View
              style={[styles.legendSwatch, { backgroundColor: ZONE_COLORS[zone] }]}
            />
            <Text variant="caption" tone="secondary" style={styles.legendText}>
              {MUSCLE_VOLUME_ZONE_LABELS[zone]}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" tone="muted" style={styles.disclaimer}>
        Rangos de series equivalentes. Una principal cuenta 1 y una secundaria 0.5.
      </Text>

      {availableResults.length > 0 ? (
        <View style={styles.explore}>
          <Text variant="label" tone="muted">
            EXPLORAR MÚSCULOS
          </Text>
          {selectorLayout === 'rail' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.exploreContent}
            >
              {availableResults.map((result) => (
                <MuscleSelector
                  key={result.muscle}
                  result={result}
                  selected={selectedMuscles.includes(result.muscle)}
                  layout="rail"
                  onPress={() => setSelectedMuscles([result.muscle])}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.exploreGrid}>
              {availableResults.map((result) => (
                <MuscleSelector
                  key={result.muscle}
                  result={result}
                  selected={selectedMuscles.includes(result.muscle)}
                  layout="grid"
                  onPress={() => setSelectedMuscles([result.muscle])}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text weight="semibold">Sin volumen todavía</Text>
          <Text variant="caption" tone="muted" style={styles.emptyCopy}>
            Agrega series a una rutina o completa un entrenamiento para activar
            músculos y ver su desglose.
          </Text>
        </View>
      )}

      {hasSelectedVolume ? (
        <View
          style={styles.detailPanel}
          accessibilityLiveRegion="polite"
          accessibilityLabel="Detalle del grupo muscular"
        >
          {selectedResults.map((result, index) => (
            <MuscleDetail
              key={result.muscle}
              result={result}
              frequencyUnit={frequencyUnit}
              showDivider={index > 0}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

interface MuscleSelectorProps {
  result: MuscleVolumeResult;
  selected: boolean;
  layout: 'rail' | 'grid';
  onPress: () => void;
}

function MuscleSelector({
  result,
  selected,
  layout,
  onPress,
}: MuscleSelectorProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${MUSCLE_GROUP_LABELS[result.muscle]}, ${formatEquivalentSets(result.totalSets)} series equivalentes`}
      accessibilityHint="Muestra los ejercicios que contribuyen"
      accessibilityState={{ selected }}
      onPress={onPress}
      pressScale={0.96}
      haptic={false}
      style={[
        styles.muscleButton,
        layout === 'grid' && styles.muscleButtonGrid,
        selected && {
          borderColor: ZONE_COLORS[result.zone],
          backgroundColor: colors.bg.elevated,
        },
      ]}
    >
      <View
        style={[
          styles.zoneDot,
          { backgroundColor: ZONE_COLORS[result.zone] },
        ]}
      />
      <View style={styles.muscleButtonCopy}>
        <Text variant="caption" weight="semibold" numberOfLines={2}>
          {MUSCLE_GROUP_LABELS[result.muscle]}
        </Text>
        {layout === 'grid' ? (
          <Text variant="caption" tone="secondary" numeric>
            {formatEquivalentSets(result.totalSets)} series
          </Text>
        ) : null}
      </View>
      {selected ? (
        <Icon name="check" size={spacing.lg} color={colors.primary.DEFAULT} />
      ) : null}
    </PressableScale>
  );
}

interface BodyViewProps {
  label: string;
  view: 'front' | 'back';
  colors: Record<MuscleKey, string>;
  priorities: Record<MuscleKey, number>;
  selectedMuscles: readonly VolumeMuscleGroup[];
  gender: 'male' | 'female';
  size: number;
  onPress: (event: MuscleMapPressEvent) => void;
}

function BodyView({
  label,
  view,
  colors: muscleColors,
  priorities,
  selectedMuscles,
  gender,
  size,
  onPress,
}: BodyViewProps) {
  return (
    <View style={styles.bodyColumn}>
      <Text variant="label" tone="muted" style={styles.bodyLabel}>
        {label}
      </Text>
      <View
        style={styles.bodyTouchArea}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
      >
        <MuscleMap
          view={view}
          colors={muscleColors}
          colorPriority={priorities}
          selectedMuscles={selectedMuscles}
          gender={gender}
          size={size}
          onBodyPartPress={onPress}
        />
      </View>
    </View>
  );
}

interface MuscleDetailProps {
  result: MuscleVolumeResult;
  frequencyUnit: string;
  showDivider: boolean;
}

function MuscleDetail({
  result,
  frequencyUnit,
  showDivider,
}: MuscleDetailProps) {
  return (
    <View style={[styles.muscleDetail, showDivider && styles.detailDivider]}>
      <View style={styles.detailHeader}>
        <Text variant="subheading" weight="bold" style={styles.detailName}>
          {MUSCLE_GROUP_LABELS[result.muscle]}
        </Text>
        <View
          style={[
            styles.zoneBadge,
            { borderColor: ZONE_COLORS[result.zone] },
          ]}
        >
          <View
            style={[
              styles.zoneDot,
              { backgroundColor: ZONE_COLORS[result.zone] },
            ]}
          />
          <Text variant="caption" weight="semibold">
            {MUSCLE_VOLUME_ZONE_LABELS[result.zone]}
          </Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text variant="heading" weight="bold" numeric>
            {formatEquivalentSets(result.totalSets)}
          </Text>
          <Text variant="caption" tone="secondary">
            series equivalentes
          </Text>
        </View>
        <View style={styles.metric}>
          <Text variant="heading" weight="bold" numeric>
            {result.frequency}
          </Text>
          <Text variant="caption" tone="secondary">
            {frequencyUnit}
          </Text>
        </View>
      </View>

      {result.totalSets > 0 && result.exercises.length > 0 ? (
        <View style={styles.exercises}>
          <Text variant="label" tone="muted">
            Ejercicios que contribuyen
          </Text>
          {result.exercises.map((exercise) => (
            <View key={exercise.exerciseId} style={styles.exerciseRow}>
              <Text variant="caption" style={styles.exerciseName}>
                {exercise.exerciseName}
              </Text>
              <Text variant="caption" tone="secondary" numeric>
                {formatEquivalentSets(exercise.equivalentSets)} series ·{' '}
                {exercise.frequency}×
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function formatEquivalentSets(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  maps: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: spacing.sm,
  },
  bodyColumn: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  bodyLabel: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  bodyTouchArea: {
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
    minHeight: 24,
  },
  legendSwatch: {
    borderRadius: radius.sm,
    height: 12,
    width: 12,
  },
  legendText: {
    fontSize: 12,
  },
  disclaimer: {
    marginTop: spacing.sm,
  },
  explore: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  exploreContent: {
    gap: spacing.sm,
  },
  exploreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  emptyCopy: {
    maxWidth: 280,
    textAlign: 'center',
  },
  muscleButton: {
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  muscleButtonGrid: {
    flexBasis: '47%',
    justifyContent: 'flex-start',
    minWidth: 0,
    paddingVertical: spacing.sm,
  },
  muscleButtonCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  detailPanel: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  muscleDetail: {
    paddingVertical: spacing.lg,
  },
  detailDivider: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  detailName: {
    flex: 1,
  },
  zoneBadge: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  zoneDot: {
    borderRadius: radius.full,
    height: 8,
    width: 8,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  metric: {
    flex: 1,
  },
  exercises: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  exerciseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 44,
  },
  exerciseName: {
    flex: 1,
  },
});
