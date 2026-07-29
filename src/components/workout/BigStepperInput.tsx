import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { runHapticSafely } from '@/lib/haptics';
import {
  formatNumericInput,
  normalizeNumericValue,
  parseNumericInput,
  stepNumericValue,
} from '@/lib/numericInput';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';

interface Props {
  label: string;
  value: number;
  step: number;
  decimals: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  accessoryId?: string;
}

export interface BigStepperInputHandle {
  commit: () => boolean;
}

function StepperButton({
  symbol,
  label,
  onPress,
  disabled,
  size,
}: {
  symbol: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
  size: number;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      pressScale={0.94}
      haptic={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.bg.raised,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.42 : 1,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          fontSize: 28,
          fontWeight: '700',
          color: colors.text.primary,
          lineHeight: 32,
        }}
      >
        {symbol}
      </Text>
    </PressableScale>
  );
}

export const BigStepperInput = forwardRef<BigStepperInputHandle, Props>(
  function BigStepperInput(
    {
      label,
      value,
      step,
      decimals,
      min,
      max,
      onChange,
      accessoryId,
    },
    ref,
  ) {
    const { width, fontScale } = useWindowDimensions();
    const compact = width <= 390 || fontScale > 1.2;
    const buttonSize = compact ? 52 : 64;
    const inputFontSize = compact ? 48 : 60;
    const bounds = { min, max, decimals };
    const initialValue = normalizeNumericValue(value, bounds);
    const currentValue = useRef(initialValue);
    const [text, setText] = useState(formatNumericInput(initialValue, decimals));
    const textRef = useRef(text);
    const [editing, setEditing] = useState(false);
    const [invalid, setInvalid] = useState(false);

    useEffect(() => {
      if (editing) return;
      const next = normalizeNumericValue(value, { min, max, decimals });
      currentValue.current = next;
      const formatted = formatNumericInput(next, decimals);
      textRef.current = formatted;
      setText(formatted);
    }, [value, min, max, decimals, editing]);

    const commit = useCallback(
      (next: number) => {
        const changed = next !== currentValue.current;
        currentValue.current = next;
        const formatted = formatNumericInput(next, decimals);
        textRef.current = formatted;
        setText(formatted);
        if (changed) onChange(next);
        return changed;
      },
      [decimals, onChange],
    );

    const commitText = useCallback(
      (showInvalid: boolean) => {
        const parsed = parseNumericInput(textRef.current, {
          min,
          max,
          decimals,
        });
        if (parsed === null) {
          if (showInvalid) {
            setInvalid(true);
          } else {
            const formatted = formatNumericInput(currentValue.current, decimals);
            textRef.current = formatted;
            setText(formatted);
            setInvalid(false);
          }
          return false;
        }
        setInvalid(false);
        commit(parsed);
        return true;
      },
      [commit, decimals, max, min],
    );

    useImperativeHandle(
      ref,
      () => ({ commit: () => commitText(true) }),
      [commitText],
    );

    const bump = (delta: number) => {
      const draft = parseNumericInput(textRef.current, bounds);
      const next = stepNumericValue(
        draft ?? currentValue.current,
        delta,
        bounds,
      );
      if (!commit(next)) return;
      setInvalid(false);
      void runHapticSafely(() => Haptics.selectionAsync());
    };

    const draftValue = parseNumericInput(text, bounds) ?? currentValue.current;
    const decreaseDisabled = draftValue <= min;
    const increaseDisabled = draftValue >= max;

    return (
      <View
        style={{
          alignSelf: 'center',
          maxWidth: 520,
          width: '100%',
          borderRadius: radius.md,
          backgroundColor: colors.bg.elevated,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.xl,
        }}
      >
        <Text
          numberOfLines={2}
          maxFontSizeMultiplier={1.5}
          style={{
            fontSize: fontSize.sm,
            fontWeight: '600',
            color: colors.text.muted,
            letterSpacing: 0.2,
            textAlign: 'center',
            marginBottom: spacing.md,
          }}
        >
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <StepperButton
            symbol="−"
            label={`Reducir ${label.toLowerCase()}`}
            onPress={() => bump(-step)}
            disabled={decreaseDisabled}
            size={buttonSize}
          />
          <TextInput
            value={text}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              commitText(false);
              setEditing(false);
            }}
            onChangeText={(next) => {
              textRef.current = next;
              setText(next);
              setInvalid(false);
              const parsed = parseNumericInput(next, bounds);
              if (parsed !== null && parsed !== currentValue.current) {
                currentValue.current = parsed;
                onChange(parsed);
              }
            }}
            keyboardType="decimal-pad"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
            inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
            accessibilityLabel={label}
            accessibilityValue={{
              min,
              max,
              now: currentValue.current,
              text: `${text} ${label}`,
            }}
            accessibilityHint={invalid ? 'Introduce un número válido' : undefined}
            maxFontSizeMultiplier={1.3}
            style={{
              flex: 1,
              color: invalid ? colors.danger : colors.text.primary,
              fontSize: inputFontSize,
              fontWeight: '900',
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
              paddingVertical: 0,
              paddingHorizontal: spacing.xs,
            }}
            selectTextOnFocus
          />
          <StepperButton
            symbol="+"
            label={`Aumentar ${label.toLowerCase()}`}
            onPress={() => bump(step)}
            disabled={increaseDisabled}
            size={buttonSize}
          />
        </View>
        {invalid ? (
          <Text
            variant="caption"
            tone="danger"
            accessibilityLiveRegion="polite"
            style={{ marginTop: spacing.sm, textAlign: 'center' }}
          >
            Introduce un número válido
          </Text>
        ) : null}
      </View>
    );
  },
);
