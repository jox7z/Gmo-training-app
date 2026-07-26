import { View, type ViewProps } from 'react-native';

export type SocialLayout = 'contained' | 'stream';

interface Props extends ViewProps {
  layout?: SocialLayout;
}

export function SocialStreamColumn({
  layout = 'stream',
  style,
  children,
  ...rest
}: Props) {
  return (
    <View
      {...rest}
      style={[
        layout === 'stream' && {
          width: '100%',
          maxWidth: 600,
          alignSelf: 'center',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
