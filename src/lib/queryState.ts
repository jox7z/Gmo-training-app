/**
 * Deriva un único estado de UI a partir de isLoading/isError/isEmpty de una
 * query de React Query. Regla clave: solo reporta 'error' cuando además no hay
 * datos usables (isEmpty) — si una query cacheada ya tiene contenido válido y
 * un refetch en segundo plano falla, el resultado es 'ok', no 'error', para no
 * tapar contenido visible con un fallo transitorio (ver networkMode
 * 'offlineFirst' + retry:0 en app/_layout.tsx).
 *
 * El caller siempre aplana el dato antes de llamar: para useQuery,
 * (data ?? []).length === 0; para useInfiniteQuery,
 * (data?.pages.flatMap(p => p.items) ?? []).length === 0.
 */
export type QueryState = 'loading' | 'error' | 'empty' | 'ok';

export interface QueryStateInput {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
}

export function useQueryState({ isLoading, isError, isEmpty }: QueryStateInput): QueryState {
  if (isLoading) return 'loading';
  if (isError && isEmpty) return 'error';
  if (isEmpty) return 'empty';
  return 'ok';
}
