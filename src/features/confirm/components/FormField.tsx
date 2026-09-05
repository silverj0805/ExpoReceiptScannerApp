import type { PropsWithChildren } from 'react';
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';

export const FORM_CONTROL_CLASS_NAME =
  'rounded-xl border border-[#e8e6e1] bg-white px-3.5 py-3.5';

const FORM_TEXT_INPUT_CLASS_NAME = `${FORM_CONTROL_CLASS_NAME} text-sm font-semibold text-black`;

export function FormField({
  label,
  required,
  error,
  children,
}: PropsWithChildren<{
  label: string;
  required?: boolean;
  error?: string;
}>) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-gray">
        {required ? `*${label}` : label}
      </Text>
      {children}
      {error ? <Text className="text-xs text-[#B3261E]">{error}</Text> : null}
    </View>
  );
}

export function FormControl({
  className,
  children,
  ...props
}: PropsWithChildren<ViewProps> & { className?: string }) {
  return (
    <View
      className={[FORM_CONTROL_CLASS_NAME, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </View>
  );
}

export function FormTextInput({ className, ...props }: TextInputProps) {
  return (
    <TextInput
      className={[FORM_TEXT_INPUT_CLASS_NAME, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
