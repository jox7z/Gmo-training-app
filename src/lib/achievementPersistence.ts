export const ACHIEVEMENTS_STORAGE_VERSION = 2;

export interface AchievementSnapshot {
  unlocked: Record<string, string>;
  seeded: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Migra el payload persistido sin borrar fechas de logros ajenos a la racha.
 *
 * La versión 2 cambió la racha de un contador congelado a historial + meta.
 * Sus tiers se resembran en silencio; un desbloqueo legítimo posterior vuelve
 * a producir celebración.
 */
export function migrateAchievementSnapshot(value: unknown): AchievementSnapshot {
  const data = isRecord(value) ? value : {};
  const unlockedSource = isRecord(data.unlocked) ? data.unlocked : {};
  const unlocked = Object.fromEntries(
    Object.entries(unlockedSource).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
  const version = typeof data.version === 'number' ? data.version : 1;

  if (version >= ACHIEVEMENTS_STORAGE_VERSION) {
    return { unlocked, seeded: data.seeded === true };
  }

  return {
    unlocked: Object.fromEntries(
      Object.entries(unlocked).filter(([tierId]) => !tierId.startsWith('streak-')),
    ),
    seeded: false,
  };
}
