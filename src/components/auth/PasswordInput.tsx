import { forwardRef, useState } from 'react';
import { Pressable, TextInput, TextInputProps, ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { Input } from '@/components/ui/Input';

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
          <EyeIcon open={visible} />
        </Pressable>
      }
    />
  );
});

function EyeIcon({ open }: { open: boolean }) {
  const stroke = colors.text.secondary;
  if (open) {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Circle cx={12} cy={12} r={3} stroke={stroke} strokeWidth={1.8} />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3l18 18"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.4 4.1M6.7 7.6A17.5 17.5 0 0 0 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
