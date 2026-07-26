import { Workout } from '@/store/workouts';
import { UserProfile } from '@/store/app';
import { Routine } from '@/store/routines';
import { exerciseById } from '@/data/exercises';

export interface OptimizationBreakdown {
  frequency: number;
  volumeBalance: number;
  recovery: number;
  progression: number;
  variety: number;
}

export interface OptimizationScore {
  score: number;
  breakdown: OptimizationBreakdown;
  weakGroups: string[];
}

export const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  // Legacy alias — keeps old data readable
  shoulders: 'Hombros',
  front_delt: 'Hombro frontal',
  lateral_delt: 'Hombro lateral',
  rear_delt: 'Hombro posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  core: 'Core',
  full_body: 'Cuerpo completo',
};

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function scoreFrequency(history: Workout[], weeklyGoalDays: number): number {
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  const days = new Set(
    history
      .filter((w) => new Date(w.startedAt).getTime() >= cutoff)
      .map((w) => dayKey(w.startedAt)),
  );
  return Math.min(100, Math.round((days.size / weeklyGoalDays) * 100));
}

function scoreVolumeBalance(history: Workout[]): {
  score: number;
  setsByGroup: Record<string, number>;
} {
  const setsByGroup: Record<string, number> = {};

  for (const w of history) {
    for (const ex of w.exercises) {
      const exercise = exerciseById(ex.exerciseId);
      if (!exercise) continue;
      const effectiveSets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup).length;
      setsByGroup[exercise.muscle] = (setsByGroup[exercise.muscle] ?? 0) + effectiveSets;
    }
  }

  const sets = Object.values(setsByGroup);
  if (sets.length === 0) return { score: 50, setsByGroup };

  const mean = sets.reduce((a, b) => a + b, 0) / sets.length;
  if (mean === 0) return { score: 50, setsByGroup };

  const cv = stdDev(sets) / mean;
  const score = Math.max(0, Math.round(100 - cv * 80));

  return { score, setsByGroup };
}

