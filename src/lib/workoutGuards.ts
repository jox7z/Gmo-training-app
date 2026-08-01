import { Workout } from '@/store/workouts';

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function canStartWorkout(history: Workout[]): GuardResult {
  const now = Date.now();
  const todayKey = localDateKey(new Date(now).toISOString());

  const todayCount = history.filter((w) => localDateKey(w.startedAt) === todayKey).length;
  if (todayCount >= 2) {
    return { allowed: false, reason: 'Ya entrenaste hoy, descansa para recuperar' };
  }

  const last = history.reduce<Workout | null>((acc, w) => {
    if (!acc) return w;
    return new Date(w.startedAt).getTime() > new Date(acc.startedAt).getTime() ? w : acc;
  }, null);

  if (last) {
    const lastEndIso = last.endedAt ?? last.startedAt;
    const hoursSince = (now - new Date(lastEndIso).getTime()) / 3_600_000;
    if (hoursSince < 3) {
      return { allowed: false, reason: 'Llevas poco tiempo desde la última sesión' };
    }
  }

  return { allowed: true };
}
