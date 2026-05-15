import { callEdgeFunction, isSupabaseConfigured } from './supabase';
import { OptimizationBreakdown, MUSCLE_LABELS } from './optimizationScore';

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface WorkoutSummary {
  date: string;
  durationMin: number;
  volumeKg: number;
  exercises: string[];
}

export interface CoachContext {
  score: number;
  breakdown: OptimizationBreakdown;
  weakGroups: string[];
  recentWorkouts: WorkoutSummary[];
  trainingGaps: string[];
}

interface CoachResponse {
  reply: string;
  cached?: boolean;
  provider?: string;
}

export async function askCoach(messages: CoachMessage[], ctx: CoachContext): Promise<CoachResponse> {
  if (isSupabaseConfigured) {
    try {
      return await callEdgeFunction<CoachResponse>('coach', {
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        context: ctx,
      });
    } catch (e) {
      console.warn('coach edge function failed, falling back to local mock', e);
    }
  }
  return mockReply(messages[messages.length - 1]?.content ?? '', ctx);
}

function mockReply(prompt: string, ctx: CoachContext): CoachResponse {
  const lower = prompt.toLowerCase();

  const isWeak = (m: string) => ctx.weakGroups.includes(m);
  const weakLabels = ctx.weakGroups.map((g) => MUSCLE_LABELS[g] ?? g);
  const hasGaps = ctx.trainingGaps.length >= 4;
  const lowFreq = ctx.breakdown.frequency < 60;

  let reply: string;

  if (/score|optimiz|cómo estoy|como estoy|análisis|analisis|mejorar/.test(lower)) {
    const weakStr = weakLabels.length
      ? `Tus grupos más descuidados son **${weakLabels.join(' y ')}**.`
      : '';
    const freqNote = lowFreq ? ' Estás entrenando menos días de los que te propusiste.' : '';
    const recNote =
      ctx.breakdown.recovery < 60
        ? ' También detecto posible acumulación de fatiga en algunos grupos.'
        : '';
    const progNote =
      ctx.breakdown.progression > 60
        ? ' Tu progresión de volumen va bien.'
        : ' El volumen semanal no está progresando — considera sobrecarga progresiva.';
    reply = `Tu score actual es **${ctx.score}/100**.${freqNote}${recNote}${progNote} ${weakStr}`.trim();
  } else if (hasGaps && /constancia|hábito|motivación|motivacion|regular/.test(lower)) {
    reply = `Llevas ${ctx.trainingGaps.length} días sin entrenar en las últimas 2 semanas. La consistencia supera a la intensidad. Reserva slots fijos — aunque sean 30 min, cuentan para la racha.`;
  } else if (/espalda|dominada|remo|jalón|jalon|jalones/.test(lower)) {
    const extra = isWeak('back')
      ? ' Además, la espalda es uno de tus grupos con menos volumen acumulado — dale prioridad esta semana.'
      : '';
    reply = `Para espalda: dominadas (o jalón al pecho) para amplitud dorsal, remo con barra o mancuernas para espesor. Ratio tiro:empuje 2:1. Piensa en "jalar con los codos" para aislar el dorsal.${extra}`;
  } else if (/pecho|press de banca|banca/.test(lower)) {
    const extra = isWeak('chest')
      ? ' El pecho es tu grupo más débil ahora mismo — añade un set extra de aperturas en cable esta semana.'
      : '';
    reply = `Press de banca: omóplatos retraídos y deprimidos, arco lumbar ligero, pies firmes en el piso. Baja la barra al esternón (2 s), pausa breve, empuja en línea recta. Para más volumen: aperturas en cable en tres ángulos.${extra}`;
  } else if (/hombros?|press militar|laterales|elevaciones/.test(lower)) {
    const extra = isWeak('shoulders')
      ? ' Los hombros están entre tus grupos con menos volumen — añade 2 series de elevaciones laterales esta semana.'
      : '';
    reply = `Press militar para deltoides anterior y medial. Elevaciones laterales estrictas — sin balanceo, codo ligeramente flexionado — para deltoides medial. Pájaros para deltoides posterior (suele estar subentrenado).${extra}`;
  } else if (/sentadilla|squat|cuádriceps|cuadriceps|piernas/.test(lower)) {
    const weakLegs = (['quads', 'hamstrings', 'glutes'] as const).filter(isWeak);
    const extra = weakLegs.length
      ? ` Tus grupos débiles incluyen ${weakLegs.map((g) => MUSCLE_LABELS[g]).join(' y ')} — prioriza pierna en la próxima sesión.`
      : '';
    reply = `Sentadilla: pies a ancho de hombros, ligera rotación externa. Inicia con caderas hacia atrás, baja con espalda neutra hasta paralelo, empuja a través de los talones. Core activado en todo momento.${extra}`;
  } else if (/isquio|femoral|peso muerto rumano|hip thrust|glúteos|gluteos/.test(lower)) {
    const extra =
      isWeak('hamstrings') || isWeak('glutes')
        ? ` Isquios y glúteos son tus grupos más débiles — ${MUSCLE_LABELS[ctx.weakGroups[0] ?? ''] ?? 'este grupo'} necesita más atención.`
        : '';
    reply = `Peso muerto rumano para isquiotibiales: caderas atrás, piernas casi rectas, barra cerca del cuerpo. Hip thrust para glúteos: hombros sobre banco, empuje de caderas contrayendo glúteo en la parte alta. Ratio quad:isquio 1:1 para evitar desequilibrios.${extra}`;
  } else if (/proteina|proteína|comer|nutrición|nutricion|calorías|calorias/.test(lower)) {
    reply =
      'Para hipertrofia: 1.6-2.2 g de proteína por kg de peso corporal al día, distribuida en 3-5 comidas. El total diario pesa más que el timing. Fuentes: pollo, huevos, pescado, lácteos, legumbres.';
  } else if (/sobreentrenamiento|cansado|fatiga|recuperación|recuperacion/.test(lower)) {
    const gapNote = hasGaps
      ? ` Tienes ${ctx.trainingGaps.length} días de descanso en las últimas 2 semanas, pero verifica calidad de sueño y nutrición.`
      : '';
    const recScore = ctx.breakdown.recovery;
    reply = `${
      recScore < 60
        ? 'Tu score de recuperación es bajo — posiblemente estás repitiendo grupos musculares con demasiada frecuencia.'
        : 'Tu recuperación parece razonable.'
    } Señales de sobreentrenamiento: sueño alterado, pulso en reposo elevado, pérdida de fuerza sostenida 2+ semanas. Solución: 1 semana al 50-60% de volumen.${gapNote}`;
  } else if (/dolor|lesión|lesion/.test(lower)) {
    reply =
      'Diferencia molestia muscular (normal, difusa, mejora calentando) de dolor articular (alerta: puntual, persiste, limita rango). Si es articular: detén, descansa 48-72 h y consulta fisio. No es consejo médico.';
  } else if (/último|ultimo|reciente|historial|entrené|entrenamiento pasado/.test(lower)) {
    if (ctx.recentWorkouts.length === 0) {
      reply = 'Aún no hay workouts registrados. ¡Empieza hoy y construye tu historial!';
    } else {
      const last = ctx.recentWorkouts[0];
      const exStr =
        last.exercises.slice(0, 3).join(', ') + (last.exercises.length > 3 ? ' y más' : '');
      reply = `Tu último entreno fue el ${last.date}: ${last.durationMin} min, ${Math.round(last.volumeKg)} kg de volumen total. Ejercicios: ${exStr}.`;
    }
  } else if (/progres|aumentar carga|sobrecarga|mejorar fuerza/.test(lower)) {
    const prog = ctx.breakdown.progression;
    reply =
      prog > 60
        ? `Tu progresión de volumen es buena (${prog}/100). Sigue con sobrecarga progresiva: +2-5% en compuestos cada semana. No subas más de un ejercicio a la vez.`
        : `Tu progresión de volumen es mejorable (${prog}/100). Registra pesos y añade carga gradualmente — añade 1 rep antes de subir el peso.`;
  } else {
    const weakHint = weakLabels.length
      ? ` Tus grupos más débiles ahora mismo son **${weakLabels.join(' y ')}** — podemos trabajar en eso.`
      : '';
    reply = `Como coach virtual puedo ayudarte con técnica, rutinas, recuperación y nutrición.${weakHint} ¿Sobre qué quieres que hablemos?`;
  }

  return { reply, cached: false, provider: 'local-mock' };
}
