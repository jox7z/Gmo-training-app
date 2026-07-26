import { Goal, Level } from '@/store/app';
import { Routine, RoutineDay, nid } from '@/store/routines';

export interface RoutineOption {
  routine: Routine;
  label: string;
  summary: string;
}

interface Input {
  level: Level;
  goal: Goal;
  daysPerWeek: number;
  weightKg: number;
  heightCm: number;
}

interface Output {
  routine: Routine;
  reasoning: string;
}

/**
 * Generador heurístico (offline). En producción, este resultado se enriquecería
 * con una llamada a la edge function `generate_routine` que añade variedad
 * y un texto de justificación generado por IA.
 */
export function generateRoutine(input: Input): Output {
  const { level, goal, daysPerWeek } = input;
  const split = pickSplit(daysPerWeek);
  const days = buildDays(split, goal, level);
  const reasoning = buildReasoning(input, split);

  const routine: Routine = {
    id: nid(),
    name: `Generada · ${split.label}`,
    description: `Rutina generada para ${labelGoal(goal)} (${level}).`,
    splitType: split.id,
    isAiGenerated: true,
    aiReasoning: reasoning,
    createdAt: new Date().toISOString(),
    days,
  };

  return { routine, reasoning };
}

function pickSplit(days: number) {
  if (days <= 3) return { id: 'full_body', label: 'Full Body', dayNames: Array(days).fill(null).map((_, i) => `Full Body ${i + 1}`) };
  if (days === 4) return { id: 'upper_lower', label: 'Upper / Lower', dayNames: ['Upper A', 'Lower A', 'Upper B', 'Lower B'] };
  if (days === 5) return { id: 'ppl_upper_lower', label: 'PPL + Upper/Lower', dayNames: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'] };
  return { id: 'ppl', label: 'Push / Pull / Legs', dayNames: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'] };
}

function repsForGoal(goal: Goal): { min: number; max: number; sets: number } {
  switch (goal) {
    case 'strength':
      return { min: 4, max: 6, sets: 5 };
    case 'fat_loss':
      return { min: 12, max: 15, sets: 3 };
    case 'general':
      return { min: 8, max: 12, sets: 3 };
    default:
      return { min: 6, max: 10, sets: 4 };
  }
}

function buildDays(
  split: ReturnType<typeof pickSplit>,
  goal: Goal,
  level: Level,
): RoutineDay[] {
  const reps = repsForGoal(goal);
  const setsAdjust = level === 'beginner' ? -1 : level === 'advanced' ? 1 : 0;

  const templates: Record<string, string[][]> = {
    push: [['bench-press'], ['overhead-press'], ['incline-db-press'], ['lateral-raise'], ['triceps-pushdown']],
    pull: [['deadlift', 'barbell-row'], ['pull-up', 'lat-pulldown'], ['face-pull'], ['biceps-curl', 'hammer-curl']],
    legs: [['squat'], ['romanian-deadlift'], ['leg-press'], ['leg-curl'], ['standing-calf']],
    upper: [['bench-press'], ['barbell-row'], ['overhead-press'], ['pull-up'], ['lateral-raise'], ['biceps-curl']],
    lower: [['squat'], ['romanian-deadlift'], ['lunges'], ['leg-curl'], ['standing-calf']],
    full: [['squat'], ['bench-press'], ['barbell-row'], ['overhead-press'], ['romanian-deadlift'], ['plank']],
  };

  function dayFromTemplate(name: string, key: keyof typeof templates): RoutineDay {
    return {
      id: nid(),
      name,
      exercises: templates[key].map((variants) => ({
        id: nid(),
        exerciseId: variants[0],
        targetSets: Math.max(2, reps.sets + setsAdjust),
        targetRepsMin: reps.min,
        targetRepsMax: reps.max,
        restSeconds: goal === 'strength' ? 180 : goal === 'fat_loss' ? 45 : 90,
      })),
    };
  }

  return split.dayNames.map((name) => {
    const k = name.toLowerCase();
    if (k.includes('push')) return dayFromTemplate(name, 'push');
    if (k.includes('pull')) return dayFromTemplate(name, 'pull');
    if (k.includes('leg') || k.includes('lower')) return dayFromTemplate(name, k.includes('lower') ? 'lower' : 'legs');
    if (k.includes('upper')) return dayFromTemplate(name, 'upper');
    return dayFromTemplate(name, 'full');
  });
}

function labelGoal(goal: Goal): string {
  return {
    strength: 'fuerza',
    hypertrophy: 'hipertrofia',
    fat_loss: 'pérdida de grasa',
    general: 'salud general',
  }[goal];
}

/**
 * Returns 2-3 candidate routine options for the given day count, goal and level.
 * Each option has a complete Routine with uuid ids ready to upsert.
 */
export function routineOptions(input: { days: number; goal: Goal; level: Level }): RoutineOption[] {
  const { days, goal, level } = input;

  type SplitDef = { id: string; label: string; dayNames: string[] };

  function makeOption(split: SplitDef): RoutineOption {
    const routeDays = buildDays(split, goal, level);
    const routine: Routine = {
      id: nid(),
      name: `${split.label}`,
      description: `Rutina para ${labelGoal(goal)} (${level}).`,
      splitType: split.id,
      isAiGenerated: true,
      aiReasoning: buildReasoning({ level, goal, daysPerWeek: days, weightKg: 75, heightCm: 175 }, split),
      createdAt: new Date().toISOString(),
      days: routeDays,
    };
    return {
      routine,
      label: split.label,
      summary: `${days} días · ${split.dayNames.map((n) => n.toLowerCase()).join(' / ')}`,
    };
  }

  if (days <= 2) {
    return [
      makeOption({ id: 'full_body', label: 'Full Body', dayNames: Array(days).fill(null).map((_, i) => `Full Body ${i + 1}`) }),
    ];
  }

  if (days === 3) {
    return [
      makeOption({ id: 'full_body', label: 'Full Body', dayNames: ['Full Body 1', 'Full Body 2', 'Full Body 3'] }),
      makeOption({ id: 'upper_lower_fb', label: 'Upper / Lower / Full', dayNames: ['Upper', 'Lower', 'Full Body'] }),
    ];
  }

  if (days === 4) {
    return [
      makeOption({ id: 'upper_lower', label: 'Upper / Lower', dayNames: ['Upper A', 'Lower A', 'Upper B', 'Lower B'] }),
      makeOption({ id: 'full_body_4', label: 'Full Body ×4', dayNames: ['Full Body 1', 'Full Body 2', 'Full Body 3', 'Full Body 4'] }),
    ];
  }

  if (days === 5) {
    return [
      makeOption({ id: 'ppl_upper_lower', label: 'PPL + Upper/Lower', dayNames: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'] }),
      makeOption({ id: 'upper_lower_5', label: 'Upper/Lower ×5', dayNames: ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C'] }),
      makeOption({ id: 'full_body_5', label: 'Full Body ×5', dayNames: ['Full Body 1', 'Full Body 2', 'Full Body 3', 'Full Body 4', 'Full Body 5'] }),
    ];
  }

  // 6+ days
  return [
    makeOption({ id: 'ppl', label: 'Push / Pull / Legs', dayNames: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'] }),
    makeOption({ id: 'upper_lower_6', label: 'Upper/Lower ×3', dayNames: ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C', 'Lower C'] }),
  ];
}

function buildReasoning(input: Input, split: ReturnType<typeof pickSplit>): string {
  const { goal, level, daysPerWeek } = input;
  const why = goal === 'strength'
    ? 'priorizamos pesos altos y descansos largos (3-5 min) con rangos de 4-6 reps.'
    : goal === 'fat_loss'
    ? 'usamos rangos altos de reps (12-15) con descansos cortos para mantener intensidad metabólica.'
    : goal === 'general'
    ? 'mantenemos rangos moderados (8-12) y volumen sostenible.'
    : 'el rango óptimo para hipertrofia es 6-10 reps con volumen moderado-alto.';

  const splitWhy = daysPerWeek <= 3
    ? `Con ${daysPerWeek} días, Full Body maximiza la frecuencia por músculo (2-3x/semana).`
    : daysPerWeek === 4
    ? 'Upper/Lower te da 2 estímulos semanales por grupo muscular sin sobrecargar.'
    : daysPerWeek <= 5
    ? 'Una mezcla de PPL y Upper/Lower equilibra frecuencia y especialización.'
    : 'PPL 6 días maximiza volumen por grupo muscular sin solapar fatiga (clásico para avanzados).';

  return `Te recomiendo el split ${split.label} porque ${splitWhy} Para tu objetivo de ${labelGoal(goal)}, ${why} Como nivel ${level}, ajustamos el volumen para que sea progresivo y sostenible.`;
}
