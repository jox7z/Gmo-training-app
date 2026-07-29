export async function runHapticSafely(
  effect: () => Promise<unknown>,
): Promise<void> {
  try {
    await effect();
  } catch {
    // El feedback háptico es opcional; nunca puede romper una mutación válida.
  }
}
