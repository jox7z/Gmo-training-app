import { useQuery } from '@tanstack/react-query';
import {
  listPublicRoutines,
  getPublicRoutineDetail,
  type PublicRoutineSummary,
} from '@/lib/repos/routines';

export const routinesKeys = {
  public: (limit: number) => ['routines', 'public', limit] as const,
  publicDetail: (id: string) => ['routines', 'public', 'detail', id] as const,
};

export function usePublicRoutines(limit = 30) {
  return useQuery({
    queryKey: routinesKeys.public(limit),
    queryFn: () => listPublicRoutines(limit),
  });
}

export function usePublicRoutineDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? routinesKeys.publicDetail(id) : (['routines', 'public', 'detail', 'noop'] as const),
    queryFn: () => getPublicRoutineDetail(id!),
    enabled: !!id,
  });
}

export type { PublicRoutineSummary };
