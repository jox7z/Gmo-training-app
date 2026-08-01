/**
 * Plantillas de rutinas famosas predefinidas.
 * Exporta `famousRoutineOptions()` para usarlas en onboarding y en el
 * selector de plantillas de la pestaña Rutinas.
 */
import { nid } from '@/store/routines';
import type { Routine, RoutineDay, RoutineDayExercise } from '@/store/routines';
import type { RoutineOption } from '@/lib/routineGenerator';

// Parámetros por defecto de hipertrofia
const DEFAULT_SETS = 3;
const DEFAULT_REPS_MIN = 8;
const DEFAULT_REPS_MAX = 12;
const DEFAULT_REST = 90;

// Parámetros para compuestos pesados (sentadilla, peso muerto, press banca, remo)
const HEAVY_SETS = 4;
const HEAVY_REPS_MIN = 6;
const HEAVY_REPS_MAX = 10;
const HEAVY_REST = 120;

const HEAVY_IDS = new Set([
  'squat',
  'deadlift',
  'romanian-deadlift',
  'bench-press',
  'barbell-row',
  'overhead-press',
]);

function makeExercise(exerciseId: string): RoutineDayExercise {
  const isHeavy = HEAVY_IDS.has(exerciseId);
  return {
    id: nid(),
    exerciseId,
    targetSets: isHeavy ? HEAVY_SETS : DEFAULT_SETS,
    targetRepsMin: isHeavy ? HEAVY_REPS_MIN : DEFAULT_REPS_MIN,
    targetRepsMax: isHeavy ? HEAVY_REPS_MAX : DEFAULT_REPS_MAX,
    restSeconds: isHeavy ? HEAVY_REST : DEFAULT_REST,
  };
}

function makeDay(name: string, exerciseIds: string[]): RoutineDay {
  return {
    id: nid(),
    name,
    exercises: exerciseIds.map(makeExercise),
  };
}

function makeRoutine(
  name: string,
  description: string,
  splitType: string,
  days: RoutineDay[],
): Routine {
  return {
    id: nid(),
    name,
    description,
    splitType,
    isAiGenerated: false,
    createdAt: new Date().toISOString(),
    days,
  };
}

// ─── Full Body 3 días ────────────────────────────────────────────────────────

function buildFullBody3(): RoutineOption {
  const dayExercises = [
    'squat',
    'bench-press',
    'barbell-row',
    'overhead-press',
    'romanian-deadlift',
    'plank',
  ];

  const days = ['Full Body A', 'Full Body B', 'Full Body C'].map((name) =>
    makeDay(name, dayExercises),
  );

  const routine = makeRoutine(
    'Full Body 3 días',
    'Tres sesiones iguales por semana que estimulan todo el cuerpo con alta frecuencia.',
    'full_body',
    days,
  );

  return {
    routine,
    label: 'Full Body 3 días',
    summary: '3 días · full body a / full body b / full body c',
  };
}

// ─── Upper / Lower 4 días ────────────────────────────────────────────────────

function buildUpperLower4(): RoutineOption {
  const upperExercises = [
    'bench-press',
    'barbell-row',
    'overhead-press',
    'lat-pulldown',
    'lateral-raise',
    'biceps-curl',
    'triceps-pushdown',
  ];

  const lowerExercises = [
    'squat',
    'romanian-deadlift',
    'leg-press',
    'leg-curl',
    'hip-thrust',
    'standing-calf',
  ];

  const days = [
    makeDay('Upper A', upperExercises),
    makeDay('Lower A', lowerExercises),
    makeDay('Upper B', upperExercises),
    makeDay('Lower B', lowerExercises),
  ];

  const routine = makeRoutine(
    'Upper / Lower 4 días',
    'Split clásico de 4 días con dos estímulos semanales por grupo muscular.',
    'upper_lower',
    days,
  );

  return {
    routine,
    label: 'Upper / Lower 4 días',
    summary: '4 días · upper a / lower a / upper b / lower b',
  };
}

// ─── Push / Pull / Legs 6 días ───────────────────────────────────────────────

function buildPPL6(): RoutineOption {
  const pushExercises = [
    'bench-press',
    'overhead-press',
    'incline-db-press',
    'lateral-raise',
    'triceps-pushdown',
    'skull-crusher',
  ];

  const pullExercises = [
    'deadlift',
    'barbell-row',
    'pull-up',
    'lat-pulldown',
    'face-pull',
    'biceps-curl',
    'hammer-curl',
  ];

  const legsExercises = [
    'squat',
    'romanian-deadlift',
    'leg-press',
    'leg-curl',
    'hip-thrust',
    'standing-calf',
  ];

  const days = [
    makeDay('Push A', pushExercises),
    makeDay('Pull A', pullExercises),
    makeDay('Legs A', legsExercises),
    makeDay('Push B', pushExercises),
    makeDay('Pull B', pullExercises),
    makeDay('Legs B', legsExercises),
  ];

  const routine = makeRoutine(
    'Push / Pull / Legs',
    'El split más popular para hipertrofia avanzada: 6 días con doble frecuencia por grupo.',
    'ppl',
    days,
  );

  return {
    routine,
    label: 'Push / Pull / Legs',
    summary: '6 días · push a / pull a / legs a / push b / pull b / legs b',
  };
}

// ─── Arnold Split 6 días ─────────────────────────────────────────────────────

function buildArnold6(): RoutineOption {
  const chestBackExercises = [
    'bench-press',
    'incline-db-press',
    'cable-fly',
    'pull-up',
    'barbell-row',
    'lat-pulldown',
  ];

  const shouldersArmsExercises = [
    'overhead-press',
    'lateral-raise',
    'rear-delt-fly',
    'biceps-curl',
    'hammer-curl',
    'triceps-pushdown',
    'skull-crusher',
  ];

  const legsExercises = [
    'squat',
    'leg-press',
    'lunges',
    'romanian-deadlift',
    'leg-curl',
    'standing-calf',
  ];

  const days = [
    makeDay('Pecho + Espalda A', chestBackExercises),
    makeDay('Hombros + Brazos A', shouldersArmsExercises),
    makeDay('Piernas A', legsExercises),
    makeDay('Pecho + Espalda B', chestBackExercises),
    makeDay('Hombros + Brazos B', shouldersArmsExercises),
    makeDay('Piernas B', legsExercises),
  ];

  const routine = makeRoutine(
    'Arnold Split',
    'El split de Arnold Schwarzenegger: pecho/espalda, hombros/brazos y piernas, 6 días.',
    'arnold',
    days,
  );

  return {
    routine,
    label: 'Arnold Split',
    summary: '6 días · pecho+espalda / hombros+brazos / piernas (×2)',
  };
}

// ─── Export principal ─────────────────────────────────────────────────────────

/** IDs de splitType que corresponden a plantillas famosas. */
export const FAMOUS_SPLIT_TYPES = new Set(['full_body', 'upper_lower', 'ppl', 'arnold']);

/**
 * Genera y devuelve las opciones de rutinas famosas.
 * Se llama con FRESH ids en cada invocación (usa nid() internamente).
 */
export function famousRoutineOptions(): RoutineOption[] {
  return [buildFullBody3(), buildUpperLower4(), buildPPL6(), buildArnold6()];
}
