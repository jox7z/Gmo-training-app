import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontSize, spacing } from '@/theme/tokens';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

const BTN = 64;
const EDGE = 3;

interface Props {
  label: string;
  value: number;
  step: number;
  decimals: number;
  onChange: (v: number) => void;
  accessoryId?: string;
}

// Botón circular chunky: cara elevada + edge oscuro que se hunde al presionar.
function StepperButton({ symbol, onPress }: { symbol: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={{ width: BTN, height: BTN + EDGE }}>
      {({ pressed }) => (
        <>
          <View
            style={{
              position: 'absolute',
              top: EDGE,
              left: 0,
              width: BTN,
              height: BTN,
              borderRadius: BTN / 2,
              backgroundColor: colors.bg.cardEdge,
            }}
            pointerEvents="none"
          />
          <View
            style={{
              width: BTN,
              height: BTN,
              borderRadius: BTN / 2,
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              alignItems: 'center',
              justifyContent: 'center',
              transform: pressed ? [{ translateY: EDGE }] : undefined,
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text.primary, lineHeight: 32 }}>
              {symbol}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

/**
 * Input numérico gigante con steppers −/+ chunky, en tarjeta raised.
 * Mantiene la edición libre por teclado (decimal-pad) además de los botones.
 */
export function BigStepperInput({ label, value, step, decimals, onChange, accessoryId }: Props) {
  const [text, setText] = useState(value.toFixed(decimals).replace(/\.0$/, ''));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(value.toFixed(decimals).replace(/\.0$/, ''));
  }, [value, decimals, editing]);

  const bump = (delta: number) => {
    const next = Math.max(0, value + delta);
    onChange(parseFloat(next.toFixed(decimals)));
    Haptics.selectionAsync();
  };

  return (
    <Card variant="raised" padding="xl">
      <Text
        tracking="widest"
        style={{
          fontSize: fontSize.sm,
          fontWeight: '700',
          color: colors.text.muted,
          textAlign: 'center',
          marginBottom: spacing.md,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <StepperButton symbol="−" onPress={() => bump(-step)} />
        <TextInput
          value={text}
          onFocus={() => setEditing(true)}
          onBlur={() => {
            setEditing(false);
            const n = parseFloat(text);
            if (!isNaN(n)) onChange(n);
          }}
          onChangeText={setText}
          keyboardType="decimal-pad"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={Keyboard.dismiss}
          inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
          style={{
            flex: 1,
            color: colors.text.primary,
            fontSize: 64,
            fontWeight: '900',
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
            paddingVertical: 0,
            paddingHorizontal: spacing.xs,
          }}
          selectTextOnFocus
        />
        <StepperButton symbol="+" onPress={() => bump(step)} />
      </View>
    </Card>
  );
}
