/**
 * queryState — deriva loading/error/empty/ok a partir de isLoading/isError/isEmpty.
 * El caso clave es que un error con contenido cacheado (isEmpty=false) no debe
 * tapar ese contenido: debe seguir siendo 'ok'.
 */
import { useQueryState } from '@/lib/queryState';

describe('useQueryState', () => {
  it('isLoading=true siempre da loading, sin importar isError/isEmpty', () => {
    expect(useQueryState({ isLoading: true, isError: false, isEmpty: false })).toBe('loading');
    expect(useQueryState({ isLoading: true, isError: true, isEmpty: true })).toBe('loading');
  });

  it('isError + isEmpty da error', () => {
    expect(useQueryState({ isLoading: false, isError: true, isEmpty: true })).toBe('error');
  });

  it('isError sin isEmpty (hay cache válido) da ok, no tapa el contenido', () => {
    expect(useQueryState({ isLoading: false, isError: true, isEmpty: false })).toBe('ok');
  });

  it('isEmpty sin error da empty', () => {
    expect(useQueryState({ isLoading: false, isError: false, isEmpty: true })).toBe('empty');
  });

  it('ninguno de los tres da ok', () => {
    expect(useQueryState({ isLoading: false, isError: false, isEmpty: false })).toBe('ok');
  });
});
