import { MUSCLE_GROUP_LABELS } from '@/data/exercises';
import { formatDecimal } from '@/lib/format';
import type { Post } from '@/lib/repos/posts';
import { toDisplay } from '@/lib/units';
import { parseWorkoutPostMetadata } from '@/lib/workoutPostMetadata';
import type { Unit } from '@/store/app';

export function formatPostShareMessage(post: Post, unit: Unit): string {
  const lines = [post.title ?? 'Mira esto en GMO'];

  if (post.type === 'workout') {
    const metadata = parseWorkoutPostMetadata(post.metadata);
    const stats = [
      metadata.durationSeconds !== undefined
        ? formatDuration(metadata.durationSeconds)
        : null,
      metadata.workingSetCount !== undefined
        ? `${metadata.workingSetCount} series`
        : null,
      metadata.totalReps !== undefined ? `${metadata.totalReps} reps` : null,
      metadata.volumeKg !== undefined && metadata.volumeKg > 0
        ? `${formatDecimal(toDisplay(metadata.volumeKg, unit))} ${unit}·rep`
        : null,
    ].filter((value): value is string => value !== null);
    if (stats.length > 0) lines.push(stats.join(' · '));

    const muscles = metadata.muscleGroups
      .slice(0, 3)
      .map(
        (muscle) =>
          (MUSCLE_GROUP_LABELS as Record<string, string>)[muscle] ?? muscle,
      );
    if (muscles.length > 0) lines.push(muscles.join(' · '));
  }

  if (post.caption) lines.push(post.caption);
  lines.push('Compartido desde GMO Training');
  return lines.join('\n\n');
}

function formatDuration(value: number): string {
  const minutes = Math.max(0, Math.round(value / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${minutes} min`;
}
