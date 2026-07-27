import { forwardRef, useState } from 'react';
import { Pressable, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/Icon';

interface Props extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export const PasswordInput = forwardRef<TextInput, Props>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      ref={ref}
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      rightAdornment={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          style={{ paddingHorizontal: 4, paddingVertical: 8 }}
        >
          <Icon name={visible ? 'eye' : 'eye-off'} size={22} color={colors.text.secondary} />
        </Pressable>
      }
    />
  );
});
