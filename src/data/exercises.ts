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

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'smith';

export interface Exercise {
  id: string;
  name: string;
  /** Músculo primario (motor principal). Cuenta 1 serie completa. */
  muscle: MuscleGroup;
  /**
   * Músculos sinergistas trabajados de forma significativa pero secundaria.
   * Método fraccional: cada uno acumula 0.5 series por serie del ejercicio.
   * Se omite en ejercicios de aislamiento (sin sinergistas relevantes).
   */
  secondary?: MuscleGroup[];
  /**
   * Ajustes fraccionales puntuales por músculo y serie.
   * Las claves presentes reemplazan la contribución derivada (1 primaria,
   * 0.5 secundaria); un valor 0 elimina esa contribución.
   */
  volumeContributions?: Partial<Record<MuscleGroup, number>>;
  equipment: Equipment;
  isCompound: boolean;
  instructions: string;
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pecho',
  back: 'Espalda',
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

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell',
  smith: 'Smith',
};

export const EXERCISES: Exercise[] = [
  // ───────────────────────────── PECHO ─────────────────────────────
  { id: 'bench-press', name: 'Press de banca', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'barbell', isCompound: true, instructions: 'Acuéstate en banca, baja la barra al pecho y empuja hasta extender los codos.' },
  { id: 'incline-bench-press', name: 'Press inclinado con barra', muscle: 'chest', secondary: ['front_delt', 'triceps'], equipment: 'barbell', isCompound: true, instructions: 'Banca a 30–45°, baja la barra a la parte alta del pecho y empuja.' },
  { id: 'decline-bench-press', name: 'Press declinado con barra', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'barbell', isCompound: true, instructions: 'Banca declinada, baja la barra a la parte baja del pecho y empuja.' },
  { id: 'incline-db-press', name: 'Press inclinado con mancuernas', muscle: 'chest', secondary: ['front_delt', 'triceps'], equipment: 'dumbbell', isCompound: true, instructions: 'Banca a 30°, baja las mancuernas controladas hasta el pecho.' },
  { id: 'flat-db-press', name: 'Press plano con mancuernas', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Acostado en banca plana, baja las mancuernas al pecho y empuja arriba.' },
  { id: 'decline-db-press', name: 'Press declinado con mancuernas', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Banca declinada, empuja las mancuernas desde la parte baja del pecho.' },
  { id: 'smith-bench-press', name: 'Press de banca en Smith', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'smith', isCompound: true, instructions: 'En máquina Smith, baja la barra al pecho con trayectoria guiada y empuja.' },
  { id: 'chest-press-machine', name: 'Press de pecho en máquina', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'machine', isCompound: true, instructions: 'Espalda apoyada, empuja las agarraderas al frente sin bloquear codos.' },
  { id: 'db-fly', name: 'Aperturas con mancuernas', muscle: 'chest', equipment: 'dumbbell', isCompound: false, instructions: 'Acostado, abre los brazos semiflexionados y junta las mancuernas arriba.' },
  { id: 'incline-db-fly', name: 'Aperturas inclinadas con mancuernas', muscle: 'chest', equipment: 'dumbbell', isCompound: false, instructions: 'Banca a 30°, abre los brazos y junta las mancuernas sobre el pecho alto.' },
  { id: 'cable-fly', name: 'Aperturas con cable', muscle: 'chest', equipment: 'cable', isCompound: false, instructions: 'Brazos ligeramente flexionados, junta las manos al frente.' },
  { id: 'cable-crossover', name: 'Cruce de poleas', muscle: 'chest', equipment: 'cable', isCompound: false, instructions: 'Poleas altas, lleva las manos abajo y al frente cruzando ligeramente.' },
  { id: 'low-cable-fly', name: 'Aperturas en polea baja', muscle: 'chest', equipment: 'cable', isCompound: false, instructions: 'Poleas bajas, eleva las manos al frente hasta la altura del pecho.' },
  { id: 'pec-deck', name: 'Contractora (pec deck)', muscle: 'chest', equipment: 'machine', isCompound: false, instructions: 'Junta los brazos al frente apretando el pecho, vuelve controlado.' },
  { id: 'push-up', name: 'Flexiones', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Cuerpo recto, baja el pecho al suelo y empuja hasta extender los brazos.' },
  { id: 'chest-dips', name: 'Fondos en paralelas (pecho)', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Inclina el torso adelante, baja controlado y empuja hasta arriba.' },

  // ───────────────────────────── ESPALDA ─────────────────────────────
  { id: 'pull-up', name: 'Dominadas', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Cuelga, sube hasta superar la barra con la barbilla.' },
  { id: 'chin-up', name: 'Dominadas supinas', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Agarre supino al ancho de hombros, sube el pecho hacia la barra.' },
  { id: 'assisted-pull-up', name: 'Dominadas asistidas', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'machine', isCompound: true, instructions: 'Apoya las rodillas en la plataforma y sube como en una dominada.' },
  { id: 'inverted-row', name: 'Remo invertido', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Bajo una barra fija, cuerpo recto, tira del pecho hacia la barra.' },
  { id: 'barbell-row', name: 'Remo con barra', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'barbell', isCompound: true, instructions: 'Espalda neutra, tira la barra hacia el abdomen.' },
  { id: 'pendlay-row', name: 'Remo Pendlay', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'barbell', isCompound: true, instructions: 'Torso paralelo al suelo, tira la barra desde el suelo al pecho en cada rep.' },
  { id: 't-bar-row', name: 'Remo en T', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'barbell', isCompound: true, instructions: 'Inclinado sobre la barra T, tira del agarre hacia el pecho.' },
  { id: 'single-arm-db-row', name: 'Remo con mancuerna a una mano', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Apoya rodilla y mano en banca, tira la mancuerna hacia la cadera.' },
  { id: 'chest-supported-row', name: 'Remo con apoyo en banca', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Pecho apoyado en banca inclinada, rema con ambas mancuernas.' },
  { id: 'seated-cable-row', name: 'Remo sentado en polea', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'cable', isCompound: true, instructions: 'Sentado, tira del agarre al abdomen con la espalda neutra.' },
  { id: 'machine-row', name: 'Remo en máquina', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'machine', isCompound: true, instructions: 'Pecho apoyado, tira de las agarraderas hacia atrás juntando escápulas.' },
  { id: 'lat-pulldown', name: 'Jalón al pecho', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'cable', isCompound: true, instructions: 'Tira la barra hacia el pecho, codos abajo.' },
  { id: 'close-grip-lat-pulldown', name: 'Jalón agarre cerrado', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'cable', isCompound: true, instructions: 'Agarre neutro cerrado, tira hacia el pecho llevando los codos al torso.' },
  { id: 'straight-arm-pulldown', name: 'Pullover en polea', muscle: 'back', secondary: ['triceps'], equipment: 'cable', isCompound: false, instructions: 'Brazos rectos, lleva la barra de arriba hacia los muslos.' },
  { id: 'db-pullover', name: 'Pullover con mancuerna', muscle: 'back', secondary: ['chest', 'triceps'], equipment: 'dumbbell', isCompound: false, instructions: 'Acostado, baja la mancuerna detrás de la cabeza y vuelve sobre el pecho.' },
  { id: 'face-pull', name: 'Face pull', muscle: 'back', secondary: ['rear_delt'], equipment: 'cable', isCompound: false, instructions: 'Tira hacia la cara separando manos.' },
  { id: 'back-extension', name: 'Hiperextensiones', muscle: 'back', secondary: ['glutes', 'hamstrings'], equipment: 'bodyweight', isCompound: false, instructions: 'En banco romano, baja el torso y sube hasta alinear con las piernas.' },
  { id: 'rack-pull', name: 'Rack pull', muscle: 'back', secondary: ['hamstrings', 'glutes'], equipment: 'barbell', isCompound: true, instructions: 'Peso muerto parcial desde soportes a la altura de las rodillas.' },
  { id: 'barbell-shrug', name: 'Encogimientos con barra', muscle: 'back', equipment: 'barbell', isCompound: false, instructions: 'Eleva los hombros hacia las orejas, pausa arriba y baja controlado.' },
  { id: 'db-shrug', name: 'Encogimientos con mancuernas', muscle: 'back', equipment: 'dumbbell', isCompound: false, instructions: 'Mancuernas a los lados, encoge los hombros sin flexionar los codos.' },

  // ───────────────────────── HOMBRO FRONTAL ─────────────────────────
  { id: 'overhead-press', name: 'Press militar', muscle: 'front_delt', secondary: ['triceps', 'lateral_delt'], equipment: 'barbell', isCompound: true, instructions: 'Empuja la barra encima de la cabeza, glúteos contraídos.' },
  { id: 'seated-db-shoulder-press', name: 'Press de hombros con mancuernas', muscle: 'front_delt', secondary: ['triceps', 'lateral_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Sentado, empuja las mancuernas desde los hombros hasta arriba.' },
  { id: 'arnold-press', name: 'Press Arnold', muscle: 'front_delt', secondary: ['triceps', 'lateral_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Inicia con palmas hacia ti, rota mientras empujas arriba.' },
  { id: 'machine-shoulder-press', name: 'Press de hombros en máquina', muscle: 'front_delt', secondary: ['triceps', 'lateral_delt'], equipment: 'machine', isCompound: true, instructions: 'Espalda apoyada, empuja las agarraderas sobre la cabeza.' },
  { id: 'smith-shoulder-press', name: 'Press militar en Smith', muscle: 'front_delt', secondary: ['triceps', 'lateral_delt'], equipment: 'smith', isCompound: true, instructions: 'Sentado bajo la barra guiada, empuja sobre la cabeza.' },
  { id: 'push-press', name: 'Push press', muscle: 'front_delt', secondary: ['triceps', 'lateral_delt'], equipment: 'barbell', isCompound: true, instructions: 'Pequeño impulso de piernas y empuja la barra sobre la cabeza.' },
  { id: 'landmine-press', name: 'Press landmine', muscle: 'front_delt', secondary: ['triceps', 'chest'], equipment: 'barbell', isCompound: true, instructions: 'Barra anclada al suelo, empuja el extremo arriba y al frente.' },
  { id: 'front-raise', name: 'Elevaciones frontales', muscle: 'front_delt', equipment: 'dumbbell', isCompound: false, instructions: 'Eleva las mancuernas al frente hasta la altura de los hombros.' },

  // ───────────────────────── HOMBRO LATERAL ─────────────────────────
  { id: 'lateral-raise', name: 'Elevaciones laterales', muscle: 'lateral_delt', equipment: 'dumbbell', isCompound: false, instructions: 'Eleva mancuernas a los lados hasta altura de hombros.' },
  { id: 'cable-lateral-raise', name: 'Elevaciones laterales en polea', muscle: 'lateral_delt', equipment: 'cable', isCompound: false, instructions: 'Polea baja, eleva el brazo al lado con tensión constante.' },
  { id: 'machine-lateral-raise', name: 'Elevaciones laterales en máquina', muscle: 'lateral_delt', equipment: 'machine', isCompound: false, instructions: 'Codos contra las almohadillas, eleva hasta la altura de hombros.' },
  { id: 'upright-row', name: 'Remo al mentón', muscle: 'lateral_delt', secondary: ['front_delt', 'back'], equipment: 'barbell', isCompound: true, instructions: 'Tira la barra hacia la barbilla con los codos por encima de las manos.' },

  // ──────────────────────── HOMBRO POSTERIOR ────────────────────────
  { id: 'rear-delt-fly', name: 'Pájaros (rear delt)', muscle: 'rear_delt', equipment: 'dumbbell', isCompound: false, instructions: 'Inclínate, eleva mancuernas hacia los lados.' },
  { id: 'reverse-pec-deck', name: 'Contractora inversa', muscle: 'rear_delt', secondary: ['back'], equipment: 'machine', isCompound: false, instructions: 'De frente a la máquina, abre los brazos hacia atrás.' },
  { id: 'cable-rear-delt-fly', name: 'Cruce posterior en polea', muscle: 'rear_delt', equipment: 'cable', isCompound: false, instructions: 'Poleas cruzadas a la altura de la cara, abre los brazos hacia atrás.' },

  // ───────────────────────────── BÍCEPS ─────────────────────────────
  { id: 'biceps-curl', name: 'Curl de bíceps', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Codos pegados al torso, sube controlado.' },
  { id: 'barbell-curl', name: 'Curl con barra', muscle: 'biceps', equipment: 'barbell', isCompound: false, instructions: 'Agarre supino al ancho de hombros, sube la barra sin balancear.' },
  { id: 'ez-bar-curl', name: 'Curl con barra EZ', muscle: 'biceps', equipment: 'barbell', isCompound: false, instructions: 'Agarre en la curva de la barra EZ, sube con los codos fijos.' },
  { id: 'hammer-curl', name: 'Curl martillo', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Agarre neutro, sube hasta el hombro.' },
  { id: 'incline-db-curl', name: 'Curl inclinado con mancuernas', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'En banca inclinada, brazos colgando, sube con máximo estiramiento.' },
  { id: 'preacher-curl', name: 'Curl predicador', muscle: 'biceps', equipment: 'barbell', isCompound: false, instructions: 'Brazos apoyados en el banco predicador, sube y baja controlado.' },
  { id: 'concentration-curl', name: 'Curl concentrado', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Sentado, codo apoyado en el muslo, sube la mancuerna al hombro.' },
  { id: 'cable-curl', name: 'Curl en polea', muscle: 'biceps', equipment: 'cable', isCompound: false, instructions: 'Polea baja, sube el agarre con tensión constante.' },
  { id: 'machine-biceps-curl', name: 'Curl en máquina', muscle: 'biceps', equipment: 'machine', isCompound: false, instructions: 'Brazos apoyados, flexiona los codos contra la resistencia.' },
  { id: 'spider-curl', name: 'Curl araña', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Pecho apoyado en banca inclinada, brazos verticales, sube las mancuernas.' },
  { id: 'reverse-curl', name: 'Curl inverso', muscle: 'biceps', equipment: 'barbell', isCompound: false, instructions: 'Agarre prono, sube la barra manteniendo las muñecas firmes.' },

  // ───────────────────────────── TRÍCEPS ─────────────────────────────
  { id: 'triceps-pushdown', name: 'Press tríceps polea', muscle: 'triceps', equipment: 'cable', isCompound: false, instructions: 'Codos pegados al torso, extiende los brazos.' },
  { id: 'rope-pushdown', name: 'Extensión con cuerda en polea', muscle: 'triceps', equipment: 'cable', isCompound: false, instructions: 'Extiende los brazos separando la cuerda al final del movimiento.' },
  { id: 'skull-crusher', name: 'Skull crusher', muscle: 'triceps', equipment: 'barbell', isCompound: false, instructions: 'Acostado, baja la barra a la frente flexionando codos.' },
  { id: 'close-grip-bench-press', name: 'Press banca agarre cerrado', muscle: 'triceps', secondary: ['chest', 'front_delt'], equipment: 'barbell', isCompound: true, instructions: 'Manos al ancho de hombros, baja la barra al pecho con codos cerrados.' },
  { id: 'overhead-cable-extension', name: 'Extensión de tríceps en polea sobre cabeza', muscle: 'triceps', equipment: 'cable', isCompound: false, instructions: 'De espaldas a la polea, extiende los brazos sobre la cabeza.' },
  { id: 'overhead-db-extension', name: 'Extensión con mancuerna sobre cabeza', muscle: 'triceps', equipment: 'dumbbell', isCompound: false, instructions: 'Sujeta una mancuerna con ambas manos detrás de la cabeza y extiende.' },
  { id: 'triceps-kickback', name: 'Patada de tríceps', muscle: 'triceps', equipment: 'dumbbell', isCompound: false, instructions: 'Torso inclinado, codo fijo, extiende el brazo hacia atrás.' },
  { id: 'machine-triceps-extension', name: 'Extensión de tríceps en máquina', muscle: 'triceps', equipment: 'machine', isCompound: false, instructions: 'Codos apoyados, extiende los brazos contra la resistencia.' },
  { id: 'bench-dips', name: 'Fondos en banco', muscle: 'triceps', secondary: ['chest', 'front_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Manos en el banco detrás de ti, baja flexionando codos y empuja.' },
  { id: 'diamond-push-up', name: 'Flexiones diamante', muscle: 'triceps', secondary: ['chest', 'front_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Manos juntas formando un diamante, baja el pecho y empuja.' },

  // ──────────────────────────── CUÁDRICEPS ────────────────────────────
  { id: 'squat', name: 'Sentadilla', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'barbell', isCompound: true, instructions: 'Baja caderas hasta paralelo, empuja el suelo.' },
  { id: 'front-squat', name: 'Sentadilla frontal', muscle: 'quads', secondary: ['glutes', 'core'], equipment: 'barbell', isCompound: true, instructions: 'Barra sobre los hombros al frente, baja manteniendo el torso erguido.' },
  { id: 'smith-squat', name: 'Sentadilla en Smith', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'smith', isCompound: true, instructions: 'Barra guiada sobre la espalda, baja controlado hasta paralelo.' },
  { id: 'hack-squat', name: 'Sentadilla hack', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'machine', isCompound: true, instructions: 'Espalda apoyada en el respaldo, baja profundo y empuja con los talones.' },
  { id: 'goblet-squat', name: 'Sentadilla goblet', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', isCompound: true, instructions: 'Mancuerna al pecho, baja entre las rodillas con el torso erguido.' },
  { id: 'leg-press', name: 'Prensa de pierna', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'machine', isCompound: true, instructions: 'Pies a la altura del hombro, baja controlado.' },
  { id: 'leg-extension', name: 'Extensión de cuádriceps', muscle: 'quads', equipment: 'machine', isCompound: false, instructions: 'Extiende las rodillas contra la resistencia, pausa arriba.' },
  { id: 'lunges', name: 'Zancadas', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', isCompound: true, instructions: 'Da un paso al frente y baja hasta 90°.' },
  { id: 'walking-lunges', name: 'Zancadas caminando', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', isCompound: true, instructions: 'Avanza alternando zancadas, rodilla trasera cerca del suelo.' },
  { id: 'bulgarian-split-squat', name: 'Sentadilla búlgara', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', isCompound: true, instructions: 'Pie trasero elevado en banca, baja vertical con la pierna delantera.' },
  { id: 'step-up', name: 'Subida al cajón', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', isCompound: true, instructions: 'Sube al cajón empujando con la pierna de arriba, baja controlado.' },
  { id: 'sissy-squat', name: 'Sentadilla sissy', muscle: 'quads', equipment: 'bodyweight', isCompound: false, instructions: 'Inclínate hacia atrás flexionando rodillas, talones elevados.' },

  // ─────────────────────────── ISQUIOTIBIALES ───────────────────────────
  { id: 'romanian-deadlift', name: 'Peso muerto rumano', muscle: 'hamstrings', secondary: ['glutes', 'back'], equipment: 'barbell', isCompound: true, instructions: 'Caderas atrás, baja con piernas casi rectas.' },
  { id: 'db-romanian-deadlift', name: 'Peso muerto rumano con mancuernas', muscle: 'hamstrings', secondary: ['glutes', 'back'], equipment: 'dumbbell', isCompound: true, instructions: 'Mancuernas al frente, caderas atrás, baja por delante de las piernas.' },
  { id: 'stiff-leg-deadlift', name: 'Peso muerto piernas rígidas', muscle: 'hamstrings', secondary: ['glutes', 'back'], equipment: 'barbell', isCompound: true, instructions: 'Piernas extendidas, baja la barra estirando los isquios al máximo.' },
  { id: 'leg-curl', name: 'Curl femoral', muscle: 'hamstrings', equipment: 'machine', isCompound: false, instructions: 'Flexiona las rodillas contra la resistencia.' },
  { id: 'seated-leg-curl', name: 'Curl femoral sentado', muscle: 'hamstrings', equipment: 'machine', isCompound: false, instructions: 'Sentado, flexiona las rodillas llevando los talones abajo y atrás.' },
  { id: 'good-morning', name: 'Buenos días', muscle: 'hamstrings', secondary: ['glutes', 'back'], equipment: 'barbell', isCompound: true, instructions: 'Barra en la espalda, inclina el torso con caderas atrás y sube.' },
  { id: 'nordic-curl', name: 'Curl nórdico', muscle: 'hamstrings', equipment: 'bodyweight', isCompound: false, instructions: 'Tobillos sujetos, baja el torso lo más lento posible.' },
  { id: 'glute-ham-raise', name: 'Glute ham raise', muscle: 'hamstrings', secondary: ['glutes'], equipment: 'machine', isCompound: false, instructions: 'En banco GHD, baja el torso y sube flexionando las rodillas.' },

  // ───────────────────────────── GLÚTEOS ─────────────────────────────
  { id: 'hip-thrust', name: 'Hip thrust', muscle: 'glutes', secondary: ['hamstrings'], equipment: 'barbell', isCompound: true, instructions: 'Hombros sobre banco, eleva caderas contrayendo glúteo.' },
  { id: 'machine-hip-thrust', name: 'Hip thrust en máquina', muscle: 'glutes', secondary: ['hamstrings'], equipment: 'machine', isCompound: true, instructions: 'Espalda apoyada, empuja la plataforma con las caderas hacia arriba.' },
  { id: 'glute-bridge', name: 'Puente de glúteos', muscle: 'glutes', secondary: ['hamstrings'], equipment: 'bodyweight', isCompound: false, instructions: 'Acostado, eleva las caderas apretando glúteos, pausa arriba.' },
  { id: 'sumo-deadlift', name: 'Peso muerto sumo', muscle: 'glutes', secondary: ['quads', 'hamstrings', 'back'], equipment: 'barbell', isCompound: true, instructions: 'Postura ancha, agarre por dentro de las rodillas, levanta con caderas.' },
  { id: 'cable-kickback', name: 'Patada de glúteo en polea', muscle: 'glutes', secondary: ['hamstrings'], equipment: 'cable', isCompound: false, instructions: 'Tobillera en polea baja, extiende la pierna hacia atrás.' },
  { id: 'cable-pull-through', name: 'Pull through en polea', muscle: 'glutes', secondary: ['hamstrings', 'back'], equipment: 'cable', isCompound: false, instructions: 'De espaldas a la polea baja, bisagra de cadera y extiende apretando glúteo.' },
  { id: 'hip-abduction-machine', name: 'Abducción de cadera en máquina', muscle: 'glutes', equipment: 'machine', isCompound: false, instructions: 'Sentado, abre las piernas contra la resistencia y vuelve controlado.' },

  // ───────────────────────────── GEMELOS ─────────────────────────────
  { id: 'standing-calf', name: 'Elevación de gemelos', muscle: 'calves', equipment: 'machine', isCompound: false, instructions: 'Eleva los talones al máximo, contracción de 1s.' },
  { id: 'seated-calf-raise', name: 'Elevación de gemelos sentado', muscle: 'calves', equipment: 'machine', isCompound: false, instructions: 'Sentado con peso en las rodillas, eleva los talones y baja profundo.' },
  { id: 'calf-press', name: 'Gemelos en prensa', muscle: 'calves', equipment: 'machine', isCompound: false, instructions: 'En la prensa, empuja con la punta de los pies extendiendo tobillos.' },
  { id: 'smith-calf-raise', name: 'Gemelos en Smith', muscle: 'calves', equipment: 'smith', isCompound: false, instructions: 'Barra guiada en la espalda, puntas en un escalón, eleva talones.' },
  { id: 'single-leg-calf-raise', name: 'Gemelos a una pierna', muscle: 'calves', equipment: 'bodyweight', isCompound: false, instructions: 'A una pierna en un escalón, sube al máximo y baja profundo.' },

  // ─────────────────────────────── CORE ───────────────────────────────
  { id: 'plank', name: 'Plancha', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Mantén el cuerpo recto, abdomen contraído.' },
  { id: 'side-plank', name: 'Plancha lateral', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'De lado sobre el antebrazo, cadera elevada y cuerpo en línea.' },
  { id: 'hanging-leg-raise', name: 'Elevación de piernas colgado', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Cuelga y eleva las piernas controladas.' },
  { id: 'lying-leg-raise', name: 'Elevación de piernas en suelo', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Acostado, eleva las piernas rectas y baja sin tocar el suelo.' },
  { id: 'crunch', name: 'Crunch abdominal', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Acostado, eleva los hombros contrayendo el abdomen.' },
  { id: 'bicycle-crunch', name: 'Crunch bicicleta', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Alterna codo con rodilla contraria pedaleando en el aire.' },
  { id: 'decline-sit-up', name: 'Sit-up declinado', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'En banca declinada, sube el torso completo y baja controlado.' },
  { id: 'cable-crunch', name: 'Crunch en polea', muscle: 'core', equipment: 'cable', isCompound: false, instructions: 'De rodillas frente a la polea alta, flexiona el torso hacia abajo.' },
  { id: 'machine-crunch', name: 'Crunch en máquina', muscle: 'core', equipment: 'machine', isCompound: false, instructions: 'Flexiona el torso contra la resistencia, exhala al contraer.' },
  { id: 'russian-twist', name: 'Giros rusos', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Sentado con el torso atrás, gira de lado a lado con control.' },
  { id: 'mountain-climbers', name: 'Escaladores', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'En plancha alta, lleva las rodillas al pecho alternando rápido.' },
  { id: 'dead-bug', name: 'Dead bug', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Boca arriba, extiende brazo y pierna contrarios sin arquear la espalda.' },
  { id: 'ab-wheel', name: 'Rueda abdominal', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'De rodillas, rueda al frente manteniendo el abdomen firme y vuelve.' },
  { id: 'pallof-press', name: 'Press Pallof', muscle: 'core', equipment: 'cable', isCompound: false, instructions: 'De lado a la polea, extiende los brazos al frente resistiendo el giro.' },

  // ─────────────────────────── CUERPO COMPLETO ───────────────────────────
  { id: 'deadlift', name: 'Peso muerto', muscle: 'full_body', secondary: ['back', 'glutes', 'hamstrings', 'quads', 'core'], equipment: 'barbell', isCompound: true, instructions: 'Caderas atrás, espalda neutra, levanta empujando el suelo.' },
  { id: 'trap-bar-deadlift', name: 'Peso muerto con barra hexagonal', muscle: 'full_body', secondary: ['back', 'glutes', 'hamstrings', 'quads', 'core'], equipment: 'barbell', isCompound: true, instructions: 'Dentro de la barra hexagonal, levanta con espalda neutra.' },
  { id: 'clean-and-press', name: 'Cargada y press', muscle: 'full_body', secondary: ['back', 'glutes', 'hamstrings', 'front_delt', 'quads'], equipment: 'barbell', isCompound: true, instructions: 'Lleva la barra del suelo a los hombros y empuja sobre la cabeza.' },
  { id: 'thruster', name: 'Thruster', muscle: 'full_body', secondary: ['quads', 'glutes', 'front_delt', 'triceps'], equipment: 'barbell', isCompound: true, instructions: 'Sentadilla frontal y al subir empuja la barra sobre la cabeza.' },
  { id: 'kettlebell-swing', name: 'Swing con kettlebell', muscle: 'full_body', secondary: ['glutes', 'hamstrings', 'back', 'core'], equipment: 'kettlebell', isCompound: true, instructions: 'Bisagra de cadera, impulsa la kettlebell hasta la altura del pecho.' },
  { id: 'turkish-getup', name: 'Levantamiento turco', muscle: 'full_body', secondary: ['core', 'front_delt', 'glutes'], equipment: 'kettlebell', isCompound: true, instructions: 'Del suelo a de pie con la kettlebell siempre sobre la cabeza.' },
  { id: 'farmers-walk', name: 'Paseo del granjero', muscle: 'full_body', secondary: ['back', 'core'], equipment: 'dumbbell', isCompound: true, instructions: 'Camina erguido cargando peso pesado en ambas manos.' },
  { id: 'burpee', name: 'Burpees', muscle: 'full_body', secondary: ['chest', 'quads', 'core'], equipment: 'bodyweight', isCompound: true, instructions: 'Flexión, salto de pies al pecho y salto vertical, encadenado.' },

  // ───────────────── COMUNES (gym comercial) ─────────────────
  { id: 'incline-chest-press-machine', name: 'Press inclinado en máquina', muscle: 'chest', secondary: ['front_delt', 'triceps'], equipment: 'machine', isCompound: true, instructions: 'Sentado en la máquina inclinada, empuja las agarraderas hacia arriba y al frente sin bloquear los codos.' },
  { id: 'decline-chest-press-machine', name: 'Press declinado en máquina', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'machine', isCompound: true, instructions: 'En la máquina declinada empuja las agarraderas al frente y regresa controlado.' },
  { id: 'smith-incline-press', name: 'Press inclinado en Smith', muscle: 'chest', secondary: ['front_delt', 'triceps'], equipment: 'smith', isCompound: true, instructions: 'Banca a 30 grados bajo la barra guiada, baja al pecho alto y empuja.' },
  { id: 'smith-decline-press', name: 'Press declinado en Smith', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'smith', isCompound: true, instructions: 'Banca declinada bajo la barra guiada, baja al pecho bajo y empuja.' },
  { id: 'incline-cable-press', name: 'Press inclinado en polea', muscle: 'chest', secondary: ['front_delt', 'triceps'], equipment: 'cable', isCompound: true, instructions: 'Sentado entre poleas bajas, empuja los agarres hacia arriba y junta al frente.' },
  { id: 'incline-cable-fly', name: 'Aperturas inclinadas en polea', muscle: 'chest', equipment: 'cable', isCompound: false, instructions: 'En banca inclinada entre poleas, abre los brazos y júntalos sobre el pecho alto.' },
  { id: 'single-arm-cable-crossover', name: 'Cruce de polea a una mano', muscle: 'chest', equipment: 'cable', isCompound: false, instructions: 'De pie junto a la polea, cruza el brazo al frente apretando el pecho.' },
  { id: 'floor-press', name: 'Press en el suelo con barra', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'barbell', isCompound: true, instructions: 'Acostado en el suelo, baja la barra hasta que los codos toquen y empuja.' },
  { id: 'db-floor-press', name: 'Press en el suelo con mancuernas', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'En el suelo, baja las mancuernas hasta que los codos toquen y empuja.' },
  { id: 'wide-grip-bench-press', name: 'Press de banca agarre ancho', muscle: 'chest', secondary: ['front_delt', 'triceps'], equipment: 'barbell', isCompound: true, instructions: 'Agarre más ancho que los hombros, baja la barra al pecho y empuja.' },
  { id: 'one-arm-db-press', name: 'Press de pecho a una mano', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Acostado, empuja una sola mancuerna manteniendo el core firme.' },
  { id: 'incline-push-up', name: 'Flexión inclinada', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Manos en una superficie elevada, baja el pecho y empuja con el cuerpo recto.' },
  { id: 'decline-push-up', name: 'Flexión declinada', muscle: 'chest', secondary: ['triceps', 'front_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Pies elevados en un banco, baja el pecho al suelo y empuja.' },
  { id: 'wide-push-up', name: 'Flexión abierta', muscle: 'chest', secondary: ['front_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Manos bien separadas, baja el pecho al suelo y empuja.' },
  { id: 'wide-grip-lat-pulldown', name: 'Jalón agarre ancho', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'cable', isCompound: true, instructions: 'Agarre amplio, tira la barra al pecho llevando los codos abajo.' },
  { id: 'underhand-pulldown', name: 'Jalón agarre supino', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'cable', isCompound: true, instructions: 'Palmas hacia ti, tira la barra al pecho apretando la espalda.' },
  { id: 'v-bar-pulldown', name: 'Jalón con triángulo', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'cable', isCompound: true, instructions: 'Con el agarre en V, tira al pecho juntando los codos al torso.' },
  { id: 'one-arm-lat-pulldown', name: 'Jalón a una mano', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'cable', isCompound: true, instructions: 'Con un solo agarre, tira hacia abajo estirando bien el dorsal arriba.' },
  { id: 'smith-row', name: 'Remo en Smith', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'smith', isCompound: true, instructions: 'Inclinado bajo la barra guiada, tira hacia el abdomen y baja controlado.' },
  { id: 'reverse-grip-row', name: 'Remo con barra supino', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'barbell', isCompound: true, instructions: 'Agarre supino, tira la barra al abdomen con la espalda neutra.' },
  { id: 'two-arm-db-row', name: 'Remo con dos mancuernas', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Inclinado con el torso paralelo, rema ambas mancuernas al abdomen.' },
  { id: 'seated-one-arm-cable-row', name: 'Remo en polea a una mano', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'cable', isCompound: true, instructions: 'Sentado, tira el agarre a un lado del abdomen rotando ligeramente.' },
  { id: 'leverage-high-row', name: 'Remo alto en máquina', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'machine', isCompound: true, instructions: 'Pecho apoyado, tira las agarraderas hacia abajo y atrás.' },
  { id: 'machine-shrug', name: 'Encogimiento en máquina', muscle: 'back', equipment: 'machine', isCompound: false, instructions: 'Eleva los hombros hacia las orejas contra la resistencia y baja controlado.' },
  { id: 'cable-shrug', name: 'Encogimiento en polea', muscle: 'back', equipment: 'cable', isCompound: false, instructions: 'De pie frente a la polea baja, encoge los hombros sin flexionar codos.' },
  { id: 'rope-straight-arm-pulldown', name: 'Pullover en polea con cuerda', muscle: 'back', secondary: ['triceps'], equipment: 'cable', isCompound: false, instructions: 'Brazos rectos, lleva la cuerda de arriba hacia los muslos apretando el dorsal.' },
  { id: 'barbell-pullover', name: 'Pullover con barra', muscle: 'back', secondary: ['chest', 'triceps'], equipment: 'barbell', isCompound: false, instructions: 'Acostado, baja la barra detrás de la cabeza con codos semiflexionados y vuelve.' },
  { id: 'weighted-pull-up', name: 'Dominadas con peso', muscle: 'back', secondary: ['biceps', 'rear_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Con peso colgado del cinturón, sube hasta superar la barra con la barbilla.' },
  { id: 'seated-barbell-press', name: 'Press militar sentado', muscle: 'front_delt', secondary: ['triceps', 'lateral_delt'], equipment: 'barbell', isCompound: true, instructions: 'Sentado con respaldo, empuja la barra desde los hombros sobre la cabeza.' },
  { id: 'cable-shoulder-press', name: 'Press de hombro en polea', muscle: 'front_delt', secondary: ['triceps', 'lateral_delt'], equipment: 'cable', isCompound: true, instructions: 'Sentado entre poleas bajas, empuja los agarres sobre la cabeza.' },
  { id: 'single-arm-db-shoulder-press', name: 'Press de hombro a una mano', muscle: 'front_delt', secondary: ['triceps', 'lateral_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Empuja una sola mancuerna sobre la cabeza manteniendo el core firme.' },
  { id: 'cable-front-raise', name: 'Elevación frontal en polea', muscle: 'front_delt', equipment: 'cable', isCompound: false, instructions: 'Polea baja por detrás, eleva el brazo recto al frente hasta la altura del hombro.' },
  { id: 'barbell-front-raise', name: 'Elevación frontal con barra', muscle: 'front_delt', equipment: 'barbell', isCompound: false, instructions: 'Eleva la barra recta al frente hasta la altura de los hombros y baja.' },
  { id: 'seated-lateral-raise', name: 'Elevación lateral sentado', muscle: 'lateral_delt', equipment: 'dumbbell', isCompound: false, instructions: 'Sentado, eleva las mancuernas a los lados hasta la altura de los hombros.' },
  { id: 'one-arm-side-lateral', name: 'Elevación lateral a una mano', muscle: 'lateral_delt', equipment: 'dumbbell', isCompound: false, instructions: 'Sujeto a un soporte, eleva una mancuerna al lado con tensión controlada.' },
  { id: 'cable-upright-row', name: 'Remo al mentón en polea', muscle: 'lateral_delt', secondary: ['front_delt', 'back'], equipment: 'cable', isCompound: true, instructions: 'Polea baja con barra, tira hacia la barbilla con los codos altos.' },
  { id: 'db-upright-row', name: 'Remo al mentón con mancuernas', muscle: 'lateral_delt', secondary: ['front_delt', 'back'], equipment: 'dumbbell', isCompound: true, instructions: 'Tira las mancuernas hacia la barbilla con los codos por encima de las manos.' },
  { id: 'seated-rear-delt-fly', name: 'Pájaros sentado', muscle: 'rear_delt', secondary: ['back'], equipment: 'dumbbell', isCompound: false, instructions: 'Sentado con el torso sobre los muslos, abre las mancuernas hacia los lados.' },
  { id: 'lying-rear-delt-raise', name: 'Pájaros tumbado', muscle: 'rear_delt', secondary: ['back'], equipment: 'dumbbell', isCompound: false, instructions: 'Boca abajo en banca inclinada, eleva las mancuernas hacia los lados.' },
  { id: 'cable-rope-rear-delt-row', name: 'Remo posterior con cuerda', muscle: 'rear_delt', secondary: ['back'], equipment: 'cable', isCompound: true, instructions: 'Polea a la altura de la cara, tira de la cuerda separando las manos.' },
  { id: 'cable-hammer-curl', name: 'Curl martillo en polea', muscle: 'biceps', equipment: 'cable', isCompound: false, instructions: 'Polea baja con cuerda en agarre neutro, sube hasta el hombro.' },
  { id: 'seated-db-curl', name: 'Curl sentado con mancuernas', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Sentado, sube las mancuernas sin balancear el torso.' },
  { id: 'alternating-db-curl', name: 'Curl alterno con mancuernas', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Sube una mancuerna a la vez alternando los brazos.' },
  { id: 'zottman-curl', name: 'Curl Zottman', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Sube en supinación y baja en pronación rotando arriba.' },
  { id: 'drag-curl', name: 'Curl drag', muscle: 'biceps', equipment: 'barbell', isCompound: false, instructions: 'Lleva los codos atrás arrastrando la barra pegada al cuerpo.' },
  { id: 'cross-body-hammer-curl', name: 'Curl martillo cruzado', muscle: 'biceps', equipment: 'dumbbell', isCompound: false, instructions: 'Sube la mancuerna en diagonal hacia el hombro contrario.' },
  { id: 'cable-preacher-curl', name: 'Curl predicador en polea', muscle: 'biceps', equipment: 'cable', isCompound: false, instructions: 'Brazos apoyados en el banco predicador, sube con la polea baja.' },
  { id: 'machine-preacher-curl', name: 'Curl predicador en máquina', muscle: 'biceps', equipment: 'machine', isCompound: false, instructions: 'Brazos sobre la almohadilla, flexiona los codos contra la resistencia.' },
  { id: 'wide-grip-barbell-curl', name: 'Curl con barra agarre ancho', muscle: 'biceps', equipment: 'barbell', isCompound: false, instructions: 'Agarre más ancho que los hombros, sube sin balancear.' },
  { id: 'v-bar-pushdown', name: 'Extensión en polea con barra V', muscle: 'triceps', equipment: 'cable', isCompound: false, instructions: 'Codos pegados al torso, extiende empujando la barra V hacia abajo.' },
  { id: 'reverse-grip-pushdown', name: 'Extensión en polea agarre inverso', muscle: 'triceps', equipment: 'cable', isCompound: false, instructions: 'Palmas hacia arriba, extiende el brazo manteniendo el codo fijo.' },
  { id: 'single-arm-pushdown', name: 'Extensión en polea a una mano', muscle: 'triceps', equipment: 'cable', isCompound: false, instructions: 'Con un agarre, extiende el brazo manteniendo el codo pegado al cuerpo.' },
  { id: 'ez-skull-crusher', name: 'Press francés con barra Z', muscle: 'triceps', equipment: 'barbell', isCompound: false, instructions: 'Acostado, baja la barra Z a la frente flexionando solo los codos.' },
  { id: 'db-skull-crusher', name: 'Press francés con mancuernas', muscle: 'triceps', equipment: 'dumbbell', isCompound: false, instructions: 'Acostado, baja las mancuernas a los lados de la cabeza y extiende.' },
  { id: 'seated-db-triceps-press', name: 'Press francés sentado', muscle: 'triceps', equipment: 'dumbbell', isCompound: false, instructions: 'Sentado, baja una mancuerna detrás de la cabeza y extiende arriba.' },
  { id: 'dip-machine', name: 'Fondos en máquina', muscle: 'triceps', secondary: ['chest', 'front_delt'], equipment: 'machine', isCompound: true, instructions: 'Empuja las agarraderas hacia abajo extendiendo los codos.' },
  { id: 'parallel-bar-dip', name: 'Fondos en paralelas (tríceps)', muscle: 'triceps', secondary: ['chest', 'front_delt'], equipment: 'bodyweight', isCompound: true, instructions: 'Torso vertical, baja flexionando codos y empuja hasta extender.' },
  { id: 'close-grip-db-press', name: 'Press cerrado con mancuernas', muscle: 'triceps', secondary: ['chest', 'front_delt'], equipment: 'dumbbell', isCompound: true, instructions: 'Mancuernas juntas sobre el pecho, baja y empuja con los codos cerrados.' },
  { id: 'smith-close-grip-press', name: 'Press cerrado en Smith', muscle: 'triceps', secondary: ['chest', 'front_delt'], equipment: 'smith', isCompound: true, instructions: 'Manos al ancho de hombros bajo la barra guiada, baja al pecho y empuja.' },
  { id: 'standing-overhead-barbell-extension', name: 'Extensión sobre cabeza con barra', muscle: 'triceps', equipment: 'barbell', isCompound: false, instructions: 'De pie, baja la barra detrás de la cabeza y extiende los brazos arriba.' },
  { id: 'box-squat', name: 'Sentadilla en caja', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'barbell', isCompound: true, instructions: 'Baja hasta sentarte brevemente en la caja y empuja para subir.' },
  { id: 'dumbbell-squat', name: 'Sentadilla con mancuernas', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', isCompound: true, instructions: 'Mancuernas a los lados, baja hasta paralelo y empuja con los talones.' },
  { id: 'barbell-lunge', name: 'Zancada con barra', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'barbell', isCompound: true, instructions: 'Barra en la espalda, da un paso al frente y baja hasta 90 grados.' },
  { id: 'reverse-lunge', name: 'Zancada inversa', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', isCompound: true, instructions: 'Da un paso hacia atrás y baja la rodilla cerca del suelo.' },
  { id: 'barbell-walking-lunge', name: 'Zancada caminando con barra', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'barbell', isCompound: true, instructions: 'Con la barra en la espalda, avanza alternando zancadas.' },
  { id: 'narrow-stance-leg-press', name: 'Prensa pies juntos', muscle: 'quads', secondary: ['glutes'], equipment: 'machine', isCompound: true, instructions: 'Pies juntos y bajos en la plataforma, baja controlado y empuja.' },
  { id: 'single-leg-extension', name: 'Extensión de cuádriceps a una pierna', muscle: 'quads', equipment: 'machine', isCompound: false, instructions: 'Extiende una rodilla a la vez contra la resistencia, pausa arriba.' },
  { id: 'barbell-step-up', name: 'Subida al cajón con barra', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'barbell', isCompound: true, instructions: 'Con la barra en la espalda, sube al cajón empujando con la pierna de arriba.' },
  { id: 'plie-squat', name: 'Sentadilla plié', muscle: 'quads', secondary: ['glutes', 'hamstrings'], equipment: 'dumbbell', isCompound: true, instructions: 'Pies anchos y puntas afuera, baja con una mancuerna entre las piernas.' },
  { id: 'standing-leg-curl', name: 'Curl femoral de pie', muscle: 'hamstrings', equipment: 'machine', isCompound: false, instructions: 'Flexiona una rodilla a la vez llevando el talón al glúteo.' },
  { id: 'single-leg-rdl', name: 'Peso muerto rumano a una pierna', muscle: 'hamstrings', secondary: ['glutes', 'back'], equipment: 'dumbbell', isCompound: true, instructions: 'Sobre una pierna, baja la mancuerna con cadera atrás y sube.' },
  { id: 'reverse-hyperextension', name: 'Hiperextensión inversa', muscle: 'hamstrings', secondary: ['glutes'], equipment: 'machine', isCompound: false, instructions: 'Torso fijo en el banco, eleva las piernas atrás apretando glúteo e isquios.' },
  { id: 'smith-stiff-leg-deadlift', name: 'Peso muerto rígido en Smith', muscle: 'hamstrings', secondary: ['glutes', 'back'], equipment: 'smith', isCompound: true, instructions: 'Piernas casi rectas, baja la barra guiada estirando los isquios.' },
  { id: 'barbell-glute-bridge', name: 'Puente de glúteo con barra', muscle: 'glutes', secondary: ['hamstrings'], equipment: 'barbell', isCompound: true, instructions: 'En el suelo con la barra en la cadera, eleva apretando el glúteo arriba.' },
  { id: 'single-leg-glute-bridge', name: 'Puente de glúteo a una pierna', muscle: 'glutes', secondary: ['hamstrings'], equipment: 'bodyweight', isCompound: false, instructions: 'Una pierna extendida, eleva la cadera con la otra apretando el glúteo.' },
  { id: 'glute-kickback', name: 'Patada de glúteo', muscle: 'glutes', secondary: ['hamstrings'], equipment: 'bodyweight', isCompound: false, instructions: 'En cuadrupedia, extiende una pierna hacia atrás y arriba.' },
  { id: 'donkey-calf-raise', name: 'Gemelo burro', muscle: 'calves', equipment: 'machine', isCompound: false, instructions: 'Inclinado hacia adelante con peso en la cadera, eleva los talones al máximo.' },
  { id: 'db-standing-calf-raise', name: 'Gemelo de pie con mancuerna', muscle: 'calves', equipment: 'dumbbell', isCompound: false, instructions: 'Punta en un escalón con una mancuerna, eleva el talón y baja profundo.' },
  { id: 'reverse-crunch', name: 'Crunch inverso', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Acostado, lleva las rodillas al pecho elevando la cadera del suelo.' },
  { id: 'cable-woodchopper', name: 'Leñador en polea', muscle: 'core', equipment: 'cable', isCompound: false, instructions: 'De lado a la polea alta, baja en diagonal cruzando el cuerpo.' },
  { id: 'captains-chair-leg-raise', name: 'Elevación de piernas en paralelas', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Apoyado en los antebrazos, eleva las piernas controladas al frente.' },
  { id: 'sit-up', name: 'Abdominal completo', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Pies fijos, sube el torso completo y baja controlado.' },
  { id: 'cable-russian-twist', name: 'Giro ruso en polea', muscle: 'core', equipment: 'cable', isCompound: false, instructions: 'Sentado o de pie, rota el torso contra la polea de lado a lado.' },
  { id: 'weighted-side-bend', name: 'Inclinación lateral con mancuerna', muscle: 'core', equipment: 'dumbbell', isCompound: false, instructions: 'Mancuerna a un lado, inclina el torso lateralmente y vuelve.' },
  { id: 'v-up', name: 'V-up', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Sube tronco y piernas a la vez tocando los pies formando una V.' },
  { id: 'oblique-crunch', name: 'Crunch oblicuo', muscle: 'core', equipment: 'bodyweight', isCompound: false, instructions: 'Acostado de lado, eleva el torso contrayendo los oblicuos.' },
];

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id);
export const exercisesByMuscle = (m: MuscleGroup) => EXERCISES.filter((e) => e.muscle === m);

/** Grupos de filtrado para pickers de ejercicios (editor de rutina, cambio en sesión). */
export const MUSCLE_FILTER_GROUPS: { id: string; label: string; muscles: MuscleGroup[] }[] = [
  { id: 'all',       label: 'Todos',    muscles: [] },
  { id: 'chest',     label: 'Pecho',    muscles: ['chest'] },
  { id: 'back',      label: 'Espalda',  muscles: ['back'] },
  { id: 'shoulders', label: 'Hombros',  muscles: ['front_delt', 'lateral_delt', 'rear_delt'] },
  { id: 'arms',      label: 'Brazos',   muscles: ['biceps', 'triceps'] },
  { id: 'legs',      label: 'Piernas',  muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'core',      label: 'Core',     muscles: ['core'] },
  { id: 'full_body', label: 'Full body', muscles: ['full_body'] },
];
