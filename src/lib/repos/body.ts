import { supabase } from '@/lib/supabase';

export interface BodyMeasurement {
  id: string;
  recordedAt: string;
  weightKg: number;
  bodyFatPct?: number;
  musclePct?: number;
  waterPct?: number;
  notes?: string;
}

interface DbBodyMeasurement {
  id: string;
  recorded_at: string;
  weight_kg: number | string;
  body_fat_pct: number | string | null;
  muscle_pct: number | string | null;
  water_pct: number | string | null;
  notes: string | null;
}

function toApp(row: DbBodyMeasurement): BodyMeasurement {
  return {
    id: row.id,
    recordedAt: row.recorded_at,
    weightKg: Number(row.weight_kg),
    bodyFatPct: row.body_fat_pct === null ? undefined : Number(row.body_fat_pct),
    musclePct: row.muscle_pct === null ? undefined : Number(row.muscle_pct),
    waterPct: row.water_pct === null ? undefined : Number(row.water_pct),
    notes: row.notes ?? undefined,
  };
}

export async function listMeasurements(limit = 50): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as DbBodyMeasurement[]).map(toApp);
}

export async function addMeasurement(m: Omit<BodyMeasurement, 'id'>): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('No authenticated user');

  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: userId,
      recorded_at: m.recordedAt,
      weight_kg: m.weightKg,
      body_fat_pct: m.bodyFatPct ?? null,
      muscle_pct: m.musclePct ?? null,
      water_pct: m.waterPct ?? null,
      notes: m.notes ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateMeasurement(
  id: string,
  partial: Partial<Omit<BodyMeasurement, 'id'>>,
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (partial.recordedAt !== undefined) patch.recorded_at = partial.recordedAt;
  if (partial.weightKg !== undefined) patch.weight_kg = partial.weightKg;
  if (partial.bodyFatPct !== undefined) patch.body_fat_pct = partial.bodyFatPct;
  if (partial.musclePct !== undefined) patch.muscle_pct = partial.musclePct;
  if (partial.waterPct !== undefined) patch.water_pct = partial.waterPct;
  if (partial.notes !== undefined) patch.notes = partial.notes;

  const { error } = await supabase.from('body_measurements').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteMeasurement(id: string): Promise<void> {
  const { error } = await supabase.from('body_measurements').delete().eq('id', id);
  if (error) throw error;
}
