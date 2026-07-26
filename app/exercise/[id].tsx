import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { ExerciseHero } from '@/components/workout/ExerciseHero';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import {
  EQUIPMENT_LABELS,
  exerciseById,
  MUSCLE_GROUP_LABELS,
  type Exercise,
} from '@/data/exercises';
import { exerciseDatasetDetail } from '@/data/exerciseDatasetDetails';
import {
  buildExerciseDetails,
  exerciseTrendMetric,
  type ExerciseDetails,
  type ExerciseSessionDetail,
  type ExerciseTrendMetric,
} from '@/lib/exerciseDetails';
import { formatWeight, toDisplay } from '@/lib/units';
import { useAppStore, type Unit } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { useMainTabsStore } from '@/store/mainTabs';
import { colors, radius, spacing } from '@/theme/tokens';

type ExerciseTab = 'info' | 'history' | 'records';

const TABS = [
  { value: 'info', label: 'Información', icon: 'dumbbell' },
  { value: 'history', label: 'Historial', icon: 'calendar' },
  { value: 'records', label: 'Récords', icon: 'trophy' },
] as const satisfies readonly {
  value: ExerciseTab;
  label: string;
  icon: IconName;
}[];

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const exerciseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const exercise = exerciseId ? exerciseById(exerciseId) : undefined;
  const history = useWorkoutsStore((state) => state.history);
  const unit = useAppStore((state) => state.profile?.unit ?? 'kg');
  const [tab, setTab] = useState<ExerciseTab>('info');
  const details = useMemo(
    () => buildExerciseDetails(history, exerciseId ?? ''),
    [exerciseId, history],
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const requestMainTab = useMainTabsStore((state) => state.requestTab);
  const chooseRoutine = () => {
    requestMainTab('routines');
    router.replace('/(tabs)');
  };

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.invalidHeader}>
          <IconButton
            name="chevron-left"
            accessibilityLabel="Volver"
            accessibilityHint="Vuelve a la pantalla anterior"
            onPress={goBack}
            variant="surface"
            size="sm"
            haptic={false}
          />
        </View>
        <View style={styles.invalidContent}>
          <View style={styles.invalidIcon}>
            <Icon name="dumbbell" size={36} color={colors.text.muted} />
          </View>
          <Text variant="headline" style={styles.centeredText}>
            Ejercicio no encontrado
          </Text>
          <Text tone="secondary" style={styles.centeredText}>
            Este ejercicio ya no está disponible o el enlace no es válido.
          </Text>
          <Button title="Volver al inicio" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <IconButton
          name="chevron-left"
          accessibilityLabel="Volver"
          accessibilityHint="Vuelve a la pantalla anterior"
          onPress={goBack}
          variant="surface"
          size="sm"
          haptic={false}
        />
        <View style={styles.headerTitle}>
          <Text variant="label" tone="muted">
            Biblioteca de ejercicios
          </Text>
          <Text weight="bold" numberOfLines={1}>
            {exercise.name}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing['2xl'] },
        ]}
      >
        <ExerciseHero
          exerciseId={exercise.id}
          name={exercise.name}
          subtitle={`${MUSCLE_GROUP_LABELS[exercise.muscle]} · ${EQUIPMENT_LABELS[exercise.equipment]}`}
          style={styles.hero}
        />

        <OverviewStrip details={details} />

        <SegmentedControl<ExerciseTab>
          options={TABS}
          value={tab}
          onValueChange={setTab}
          accessibilityLabel="Secciones del ejercicio"
        />

        {tab === 'info' ? <InformationTab exercise={exercise} /> : null}
        {tab === 'history' ? (
          <HistoryTab
            sessions={details.sessions}
            unit={unit}
            onChooseRoutine={chooseRoutine}
          />
        ) : null}
        {tab === 'records' ? (
          <RecordsTab
            details={details}
            unit={unit}
            onChooseRoutine={chooseRoutine}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function OverviewStrip({ details }: { details: ExerciseDetails }) {
  return (
    <View style={styles.overviewStrip}>
      <OverviewMetric value={String(details.sessionCount)} label="Sesiones" />
      <View style={styles.metricDivider} />
      <OverviewMetric value={String(details.workingSetCount)} label="Series" />
      <View style={styles.metricDivider} />
      <OverviewMetric value={String(details.totalReps)} label="Repeticiones" />
    </View>
  );
}

function OverviewMetric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.overviewMetric}>
      <Text variant="heading" weight="black" numeric>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function InformationTab({ exercise }: { exercise: Exercise }) {
  const externalDetail = exerciseDatasetDetail(exercise.id);
  const instructions = externalDetail?.instructionsEs ?? exercise.instructions;

  return (
    <View style={styles.section}>
      <SectionTitle
        icon="target"
        title="Cómo hacerlo"
        subtitle="Prioriza el control y una técnica consistente."
      />
      <Card variant="section" padding="lg" style={styles.instructionCard}>
        <View style={styles.stepBadge}>
          <Text tone="brand" weight="black">
            01
          </Text>
        </View>
        <View style={styles.instructionCopy}>
          <Text style={styles.instructionText}>{instructions}</Text>
          {externalDetail ? (
            <Text variant="caption" tone="muted" style={styles.datasetSource}>
              Instrucciones ampliadas desde exercises-dataset · metadata MIT · sin media externa
            </Text>
          ) : null}
        </View>
      </Card>

      <SectionTitle
        icon="muscle"
        title="Enfoque muscular"
        subtitle="Músculo principal y sinergistas relevantes."
      />
      <View style={styles.chipRow}>
        <MusclePill
          label={MUSCLE_GROUP_LABELS[exercise.muscle]}
          icon="target"
          primary
        />
        {exercise.secondary?.map((muscle) => (
          <MusclePill
            key={muscle}
            label={MUSCLE_GROUP_LABELS[muscle]}
            icon="muscle"
          />
        ))}
      </View>

      <View style={styles.infoGrid}>
        <InfoTile
          icon="dumbbell"
          label="Equipo"
          value={EQUIPMENT_LABELS[exercise.equipment]}
        />
        <InfoTile
          icon="lightning"
          label="Tipo"
          value={exercise.isCompound ? 'Compuesto' : 'Aislamiento'}
        />
      </View>
    </View>
  );
}

function MusclePill({
  label,
  icon,
  primary = false,
}: {
  label: string;
  icon: IconName;
  primary?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${primary ? 'Músculo principal' : 'Músculo secundario'}: ${label}`}
      style={[styles.musclePill, primary && styles.musclePillPrimary]}
    >
      <Icon
        name={icon}
        size={spacing.lg}
        color={primary ? colors.primary.DEFAULT : colors.text.secondary}
        filled={primary}
      />
      <Text
        variant="caption"
        tone={primary ? 'brand' : 'secondary'}
        weight={primary ? 'bold' : 'semibold'}
      >
        {primary ? `Principal · ${label}` : label}
      </Text>
    </View>
  );
}

function HistoryTab({
  sessions,
  unit,
  onChooseRoutine,
}: {
  sessions: ExerciseSessionDetail[];
  unit: Unit;
  onChooseRoutine: () => void;
}) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="Tu historial empieza aquí"
        body="Completa este ejercicio en una sesión para ver tus cargas, repeticiones y trabajo total."
        action="Elegir una rutina"
        onAction={onChooseRoutine}
      />
    );
  }

  return (
    <View style={styles.section}>
      <SectionTitle
        icon="calendar"
        title="Sesiones"
        subtitle={`${sessions.length} ${sessions.length === 1 ? 'registro' : 'registros'} completados`}
      />
      <View style={styles.sessionList}>
        {sessions.map((session, index) => (
          <SessionCard
            key={`${session.workoutId}-${session.startedAt}`}
            session={session}
            unit={unit}
            isLatest={index === 0}
          />
        ))}
      </View>
    </View>
  );
}

function SessionCard({
  session,
  unit,
  isLatest,
}: {
  session: ExerciseSessionDetail;
  unit: Unit;
  isLatest: boolean;
}) {
  const weighted = session.bestWeightKg > 0;

  return (
    <Card variant="raised" padding="lg" style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.dateIcon}>
          <Icon name="calendar" size={18} color={colors.primary.DEFAULT} />
        </View>
        <View style={styles.flex}>
          <Text weight="bold">{formatDate(session.startedAt)}</Text>
          <Text variant="caption" tone="muted">
            {session.setCount} {session.setCount === 1 ? 'serie efectiva' : 'series efectivas'}
          </Text>
        </View>
        {isLatest ? (
          <View style={styles.latestBadge}>
            <Text variant="label" tone="brand">
              Última
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.sessionMetrics}>
        <SessionMetric
          label={weighted ? 'Mejor serie' : 'Máx. reps'}
          value={
            weighted
              ? `${formatWeight(session.bestWeightKg, unit)} × ${session.bestWeightReps}`
              : `${session.bestSetReps} reps`
          }
        />
        <SessionMetric label="Reps totales" value={String(session.totalReps)} />
        <SessionMetric
          label="Trabajo"
          value={weighted ? formatWork(session.volumeKg, unit) : 'Corporal'}
        />
      </View>
    </Card>
  );
}

function SessionMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sessionMetric}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text weight="bold" numeric numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function RecordsTab({
  details,
  unit,
  onChooseRoutine,
}: {
  details: ExerciseDetails;
  unit: Unit;
  onChooseRoutine: () => void;
}) {
  if (details.sessions.length === 0) {
    return (
      <EmptyState
        icon="trophy"
        title="Aún no hay récords"
        body="Registra tu primera sesión y construiremos tus mejores marcas automáticamente."
        action="Elegir una rutina"
        onAction={onChooseRoutine}
      />
    );
  }

  const hasWeightedRecord = (details.maxWeight?.weightKg ?? 0) > 0;
  const trendMetric = exerciseTrendMetric(details.sessions);

  return (
    <View style={styles.section}>
      <SectionTitle
        icon="trophy"
        title="Mejores marcas"
        subtitle="Calculadas con tus series efectivas completadas."
      />
      <View style={styles.recordGrid}>
        <RecordCard
          icon="barbell"
          accent={colors.primary.DEFAULT}
          label={hasWeightedRecord ? 'Carga máxima' : 'Máxima serie'}
          value={
            hasWeightedRecord && details.maxWeight
              ? formatWeight(details.maxWeight.weightKg, unit)
              : `${details.maxReps?.reps ?? 0} reps`
          }
          detail={
            hasWeightedRecord && details.maxWeight
              ? `${details.maxWeight.reps} reps · ${formatShortDate(details.maxWeight.startedAt)}`
              : formatShortDate(details.maxReps?.startedAt)
          }
        />
        <RecordCard
          icon="chart"
          accent={colors.accent.DEFAULT}
          label="Reps en sesión"
          value={`${details.maxRepsSession?.totalReps ?? 0} reps`}
          detail={formatShortDate(details.maxRepsSession?.startedAt)}
        />
        <RecordCard
          icon="props"
          accent={colors.success}
          label="Reps en una serie"
          value={`${details.maxReps?.reps ?? 0} reps`}
          detail={
            details.maxReps && details.maxReps.weightKg > 0
              ? `Con ${formatWeight(details.maxReps.weightKg, unit)}`
              : 'Peso corporal'
          }
        />
        {details.maxActiveSession?.activeSeconds !== null &&
        details.maxActiveSession?.activeSeconds !== undefined ? (
          <RecordCard
            icon="clock"
            accent={colors.info.DEFAULT}
            label="Tiempo activo"
            value={formatActiveSeconds(details.maxActiveSession.activeSeconds)}
            detail={`${details.maxActiveSession.setCount} series · ${formatShortDate(details.maxActiveSession.startedAt)}`}
          />
        ) : null}
      </View>

      <SectionTitle
        icon="chart"
        title="Tendencia reciente"
        subtitle={
          trendMetric === 'weight'
            ? 'Mayor carga completada por sesión'
            : 'Repeticiones por sesión'
        }
      />
      <TrendCard sessions={details.sessions} unit={unit} metric={trendMetric} />
    </View>
  );
}

function RecordCard({
  icon,
  accent,
  label,
  value,
  detail,
}: {
  icon: IconName;
  accent: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card variant="raised" padding="lg" style={styles.recordCard}>
      <View style={[styles.recordIcon, { backgroundColor: `${accent}24` }]}>
        <Icon name={icon} size={19} color={accent} />
      </View>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="heading" weight="black" numeric numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" tone="secondary" numberOfLines={2}>
        {detail}
      </Text>
    </Card>
  );
}

function TrendCard({
  sessions,
  unit,
  metric,
}: {
  sessions: ExerciseSessionDetail[];
  unit: Unit;
  metric: ExerciseTrendMetric;
}) {
  const recent = sessions.slice(0, 7).reverse();
  const values = recent.map((session) =>
    metric === 'weight' ? session.bestWeightKg : session.totalReps,
  );
  const max = Math.max(...values, 1);
  const latestValue = values.at(-1) ?? 0;
  const formatValue = (value: number) =>
    metric === 'weight' ? formatWeight(value, unit) : `${value} reps`;
  const accessibilitySummary = recent
    .map(
      (session, index) =>
        `${formatShortDate(session.startedAt)}: ${formatValue(values[index])}`,
    )
    .join('; ');

  return (
    <Card variant="section" padding="lg" style={styles.trendCard}>
      <View style={styles.trendHeader}>
        <View>
          <Text variant="caption" tone="muted">
            Última sesión
          </Text>
          <Text variant="headline" weight="black" numeric>
            {formatValue(latestValue)}
          </Text>
        </View>
        <Text variant="caption" tone="muted">
          Últimas {recent.length}
        </Text>
      </View>
      <View
        style={styles.bars}
        accessibilityRole="image"
        accessibilityLabel={`Tendencia de las últimas ${recent.length} sesiones. ${accessibilitySummary}`}
      >
        {recent.map((session, index) => {
          const value = values[index];
          const height = Math.max(12, (value / max) * 92);
          const isLatest = index === recent.length - 1;
          return (
            <View key={`${session.workoutId}-${session.startedAt}`} style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: isLatest
                      ? colors.primary.DEFAULT
                      : colors.primary.glow,
                  },
                ]}
              />
              <Text variant="label" tone={isLatest ? 'brand' : 'muted'}>
                {formatDay(session.startedAt)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <Card variant="raised" padding="lg" style={styles.infoTile}>
      <Icon name={icon} size={21} color={colors.primary.DEFAULT} />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text weight="bold">{value}</Text>
    </Card>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionIcon}>
        <Icon name={icon} size={18} color={colors.primary.DEFAULT} />
      </View>
      <View style={styles.flex}>
        <Text variant="heading" weight="bold">
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <Card variant="section" padding="xl" style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={colors.primary.DEFAULT} />
      </View>
      <Text variant="heading" weight="bold" style={styles.centeredText}>
        {title}
      </Text>
      <Text tone="secondary" style={styles.centeredText}>
        {body}
      </Text>
      <Button title={action} onPress={onAction} fullWidth />
    </Card>
  );
}

function safeDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(value: string) {
  const date = safeDate(value);
  return date
    ? date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Fecha sin registrar';
}

function formatShortDate(value?: string) {
  const date = safeDate(value);
  return date
    ? date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    : 'Sin fecha';
}

function formatDay(value: string) {
  const date = safeDate(value);
  return date
    ? date.toLocaleDateString('es-ES', { day: '2-digit' })
    : '—';
}

function formatActiveSeconds(value: number) {
  const seconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatWork(volumeKg: number, unit: Unit) {
  const display = toDisplay(volumeKg, unit);
  const rounded =
    display >= 1000
      ? `${(display / 1000).toFixed(display >= 10000 ? 0 : 1)}k`
      : Math.round(display).toLocaleString('es-ES');
  return `${rounded} ${unit}·rep`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  flex: {
    flex: 1,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    gap: 1,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  hero: {
    height: 220,
  },
  overviewStrip: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
    paddingVertical: spacing.md,
  },
  overviewMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
  },
  section: {
    gap: spacing.lg,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.muted,
    borderWidth: 1,
    borderColor: colors.primary.glow,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.muted,
  },
  instructionText: {
    lineHeight: 24,
  },
  instructionCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  datasetSource: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  musclePill: {
    minHeight: spacing['2xl'] + spacing.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
  },
  musclePillPrimary: {
    borderColor: colors.primary.glow,
    backgroundColor: colors.primary.muted,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoTile: {
    flex: 1,
    gap: spacing.sm,
    minHeight: 120,
  },
  sessionList: {
    gap: spacing.md,
  },
  sessionCard: {
    gap: spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.muted,
  },
  latestBadge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary.glow,
    backgroundColor: colors.primary.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sessionMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sessionMetric: {
    flex: 1,
    gap: 2,
  },
  recordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  recordCard: {
    flexBasis: '45%',
    flexGrow: 1,
    minHeight: 164,
    gap: spacing.sm,
  },
  recordIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendCard: {
    gap: spacing.lg,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bars: {
    height: 126,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  bar: {
    width: '62%',
    minWidth: 12,
    maxWidth: 30,
    borderRadius: radius.sm,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.muted,
    borderWidth: 1,
    borderColor: colors.primary.glow,
  },
  centeredText: {
    textAlign: 'center',
  },
  invalidHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  invalidContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing['2xl'],
  },
  invalidIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