function scoreRecovery(history: Workout[]): number {
  const cutoff = Date.now() - 14 * 24 * 3600 * 1000;
  const recent = history
    .filter((w) => new Date(w.startedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  if (recent.length < 3) return 100;

  // Aggregate muscle groups per day
  const dayGroups: { day: string; groups: Set<string> }[] = [];
  for (const w of recent) {
    const day = dayKey(w.startedAt);
    let entry = dayGroups.find((d) => d.day === day);
    if (!entry) {
      entry = { day, groups: new Set() };
      dayGroups.push(entry);
    }
    for (const ex of w.exercises) {
      const exercise = exerciseById(ex.exerciseId);
      if (exercise) entry.groups.add(exercise.muscle);
    }
  }

  // Count cases where the same group appears 3+ consecutive days
  let violations = 0;
  for (let i = 2; i < dayGroups.length; i++) {
    for (const group of dayGroups[i].groups) {
      if (dayGroups[i - 1].groups.has(group) && dayGroups[i - 2].groups.has(group)) {
        violations++;
      }
    }
  }

  return Math.max(0, 100 - violations * 25);
}

function scoreProgression(history: Workout[]): number {
  const now = Date.now();
  // weeks[0] = oldest (4 weeks ago), weeks[3] = most recent
  const weeks = [3, 2, 1, 0].map((i) => {
    const from = now - (i + 1) * 7 * 24 * 3600 * 1000;
    const to = now - i * 7 * 24 * 3600 * 1000;
    return history
      .filter((w) => {
        const t = new Date(w.startedAt).getTime();
        return t >= from && t < to;
      })
      .reduce((acc, w) => acc + w.totalReps, 0);
  });

  if (weeks.filter((v) => v > 0).length < 2) return 50;

  const n = weeks.length;
  const xMean = (n - 1) / 2;
  const yMean = weeks.reduce((a, b) => a + b, 0) / n;
  const num = weeks.reduce((acc, y, x) => acc + (x - xMean) * (y - yMean), 0);
  const den = weeks.reduce((acc, _, x) => acc + (x - xMean) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;

  if (yMean === 0) return 50;
  // +20% per week → 100, 0% → 50, -20% per week → 0
  const normalizedSlope = slope / yMean;
  return Math.min(100, Math.max(0, Math.round(50 + normalizedSlope * 250)));
}

function scoreVariety(history: Workout[]): number {
  const cutoff = Date.now() - 28 * 24 * 3600 * 1000;
  const recent = history.filter((w) => new Date(w.startedAt).getTime() >= cutoff);

  if (recent.length === 0) return 50;

  let total = 0;
  const distinct = new Set<string>();
  for (const w of recent) {
    for (const ex of w.exercises) {
      total++;
      distinct.add(ex.exerciseId);
    }
  }

  if (total === 0) return 50;
  return Math.round((distinct.size / total) * 100);
}

// ---------------------------------------------------------------------------
// Routine-structure optimization score (Goal 3)
// ---------------------------------------------------------------------------

export interface RoutineScoreBreakdown {
  balance: number;
  coverage: number;
  volume: number;
  frequency: number;
  separation: number;
}

export interface RoutineScore {
  score: number;
  breakdown: RoutineScoreBreakdown;
  weakGroups: string[];
}

const MAJOR_GROUPS = [
  'chest', 'back', 'front_delt', 'lateral_delt', 'rear_delt', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves',
] as const;

export const UPPER_MUSCLES = ['chest', 'back', 'front_delt', 'lateral_delt', 'rear_delt', 'biceps', 'triceps'] as const;
export const LOWER_MUSCLES = ['quads', 'hamstrings', 'glutes', 'calves'] as const;

export const MIN_WEEKLY_SETS = 8;
export const OPTIMAL_MAX_SETS = 20;

export type MuscleStatus = 'untrained' | 'low' | 'optimal' | 'high';

export interface MuscleAssessment {
  muscle: string;
  label: string;
  weeklySets: number;
  frequency: number;
  perSession: number;
  status: MuscleStatus;
  hint: string;
}

/**
 * Peso fraccional de los músculos sinergistas (método fraccional):
 * cada serie cuenta 1 para el primario y 0.5 para cada secundario.
 * Estándar respaldado por el meta-análisis de dosis-respuesta 2024-25.
 */
const SECONDARY_WEIGHT = 0.5;

/**
 * Single-pass helper: builds weeklySets and frequency per muscle.
 * Con `includeSecondary`, suma 0.5 series a cada músculo sinergista del
 * ejercicio (p.ej. press de banca → tríceps y hombro frontal). El score
 * numérico de la rutina lo deja en false para no alterar su comportamiento.
 */
function buildRoutineMuscleStats(
  routine: Routine,
  includeSecondary = false,
): {
  setsByMuscle: Record<string, number>;
  daysByMuscle: Record<string, number>;
} {
  const setsByMuscle: Record<string, number> = {};
  const daysByMuscle: Record<string, number> = {};

  for (const day of routine.days) {
    const musclesThisDay = new Set<string>();
    for (const ex of day.exercises) {
      const exercise = exerciseById(ex.exerciseId);
      if (!exercise) continue;
      const muscle = exercise.muscle;
      setsByMuscle[muscle] = (setsByMuscle[muscle] ?? 0) + ex.targetSets;
      musclesThisDay.add(muscle);
      if (includeSecondary && exercise.secondary) {
        for (const sm of exercise.secondary) {
          setsByMuscle[sm] = (setsByMuscle[sm] ?? 0) + ex.targetSets * SECONDARY_WEIGHT;
          musclesThisDay.add(sm);
        }
      }
    }
    for (const m of musclesThisDay) {
      daysByMuscle[m] = (daysByMuscle[m] ?? 0) + 1;
    }
  }

  return { setsByMuscle, daysByMuscle };
}

export function analyzeRoutineMuscles(routine: Routine): MuscleAssessment[] {
  // includeSecondary: la tabla y el mapa corporal cuentan los sinergistas (0.5).
  const { setsByMuscle, daysByMuscle } = buildRoutineMuscleStats(routine, true);

  const items: MuscleAssessment[] = [];
  for (const muscle of MAJOR_GROUPS) {
    // Redondea a múltiplos de 0.5 para evitar floats sucios (p.ej. 2.5 series).
    const weeklySets = Math.round((setsByMuscle[muscle] ?? 0) * 2) / 2;
    if (weeklySets === 0) continue; // only muscles present in routine

    const frequency = daysByMuscle[muscle] ?? 0;
    const perSession = Math.round(weeklySets / Math.max(1, frequency));

    let status: MuscleStatus;
    if (weeklySets === 0) status = 'untrained';
    else if (weeklySets < MIN_WEEKLY_SETS) status = 'low';
    else if (weeklySets <= OPTIMAL_MAX_SETS) status = 'optimal';
    else status = 'high';

    let hint: string;
    if (status === 'low') {
      hint = 'Por debajo de 8 series/semana: sube volumen.';
    } else if (status === 'high') {
      hint = 'Mucho volumen: revisa si no acumulas fatiga.';
    } else if (weeklySets >= 10 && frequency <= 1) {
      hint = 'Reparte en 2 sesiones: bajas las series por día y mejoras el estímulo.';
    } else if (frequency === 1) {
      hint = 'Frecuencia 1: válida, pero 2 suele dar mejores resultados.';
    } else if (frequency === 2) {
      hint = 'Frecuencia ideal.';
    } else {
      hint = 'Frecuencia alta: viable solo si recuperas bien.';
    }

    items.push({
      muscle,
      label: MUSCLE_LABELS[muscle] ?? muscle,
      weeklySets,
      frequency,
      perSession,
      status,
      hint,
    });
  }

  // Sort: untrained first, then low, high, optimal; within same status by weeklySets asc
  const order: MuscleStatus[] = ['untrained', 'low', 'high', 'optimal'];
  items.sort((a, b) => {
    const oa = order.indexOf(a.status);
    const ob = order.indexOf(b.status);
    if (oa !== ob) return oa - ob;
    return a.weeklySets - b.weeklySets;
  });

  return items;
}

export function computeRoutineScore(routine: Routine, profile: UserProfile): RoutineScore {
  const { setsByMuscle: weeklySets } = buildRoutineMuscleStats(routine);

  const majorCounts = MAJOR_GROUPS.map((g) => weeklySets[g] ?? 0);
  const trainedIndices = majorCounts.map((c, i) => ({ count: c, i })).filter((x) => x.count > 0);
  const trainedCounts = trainedIndices.map((x) => x.count);

  // coverage
  const coverage = Math.round((trainedIndices.length / MAJOR_GROUPS.length) * 100);

  // balance
  let balance: number;
  if (trainedCounts.length < 2) {
    balance = 100;
  } else {
    const mean = trainedCounts.reduce((a, b) => a + b, 0) / trainedCounts.length;
    const cv = mean === 0 ? 0 : stdDev(trainedCounts) / mean;
    balance = Math.max(0, Math.min(100, Math.round(100 - cv * 80)));
  }

  // volume: trained groups with sets in [10, 20]
  let volume: number;
  if (trainedCounts.length === 0) {
    volume = 0;
  } else {
    const inRange = trainedCounts.filter((c) => c >= 10 && c <= 20).length;
    volume = Math.round((inRange / trainedCounts.length) * 100);
  }

  // frequency
  const frequency = Math.max(0, Math.min(100, Math.round((routine.days.length / profile.weeklyGoalDays) * 100)));

  // separation: violations = major group present on two consecutive ordered days
  const dayGroupSets: Set<string>[] = routine.days.map((day) => {
    const groups = new Set<string>();
    for (const ex of day.exercises) {
      const exercise = exerciseById(ex.exerciseId);
      if (exercise && (MAJOR_GROUPS as readonly string[]).includes(exercise.muscle)) {
        groups.add(exercise.muscle);
      }
    }
    return groups;
  });

  let violations = 0;
  for (let i = 1; i < dayGroupSets.length; i++) {
    for (const group of dayGroupSets[i]) {
      if (dayGroupSets[i - 1].has(group)) violations++;
    }
  }
  const separation = Math.max(0, Math.min(100, Math.round(100 - violations * 15)));

  const score = Math.round(
    coverage * 0.25 +
    balance * 0.25 +
    volume * 0.20 +
    frequency * 0.15 +
    separation * 0.15,
  );

  // weakGroups: 2 MAJOR_GROUPS with lowest weeklySets (including 0)
  const sorted = [...MAJOR_GROUPS].sort((a, b) => (weeklySets[a] ?? 0) - (weeklySets[b] ?? 0));
  const weakGroups = sorted.slice(0, 2);

  return {
    score,
    breakdown: { coverage, balance, volume, frequency, separation },
    weakGroups,
  };
}

export function computeOptimizationScore(
  history: Workout[],
  profile: UserProfile,
): OptimizationScore {
  if (history.length === 0) {
    return {
      score: 0,
      breakdown: { frequency: 0, volumeBalance: 0, recovery: 100, progression: 50, variety: 50 },
      weakGroups: [],
    };
  }

  const frequency = scoreFrequency(history, profile.weeklyGoalDays);
  const { score: volumeBalance, setsByGroup } = scoreVolumeBalance(history);
  const recovery = scoreRecovery(history);
  const progression = scoreProgression(history);
  const variety = scoreVariety(history);

  const score = Math.round(
    frequency * 0.25 +
      volumeBalance * 0.25 +
      recovery * 0.2 +
      progression * 0.2 +
      variety * 0.1,
  );

  const weakGroups = Object.entries(setsByGroup)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 2)
    .map(([group]) => group);

  return { score, breakdown: { frequency, volumeBalance, recovery, progression, variety }, weakGroups };
}
