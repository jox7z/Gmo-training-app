import { callEdgeFunction, isSupabaseConfigured } from './supabase';

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

interface CoachResponse {
  reply: string;
  cached?: boolean;
  provider?: string;
}

/**
 * Llama a la edge function `coach`. Si Supabase no está configurado,
 * cae a un mock local para que la app sea testable en Expo Go sin backend.
 */
export async function askCoach(messages: CoachMessage[]): Promise<CoachResponse> {
  if (isSupabaseConfigured) {
    try {
      return await callEdgeFunction<CoachResponse>('coach', {
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
    } catch (e) {
      console.warn('coach edge function failed, falling back to local mock', e);
    }
  }
  return mockReply(messages[messages.length - 1]?.content ?? '');
}

function mockReply(prompt: string): CoachResponse {
  const lower = prompt.toLowerCase();
  let reply: string;

  if (/sentadilla|squat/.test(lower)) {
    reply =
      'La sentadilla es un compuesto fundamental. Pies a la altura de los hombros, ligera rotación externa. Inicia el movimiento llevando la cadera hacia atrás, baja con la espalda neutra hasta que los muslos estén paralelos al suelo, y empuja a través del talón. Mantén el core activado durante toda la repetición.';
  } else if (/banca|press de banca|bench/.test(lower)) {
    reply =
      'En press de banca: omóplatos retraídos y deprimidos, arco lumbar ligero, pies firmes en el piso. Baja la barra al esternón controladamente (2 segundos), pausa breve, empuja en línea recta. La barra debe quedar sobre los hombros al final, no sobre la cara.';
  } else if (/dolor|lesión|lesion/.test(lower)) {
    reply =
      'Si sientes dolor agudo, detén el ejercicio. Diferencia entre molestia muscular (normal) y dolor articular (alerta). Evalúa: ¿es punzante, persiste fuera del gym, o limita el rango? Si es así, descansa 48-72h y consulta un fisioterapeuta. No es consejo médico.';
  } else if (/proteina|proteína|comer/.test(lower)) {
    reply =
      'Para hipertrofia, apunta a 1.6-2.2g de proteína por kg de peso corporal al día. Distribuida en 3-5 comidas. Fuentes: pollo, huevos, pescado, lácteos, legumbres. La ventana anabólica es más amplia de lo que se creía: lo importante es el total diario.';
  } else if (/sobreentrenamiento|cansado|fatiga/.test(lower)) {
    reply =
      'Señales de sobreentrenamiento: sueño alterado, irritabilidad, pulso en reposo elevado, pérdida de fuerza durante 2+ semanas. Solución: 1 semana de descarga (50-60% del volumen), dormir 8h, asegurar ingesta calórica adecuada.';
  } else {
    reply =
      'Buena pregunta. Como coach virtual puedo ayudarte con técnica de ejercicios, planificación de rutinas, recuperación y nutrición básica. Reformula tu pregunta o cuéntame: ¿qué grupo muscular estás trabajando hoy?';
  }

  return { reply, cached: false, provider: 'local-mock' };
}
