// supabase/functions/coach/index.ts
// Edge Function: Coach virtual con cache + fallback multi-proveedor.
// Deploy: supabase functions deploy coach
// Secrets: GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const SYSTEM_PROMPT = `Eres "Gmo Coach", un entrenador personal experto en gimnasio.
Responde en español, de forma concisa y práctica.
Reglas:
- Nunca des consejo médico definitivo. Si hay dolor agudo o lesión, recomienda consultar fisio/médico.
- Estructura las respuestas en máximo 4 párrafos cortos o bullets.
- Cita rangos de reps/series/descanso cuando sea relevante.
- Sé motivador pero sin exagerar.`;

const RATE_LIMIT_PER_HOUR = 30;
const TIMEOUT_MS = 8000;
const CACHE_TTL_HOURS = 24 * 7; // 1 semana para preguntas comunes

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Provider {
  name: 'gemini' | 'anthropic' | 'openai';
  call: (messages: ChatMessage[]) => Promise<string>;
}

const providers: Provider[] = [
  { name: 'gemini', call: callGemini },
  { name: 'anthropic', call: callAnthropic },
  { name: 'openai', call: callOpenAI },
];

// Circuit breaker en memoria de la edge function (proceso vive ~15 min en idle)
const breaker = new Map<string, { failures: number; openUntil: number }>();

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return json({ error: 'unauthorized' }, 401);

    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'messages required' }, 400);
    }

    // 1. Rate limit por usuario (último hora)
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('ai_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: 'rate_limited', retryAfterSeconds: 1800 }, 429);
    }

    // 2. Cache lookup (hash exacto del último mensaje del usuario)
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const promptHash = await sha256(`${SYSTEM_PROMPT}|${lastUser.toLowerCase().trim()}`);

    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('response, model')
      .eq('prompt_hash', promptHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      await supabase.rpc('increment_cache_hit', { p_hash: promptHash });
      await logUsage(supabase, user.id, cached.model ?? 'cache', 0, 0, 'ok');
      return json({ reply: cached.response, cached: true, provider: cached.model });
    }

    // 3. Provider selection con fallback
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-8), // limitar contexto a últimos 8 mensajes
    ];

    let lastError: string | undefined;
    for (const p of providers) {
      const status = breaker.get(p.name);
      if (status && status.openUntil > Date.now()) continue;

      try {
        const reply = await withTimeout(p.call(fullMessages), TIMEOUT_MS);
        breaker.delete(p.name);

        // Persistir en cache
        await supabase.from('ai_response_cache').upsert({
          prompt_hash: promptHash,
          response: reply,
          model: p.name,
          hit_count: 0,
          expires_at: new Date(Date.now() + CACHE_TTL_HOURS * 3600 * 1000).toISOString(),
        });

        await logUsage(supabase, user.id, p.name, lastUser.length, reply.length, 'ok');
        return json({ reply, cached: false, provider: p.name });
      } catch (err) {
        lastError = String(err);
        const failures = (breaker.get(p.name)?.failures ?? 0) + 1;
        breaker.set(p.name, {
          failures,
          openUntil: failures >= 3 ? Date.now() + 5 * 60 * 1000 : 0,
        });
        await logUsage(supabase, user.id, p.name, 0, 0, 'error', lastError);
      }
    }

    return json({ error: 'all_providers_failed', detail: lastError }, 503);
  } catch (e) {
    return json({ error: 'internal', detail: String(e) }, 500);
  }
});

// ---------- Providers ----------

async function callGemini(messages: ChatMessage[]): Promise<string> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('no GEMINI_API_KEY');
  const sys = messages.find((m) => m.role === 'system')?.content ?? '';
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 600 },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`gemini empty response (finishReason=${data.candidates?.[0]?.finishReason ?? 'unknown'})`);
  return text;
}

async function callAnthropic(messages: ChatMessage[]): Promise<string> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('no ANTHROPIC_API_KEY');
  const system = messages.find((m) => m.role === 'system')?.content ?? '';
  const conv = messages.filter((m) => m.role !== 'system');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system,
      messages: conv.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('anthropic returned empty content');
  return text;
}

async function callOpenAI(messages: ChatMessage[]): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('no OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.6,
      max_tokens: 600,
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('openai returned empty content');
  return text;
}

// ---------- Helpers ----------

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors() },
  });
}

async function logUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  provider: string,
  tokensIn: number,
  tokensOut: number,
  status: string,
  errorMessage?: string,
) {
  await supabase.from('ai_usage_log').insert({
    user_id: userId,
    provider,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    status,
    error_message: errorMessage,
  });
}

