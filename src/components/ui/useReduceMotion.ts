/**
 * useReduceMotion — preferencia de "reducir movimiento" del sistema, reactiva.
 *
 * Devuelve `true` hasta conocer el valor real. Así nunca expone un fotograma
 * animado a quien tiene la preferencia activa; al resolver, el contenido no
 * cambia, solo se habilita movimiento cuando el sistema lo permite.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
