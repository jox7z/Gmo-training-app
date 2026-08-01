import { forwardRef, useId, useState } from 'react';
import { View, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { colors, radius, spacing, fontSize } from '@/theme/tokens';
import { Text } from './Text';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Marca el campo como obligatorio: asterisco visible + nombre accesible. */
  required?: boolean;
  /** Muestra `longitud / maxLength`. Requiere `maxLength`. */
  showCounter?: boolean;
  containerStyle?: ViewStyle;
  rightAdornment?: React.ReactNode;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  {
    label,
    error,
    hint,
    required,
    showCounter,
    containerStyle,
    rightAdornment,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const labelId = useId();
  const multiline = Boolean(rest.multiline);
  const charCount = typeof rest.value === 'string' ? rest.value.length : 0;

  return (
    <View style={containerStyle}>
      {label ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginBottom: spacing.xs + 2,
          }}
        >
          <Text variant="label" tone="secondary" nativeID={labelId}>
            {label}
          </Text>
          {required ? (
            <Text variant="label" tone="danger" accessibilityLabel="obligatorio">
              *
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          borderWidth: 1,
          borderColor: error ? colors.danger : focused ? colors.primary.DEFAULT : colors.border,
          backgroundColor: colors.bg.track,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
        }}
      >
        <TextInput
          ref={ref}
          // El label ya nombra el campo: evita repetirlo en cada pantalla.
          accessibilityLabel={rest.accessibilityLabel ?? label}
          accessibilityLabelledBy={label ? labelId : undefined}
          accessibilityState={{ disabled: rest.editable === false }}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.text.muted}
          style={[
            {
              flex: 1,
              color: colors.text.primary,
              fontSize: fontSize.base,
              paddingVertical: spacing.md + 2,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            rest.style,
          ]}
        />
        {rightAdornment}
      </View>

      {hint || error || (showCounter && rest.maxLength) ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: spacing.sm,
            marginTop: spacing.xs + 2,
          }}
        >
          {hint || error ? (
            <Text
              variant="caption"
              tone={error ? 'danger' : 'muted'}
              accessibilityLiveRegion={error ? 'polite' : 'none'}
              style={{ flex: 1 }}
            >
              {error ?? hint}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {showCounter && rest.maxLength ? (
            <Text variant="caption" tone="muted" numeric>
              {charCount}/{rest.maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});
