import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProgressPeriod, ProgressSummary } from '@/lib/progress';

export const progressKeys = {
  all: ['progress'] as const,
  summary: (period: ProgressPeriod) => ['progress', 'summary', period] as const,
  timeline: (period: ProgressPeriod) => ['progress', 'timeline', period] as const,
};

interface DbProgressSummary {
  total_workouts: number;
  total_active_seconds: number;
  total_rest_seconds: number;
  total_reps: number;
  total_weight_kg: number | string;
  avg_set_duration: number | string;
  avg_rest_after: number | string;
  workouts_per_week: number | string;
}

function toSummary(row: DbProgressSummary): ProgressSummary {
  return {
    totalWorkouts: row.total_workouts,
    totalActiveSeconds: row.total_active_seconds,
    totalRestSeconds: row.total_rest_seconds,
    totalReps: row.total_reps,
    totalWeightKg: Number(row.total_weight_kg),
    avgSetDuration: Number(row.avg_set_duration),
    avgRestAfter: Number(row.avg_rest_after),
    workoutsPerWeek: Number(row.workouts_per_week),
  };
}

export interface ProgressTimelinePoint {
  day: string;
  workouts: number;
  activeSeconds: number;
  reps: number;
  weightKg: number;
}

interface DbProgressTimelineRow {
  day: string;
  workouts: number;
  active_seconds: number;
  reps: number;
  weight_kg: number | string;
}

function toTimelinePoint(row: DbProgressTimelineRow): ProgressTimelinePoint {
  return {
    day: row.day,
    workouts: row.workouts,
    activeSeconds: row.active_seconds,
    reps: row.reps,
    weightKg: Number(row.weight_kg),
  };
}

export function useProgressSummary(period: ProgressPeriod = '30d') {
  return useQuery({
    queryKey: progressKeys.summary(period),
    queryFn: async (): Promise<ProgressSummary> => {
      const { data, error } = await supabase.rpc('progress_summary', { period });
      if (error) throw error;
      return toSummary(data as DbProgressSummary);
    },
    staleTime: 60_000,
  });
}

export function useProgressTimeline(period: ProgressPeriod = '30d') {
  return useQuery({
    queryKey: progressKeys.timeline(period),
    queryFn: async (): Promise<ProgressTimelinePoint[]> => {
      const { data, error } = await supabase.rpc('progress_timeline', { period });
      if (error) throw error;
      return ((data ?? []) as DbProgressTimelineRow[]).map(toTimelinePoint);
    },
    staleTime: 60_000,
  });
}
