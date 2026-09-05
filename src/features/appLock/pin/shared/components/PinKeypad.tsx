import { Text, TouchableOpacity, View } from 'react-native';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

interface PinKeypadProps {
  onPressDigit: (digit: string) => void;
  onPressDelete: () => void;
  /** true면 잠겨서(시도 횟수 초과 등) 입력을 받지 않는다. */
  disabled?: boolean;
}

/** 온스크린 숫자 키패드(0~9 + 지우기). PinRegisterForm/PinVerifyForm 공통. */
function PinKeypad({
  onPressDigit,
  onPressDelete,
  disabled = false,
}: PinKeypadProps) {
  return (
    <View
      className={`w-full max-w-xs gap-2 ${disabled ? 'opacity-30' : ''}`}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {KEYPAD_ROWS.map(row => (
        <View key={row.join('')} className="flex-row justify-between">
          {row.map(digit => (
            <TouchableOpacity
              key={digit}
              testID={`pin-key-${digit}`}
              disabled={disabled}
              onPress={() => !disabled && onPressDigit(digit)}
              className="h-16 w-16 items-center justify-center"
            >
              <Text className="text-2xl font-medium text-black">{digit}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View className="flex-row justify-between">
        <View className="h-16 w-16" />
        <TouchableOpacity
          testID="pin-key-0"
          disabled={disabled}
          onPress={() => !disabled && onPressDigit('0')}
          className="h-16 w-16 items-center justify-center"
        >
          <Text className="text-2xl font-medium text-black">0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="pin-key-delete"
          disabled={disabled}
          onPress={() => !disabled && onPressDelete()}
          className="h-16 w-16 items-center justify-center"
        >
          <Text className="text-base font-medium text-black">지우기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default PinKeypad;
