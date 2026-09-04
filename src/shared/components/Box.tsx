import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

const BOX_CLASS_NAME =
  'rounded-2xl border border-[#e8e6e1] px-4 py-3.5 bg-white';

type BoxProps = PropsWithChildren<ViewProps> & { className?: string };

export function Box({ className, children, ...props }: BoxProps) {
  return (
    <View
      className={[BOX_CLASS_NAME, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </View>
  );
}
