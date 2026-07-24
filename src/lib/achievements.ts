/**
 * Sistema de logros estilo Duolingo.
 *
 * Cada "logro" es un *track* con varios niveles (tiers) escalonados — igual que
 * las ligas/insignias de Duolingo, donde la misma medalla sube de nivel. Los
 * niveles se calculan de forma 100% derivada del historial local (`Workout[]`)
 * + la racha semanal, así que funcionan offline y sin tablas extra en Supabase.
 *
 * El store `src/store/achievements.ts` persiste qué niveles ya se desbloquearon
 * (con su fecha) para poder detectar *nuevos* desbloqueos y celebrarlos.
 */

import { Workout } from '@/store/workouts';
import { exerciseTopWeight } from '@/lib/workoutCompare';
import type { IconName } from '@/components/Icon';
import { colors } from '@/theme/tokens';

export type AchievementCategory = 'strength' | 'streak' | 'consistency' | 'variety';

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  strength: 'Fuerza',
  streak: 'Constancia semanal',
  consistency: 'Volumen',
  variety: 'Variedad',
};

export interface AchievementTier {
  /** Id único global del nivel (sirve de clave de persistencia). */
  id: string;
  /** Valor numérico necesario para desbloquear este nivel. */
  threshold: number;
  /** Texto corto que describe el hito ("100 kg", "8 semanas"…). */
  label: string;
}

export interface AchievementDef {
  /** Id del track (no del nivel). */
  id: string;
  category: AchievementCategory;
  title: string;
  /** Frase corta de qué mide el track. */
  description: string;
  icon: IconName;
  color: string;
  /** Sufijo de unidad para mostrar el valor ("kg", "sem"…). '' si no aplica. */
  unit: string;
  tiers: AchievementTier[];
  /** Calcula el valor actual del usuario para este track. */
  measure: (ctx: AchievementContext) => number;
}

export interface AchievementContext {
  history: Workout[];
}

export interface AchievementProgress {
  def: AchievementDef;
  /** Valor actual del usuario (kg, semanas, conteo…). */
  value: number;
  /** Niveles ya alcanzados (threshold <= value). */
  unlockedTiers: AchievementTier[];
  /** Nivel más alto alcanzado, o null si aún ninguno. */
  currentTier: AchievementTier | null;
  /** Próximo nivel a conseguir, o null si está al máximo. */
  nextTier: AchievementTier | null;
  /** Progreso 0..1 hacia `nextTier` (desde el threshold del nivel actual). */
  progressToNext: number;
  /** Nº de niveles desbloqueados. */
  level: number;
  /** Nº total de niveles del track. */
  maxLevel: number;
}

// ───────────────────────── helpers de medición ─────────────────────────

/** Peso máximo de la serie top (completada, no calentamiento) para un ejercicio
 *  a lo largo de TODO el historial. */
function allTimeTopWeight(history: Workout[], exerciseId: string): number {
  let max = 0;
  for (const w of history) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const top = exerciseTopWeight(ex);
      if (top > max) max = top;
    }
  }
  return max;
}

/** Reps totales acumuladas (usa el total ya calculado al cerrar cada sesión). */
function totalRepsLifted(history: Workout[]): number {
  return history.reduce((acc, w) => acc + (w.totalReps ?? 0), 0);
}

/** Índice de semana (lunes como inicio) desde la época, para agrupar fechas.
 *  Usa la fecha LOCAL para que el corte de semana respete la zona horaria del
 *  usuario (un entreno el lunes por la noche no debe contar como la semana
 *  siguiente por la deriva UTC). */
export function weekIndex(d: Date): number {
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = Math.floor(localMidnight.getTime() / 86_400_000); // 1970-01-01 fue jueves
  return Math.floor((day + 3) / 7); // +3 alinea el corte de semana al lunes
}

/**
 * Racha de semanas consecutivas con al menos un entrenamiento, derivada del
 * historial. La semana en curso tiene "gracia": si aún no entrenas en ella, la
 * racha se cuenta desde la semana anterior en vez de romperse.
 */
