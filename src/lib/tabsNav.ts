/**
 * Puente imperativo para cambiar de tab desde fuera del layout de tabs.
 *
 * El grupo (tabs) usa un PagerView con estado local, no rutas navegables por
 * índice, así que no se puede hacer router.push a un tab concreto. El layout
 * registra un setter y cualquier componente puede pedir el cambio con `goToTab`.
 */
type TabSetter = (index: number) => void;

let setter: TabSetter | null = null;

export function registerTabSetter(fn: TabSetter): () => void {
  setter = fn;
  return () => {
    if (setter === fn) setter = null;
  };
}

export function goToTab(index: number): void {
  setter?.(index);
}

export const TAB_INDEX = { feed: 0, routines: 1, progress: 2, profile: 3 } as const;
