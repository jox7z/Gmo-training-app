import { useState } from 'react';
import { View, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { colors, radius, spacing, fontSize } from '@/theme/tokens';
import { Text } from './Text';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  rightAdornment?: React.ReactNode;
}

export function Input({ label, error, hint, containerStyle, rightAdornment, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={containerStyle}>
      {label && (
        <Text variant="label" tone="secondary" style={{ marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? colors.danger : focused ? colors.primary.DEFAULT : colors.border,
          backgroundColor: colors.bg.elevated,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
        }}
      >
        <TextInput
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
              paddingVertical: 14,
            },
            rest.style,
          ]}
        />
        {rightAdornment}
      </View>
      {(hint || error) && (
        <Text
          variant="caption"
          tone={error ? 'danger' : 'muted'}
          style={{ marginTop: 6 }}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}