export function weekStreakFromHistory(history: Workout[]): number {
  if (!history.length) return 0;
  const weeks = new Set<number>();
  for (const w of history) {
    const t = new Date(w.startedAt).getTime();
    if (Number.isFinite(t)) weeks.add(weekIndex(new Date(t)));
  }
  const current = weekIndex(new Date());
  let cursor = weeks.has(current) ? current : current - 1;
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

/** Días distintos (fecha local) con >=1 entreno dentro de la semana en curso (corte lunes). */
export function daysThisWeekFromHistory(history: Workout[], now = new Date()): number {
  const current = weekIndex(now);
  const days = new Set<string>();
  for (const w of history) {
    const d = new Date(w.startedAt);
    if (!Number.isFinite(d.getTime()) || weekIndex(d) !== current) continue;
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  return days.size;
}

/** Ejercicios distintos entrenados (con al menos una serie completada). */
function distinctExercises(history: Workout[]): number {
  const set = new Set<string>();
  for (const w of history) {
    for (const ex of w.exercises) {
      if (ex.sets.some((s) => s.isCompleted && !s.isWarmup)) set.add(ex.exerciseId);
    }
  }
  return set.size;
}

// ───────────────────────── definición del catálogo ─────────────────────────

/** Construye los niveles de un track de fuerza a partir de una lista de kilos. */
function weightTiers(prefix: string, kilos: number[]): AchievementTier[] {
  return kilos.map((kg) => ({ id: `${prefix}-${kg}`, threshold: kg, label: `${kg} kg` }));
}

/** Track de fuerza para un ejercicio "grande" con hitos de peso estándar. */
function strengthTrack(
  exerciseId: string,
  title: string,
  icon: IconName,
  color: string,
  kilos: number[],
): AchievementDef {
  return {
    id: `strength-${exerciseId}`,
    category: 'strength',
    title,
    description: 'Peso máximo en una serie',
    icon,
    color,
    unit: 'kg',
    tiers: weightTiers(exerciseId, kilos),
    measure: (ctx) => allTimeTopWeight(ctx.history, exerciseId),
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Fuerza: hitos de peso en los levantamientos grandes ──
  strengthTrack('bench-press', 'Press de banca', 'barbell', colors.primary.DEFAULT, [40, 60, 80, 100, 120, 140]),
  strengthTrack('squat', 'Sentadilla', 'barbell', colors.accent.DEFAULT, [60, 80, 100, 120, 160, 200]),
  strengthTrack('deadlift', 'Peso muerto', 'barbell', colors.medal.gold, [60, 100, 140, 180, 220, 260]),
  strengthTrack('overhead-press', 'Press militar', 'barbell', colors.info.DEFAULT, [30, 40, 50, 60, 70, 80]),

  // ── Constancia semanal: rachas de seguir la rutina ──
  {
    id: 'streak-weeks',
    category: 'streak',
    title: 'Racha semanal',
    description: 'Semanas seguidas cumpliendo tu rutina',
    icon: 'fire',
    color: colors.accent.DEFAULT,
    unit: 'sem',
    tiers: [
      { id: 'streak-2', threshold: 2, label: '2 semanas' },
      { id: 'streak-4', threshold: 4, label: '4 semanas' },
      { id: 'streak-8', threshold: 8, label: '8 semanas' },
      { id: 'streak-12', threshold: 12, label: '12 semanas' },
      { id: 'streak-26', threshold: 26, label: '6 meses' },
      { id: 'streak-52', threshold: 52, label: '1 año' },
    ],
    // La racha se deriva íntegramente del historial local (corte lunes, con
    // gracia para la semana en curso) — no hay contador persistido que mantener.
    measure: (ctx) => weekStreakFromHistory(ctx.history),
  },

  // ── Volumen: constancia de entrenamientos y reps acumuladas ──
  {
    id: 'consistency-workouts',
    category: 'consistency',
    title: 'Entrenamientos',
    description: 'Sesiones completadas en total',
    icon: 'dumbbell',
    color: colors.primary.DEFAULT,
    unit: '',
    tiers: [
      { id: 'workouts-1', threshold: 1, label: '1.ᵉʳ entreno' },
      { id: 'workouts-10', threshold: 10, label: '10 entrenos' },
      { id: 'workouts-25', threshold: 25, label: '25 entrenos' },
      { id: 'workouts-50', threshold: 50, label: '50 entrenos' },
      { id: 'workouts-100', threshold: 100, label: '100 entrenos' },
      { id: 'workouts-250', threshold: 250, label: '250 entrenos' },
    ],
    measure: (ctx) => ctx.history.length,
  },
  {
    id: 'consistency-reps',
    category: 'consistency',
    title: 'Reps totales',
    description: 'Repeticiones acumuladas de por vida',
    icon: 'muscle',
    color: colors.accent.DEFAULT,
    unit: '',
    tiers: [
      { id: 'reps-1000', threshold: 1000, label: '1.000 reps' },
      { id: 'reps-5000', threshold: 5000, label: '5.000 reps' },
      { id: 'reps-10000', threshold: 10000, label: '10.000 reps' },
      { id: 'reps-25000', threshold: 25000, label: '25.000 reps' },
      { id: 'reps-50000', threshold: 50000, label: '50.000 reps' },
      { id: 'reps-100000', threshold: 100000, label: '100.000 reps' },
    ],
    measure: (ctx) => totalRepsLifted(ctx.history),
  },

  // ── Variedad: explorar el catálogo ──
  {
    id: 'variety-exercises',
    category: 'variety',
    title: 'Explorador',
    description: 'Ejercicios distintos entrenados',
    icon: 'target',
    color: colors.info.DEFAULT,
    unit: '',
    tiers: [
      { id: 'variety-5', threshold: 5, label: '5 ejercicios' },
      { id: 'variety-15', threshold: 15, label: '15 ejercicios' },
      { id: 'variety-30', threshold: 30, label: '30 ejercicios' },
      { id: 'variety-50', threshold: 50, label: '50 ejercicios' },
    ],
    measure: (ctx) => distinctExercises(ctx.history),
  },
];

const TIER_INDEX: Map<string, { def: AchievementDef; tier: AchievementTier }> = (() => {
  const m = new Map<string, { def: AchievementDef; tier: AchievementTier }>();
  for (const def of ACHIEVEMENTS) {
    for (const tier of def.tiers) m.set(tier.id, { def, tier });
  }
  return m;
})();

/** Resuelve un tierId a su definición + nivel (para mostrar desbloqueos). */
export function lookupTier(tierId: string): { def: AchievementDef; tier: AchievementTier } | null {
  return TIER_INDEX.get(tierId) ?? null;
}

// ───────────────────────── motor de evaluación ─────────────────────────

/** Evalúa un track contra el contexto y devuelve su progreso detallado. */
export function evaluateTrack(def: AchievementDef, ctx: AchievementContext): AchievementProgress {
  const value = def.measure(ctx);
  const unlockedTiers = def.tiers.filter((t) => value >= t.threshold);
  const currentTier = unlockedTiers.length ? unlockedTiers[unlockedTiers.length - 1] : null;
  const nextTier = def.tiers.find((t) => value < t.threshold) ?? null;

  let progressToNext = 1;
  if (nextTier) {
    const floor = currentTier?.threshold ?? 0;
    const span = nextTier.threshold - floor;
    progressToNext = span > 0 ? Math.max(0, Math.min(1, (value - floor) / span)) : 0;
  }

  return {
    def,
    value,
    unlockedTiers,
    currentTier,
    nextTier,
    progressToNext,
    level: unlockedTiers.length,
    maxLevel: def.tiers.length,
  };
}

/** Evalúa todo el catálogo. */
export function evaluateAchievements(ctx: AchievementContext): AchievementProgress[] {
  return ACHIEVEMENTS.map((def) => evaluateTrack(def, ctx));
}

/** Conjunto de todos los tierIds desbloqueados con el contexto dado. */
export function unlockedTierIds(ctx: AchievementContext): Set<string> {
  const ids = new Set<string>();
  for (const def of ACHIEVEMENTS) {
    const value = def.measure(ctx);
    for (const t of def.tiers) {
      if (value >= t.threshold) ids.add(t.id);
    }
  }
  return ids;
}

/** Agrupa el progreso evaluado por categoría, respetando el orden del catálogo. */
export function groupByCategory(
  progress: AchievementProgress[],
): { category: AchievementCategory; label: string; items: AchievementProgress[] }[] {
  const order: AchievementCategory[] = ['strength', 'streak', 'consistency', 'variety'];
  return order
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: progress.filter((p) => p.def.category === category),
    }))
    .filter((g) => g.items.length > 0);
}
