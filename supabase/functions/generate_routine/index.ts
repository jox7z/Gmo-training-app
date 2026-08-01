// supabase/functions/generate_routine/index.ts
// Genera una estructura de rutina editable sin score ni consejo automático.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface Input {
  level: 'beginner' | 'intermediate' | 'advanced';
  goal: 'strength' | 'hypertrophy' | 'fat_loss' | 'general';
  daysPerWeek: number;
  weightKg: number;
  heightCm: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const input = (await req.json()) as Input;
  const split = pickSplit(input.daysPerWeek);
  const days = buildDays(split, input);

  return json({ split: split.id, days });
});

function pickSplit(days: number) {
  if (days <= 3) return { id: 'full_body', label: 'Full Body', dayNames: Array(days).fill('Full Body') };
  if (days === 4) return { id: 'upper_lower', label: 'Upper / Lower', dayNames: ['Upper A', 'Lower A', 'Upper B', 'Lower B'] };
  if (days === 5) return { id: 'ppl_ul', label: 'PPL + Upper/Lower', dayNames: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'] };
  return { id: 'ppl', label: 'PPL', dayNames: ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'] };
}

function buildDays(split: ReturnType<typeof pickSplit>, input: Input) {
  const r = repsForGoal(input.goal);
  const setsAdj = input.level === 'beginner' ? -1 : input.level === 'advanced' ? 1 : 0;
  return split.dayNames.map((name) => ({
    name,
    exercises: dayExercises(name).map((id) => ({
      exercise_id: id,
      target_sets: Math.max(2, r.sets + setsAdj),
      target_reps_min: r.min,
      target_reps_max: r.max,
      rest_seconds: r.rest,
    })),
  }));
}

function repsForGoal(goal: Input['goal']) {
  switch (goal) {
    case 'strength': return { min: 4, max: 6, sets: 5, rest: 180 };
    case 'fat_loss': return { min: 12, max: 15, sets: 3, rest: 45 };
    case 'general':  return { min: 8,  max: 12, sets: 3, rest: 90 };
    default:         return { min: 6,  max: 10, sets: 4, rest: 90 };
  }
}

function dayExercises(name: string): string[] {
  const k = name.toLowerCase();
  if (k.includes('push'))  return ['bench-press', 'overhead-press', 'incline-db-press', 'lateral-raise', 'triceps-pushdown'];
  if (k.includes('pull'))  return ['deadlift', 'pull-up', 'barbell-row', 'face-pull', 'biceps-curl'];
  if (k.includes('leg') || k.includes('lower')) return ['squat', 'romanian-deadlift', 'leg-press', 'leg-curl', 'standing-calf'];
  if (k.includes('upper')) return ['bench-press', 'barbell-row', 'overhead-press', 'pull-up', 'lateral-raise', 'biceps-curl'];
  return ['squat', 'bench-press', 'barbell-row', 'overhead-press', 'romanian-deadlift', 'plank'];
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
