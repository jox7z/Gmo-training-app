import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  listMeasurements,
  addMeasurement,
  deleteMeasurement,
  type BodyMeasurement,
} from '@/lib/repos/body';

export type BodyPeriod = '7d' | '30d' | '90d' | 'all';

export const bodyKeys = {
  all: ['body'] as const,
  list: () => ['body', 'list'] as const,
  timeline: (period: BodyPeriod) => ['body', 'timeline', period] as const,
};

export interface BodyTimelinePoint {
  recordedAt: string;
  weightKg: number;
  bodyFatPct?: number;
  musclePct?: number;
  waterPct?: number;
}

interface DbBodyTimelineRow {
  recorded_at: string;
  weight_kg: number | string;
  body_fat_pct: number | string | null;
  muscle_pct: number | string | null;
  water_pct: number | string | null;
}

function toTimelinePoint(row: DbBodyTimelineRow): BodyTimelinePoint {
  return {
    recordedAt: row.recorded_at,
    weightKg: Number(row.weight_kg),
    bodyFatPct: row.body_fat_pct === null ? undefined : Number(row.body_fat_pct),
    musclePct: row.muscle_pct === null ? undefined : Number(row.muscle_pct),
    waterPct: row.water_pct === null ? undefined : Number(row.water_pct),
  };
}

export function useBodyMeasurements() {
  return useQuery({
    queryKey: bodyKeys.list(),
    queryFn: () => listMeasurements(),
  });
}

export function useBodyTimeline(period: BodyPeriod = '90d') {
  return useQuery({
    queryKey: bodyKeys.timeline(period),
    queryFn: async (): Promise<BodyTimelinePoint[]> => {
      const { data, error } = await supabase.rpc('body_timeline', { period });
      if (error) throw error;
      return ((data ?? []) as DbBodyTimelineRow[]).map(toTimelinePoint);
    },
    staleTime: 60_000,
  });
}

export function useAddMeasurement() {
  const qc = useQueryClient();
  return useMutation<string, Error, Omit<BodyMeasurement, 'id'>>({
    mutationFn: (m) => addMeasurement(m),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bodyKeys.all });
    },
  });
}

export function useDeleteMeasurement() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteMeasurement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bodyKeys.all });
    },
  });
}

export type { BodyMeasurement };
