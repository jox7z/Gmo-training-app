import { create } from 'zustand';

export type MainTabName = 'feed' | 'routines' | 'progress' | 'profile';

interface MainTabsState {
  requestedTab: MainTabName | null;
  requestTab: (tab: MainTabName) => void;
  consumeRequest: () => void;
}

/**
 * Puente efímero para CTAs que viven fuera del PagerView principal.
 *
 * Expo Router conserva el layout de tabs montado al volver desde un detalle,
 * por lo que navegar a una ruta hija no basta para mover el PagerView. Este
 * request explícito mantiene deep links y selección visual sincronizados.
 */
export const useMainTabsStore = create<MainTabsState>((set) => ({
  requestedTab: null,
  requestTab: (requestedTab) => set({ requestedTab }),
  consumeRequest: () => set({ requestedTab: null }),
}));
