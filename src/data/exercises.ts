export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'front_delt'
  | 'lateral_delt'
  | 'rear_delt'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body';

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';
  isCompound: boolean;
  instructions: string;
}

export const EXERCISES: Exercise[] = [
  { id: 'bench-press', name: 'Press de banca', muscle: 'chest', equipment: 'barbell', isCompound: true, instructions: 'Acuéstate en banca, baja la barra al pecho y empuja hasta extender los codos.' },
  { id: 'incline-db-press', name: 'Press inclinado con mancuernas', muscle: 'chest', equipment: 'dumbbell', isCompound: true, instructions: 'Banca a 30°, baja las mancuernas controladas hasta el pecho.' },
  { id: 'cable-fly', name: 'Aperturas con cable', muscle: 'chest', equipment: 'cable', isCompound: false, instructions: 'Brazos ligeramente flexionados, junta las manos al frente.' },
  { id: 'pull-up', name: 'Dominadas', muscle: 'back', equipment: 'bodyweight', isCompound: true, instructions: 'Cuelga, sube hasta superar la barra con la barbilla.' },
  { id: 'barbell-row', name: 'Remo con barra', muscle: 'back', equipment: 'barbell', isCompound: true, instructions: 'Espalda neutra, tira la barra hacia el abdomen.' },
  { id: 'lat-pulldown', name: 'Jalón al pecho', muscle: 'back', equipment: 'cable', isCompound: true, instructions: 'Tira la barra hacia el pecho, codos abajo.' },
  { id: 'face-pull', name: 'Face pull', muscle: 'back', equipment: 'cable', isCompound: false, instructions: 'Tira hacia la cara separando manos.' },
  { id: 'deadlift', name: 'Peso muerto', muscle: 'full_body', equipment: 'barbell', isCompound: true, instructions: 'Caderas atrás, espalda neutra, levanta empujando el suelo.' },
  { id: 'overhead-press', name: 'Press militar', muscle: 'front_delt', equipment: 'barbell', isCompound: true, instructions: 'Empuja la barra encima de la cabeza, glúteos contraídos.' },
  { id: 'lateral-raise', name: 'Elevaciones laterales', muscle: 'lateral_delt', equipment: 'dumbbell', isCompound: false, instructions: 'Eleva mancuernas a los lados hasta altura de hombros.' },
  { id: 'rear-delt-fly', name: 'Pájaros (rear delt)', muscle: 'rear_delt', equipment: 'dumbbell', isCompound: false, instructions: 'Inclínate, eleva mancuernas hacia los lados.' },
  { id: 'biceps-curl', name: 'Curl de bíceps', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Codos pegados al torso, sube controlado.' },
  { id: 'hammer-curl', name: 'Curl martillo', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Agarre neutro, sube hasta el hombro.' },
  { id: 'triceps-pushdown', name: 'Press tríceps polea', muscle: 'triceps', equipment: 'cable', isCompound: false, instructions: 'Codos pegados al torso, extiende los brazos.' },
  { id: 'skull-crusher', name: 'Skull crusher', muscle: 'triceps', equipment: 'barbell', isCompound: false, instructions: 'Acostado, baja la barra a la frente flexionando codos.' },
  { id: 'squat', name: 'Sentadilla', muscle: 'quads', equipment: 'barbell', isCompound: true, instructions: 'Baja caderas hasta paralelo, empuja el suelo.' },
  { id: 'leg-press', name: 'Prensa de pierna', muscle: 'quads', equipment: 'machine', isCompound: true, instructions: 'Pies a la altura del hombro, baja controlado.' },
  { id: 'lunges', name: 'Zancadas', muscle: 'quads', equipment: 'dumbbell', isCompound: true, instructions: 'Da un paso al frente y baja hasta 90°.' },
  { id: 'romanian-deadlift', name: 'Peso muerto rumano', muscle: 'hamstrings', equipment: 'barbell', isCompound: true, instructions: 'Caderas atrás, baja con piernas casi rectas.' },
  { id: 'leg-curl', name: 'Curl femoral', muscle: 'hamstrings', equipment: 'machine', isCompound: false, instructions: 'Flexiona las rodillas contra la resistencia.' },
  { id: 'hip-thrust', name: 'Hip thrust', muscle: 'glutes', equipment: 'barbell', isCompound: true, instructions: 'Hombros sobre banco, eleva caderas contrayendo glúteo.' },
  { id: 'standing-calf', name: 'Elevación de gemelos', muscle: 'calves', equipment: 'machine', isCompound: false, instructions: 'Eleva los talones al máximo, contracción de 1s.' },
  { id: 'plank', name: 'Plancha', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Mantén el cuerpo recto, abdomen contraído.' },
  { id: 'hanging-leg-raise', name: 'Elevación de piernas colgado', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Cuelga y eleva las piernas controladas.' },
];

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id);
export const exercisesByMuscle = (m: MuscleGroup) => EXERCISES.filter((e) => e.muscle === m);
