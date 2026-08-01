import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '@/theme/tokens';
import { Text } from './Text';
import { Icon, type IconName } from '@/components/Icon';

type ToastTone = 'danger' | 'success' | 'info';

interface ToastConfig {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastContextValue {
  show: (cfg: ToastConfig) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_BY_TONE: Record<ToastTone, IconName> = {
  danger: 'alert',
  success: 'check',
  info: 'info',
};

const COLOR_BY_TONE: Record<ToastTone, { border: string; icon: string }> = {
  danger: { border: colors.danger, icon: colors.danger },
  success: { border: colors.success, icon: colors.success },
  info: { border: colors.info.DEFAULT, icon: colors.info.DEFAULT },
};

/** Aviso estático: aparece y desaparece sin transición. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [cfg, setCfg] = useState<ToastConfig>({ message: '', tone: 'info' });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setVisible(false);
  }, []);

  const show = useCallback(
    ({ message, tone = 'info', durationMs = 2600 }: ToastConfig) => {
      setCfg({ message, tone, durationMs });
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(hide, durationMs);
    },
    [hide],
  );

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const tone = cfg.tone ?? 'info';
  const palette = COLOR_BY_TONE[tone];

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {visible ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: insets.bottom + 90 }}
        >
          <Pressable
            onPress={hide}
            accessibilityRole="button"
            accessibilityLabel={cfg.message}
            accessibilityHint="Toca para cerrar el aviso"
          >
            <View
              accessibilityLiveRegion="polite"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                backgroundColor: colors.bg.elevated, borderRadius: radius.lg,
                borderWidth: 1, borderColor: palette.border, padding: spacing.md,
                ...shadow.card,
              }}
            >
              <View style={{ width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceVeil }}>
                <Icon name={ICON_BY_TONE[tone]} size={spacing.lg} color={palette.icon} />
              </View>
              <Text variant="body" weight="semibold" style={{ flex: 1 }}>{cfg.message}</Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? { show: () => {}, hide: () => {} };
}
