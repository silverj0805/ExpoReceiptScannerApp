import { View } from 'react-native';

import { PIN_LENGTH } from '../utils';

interface PinDotsProps {
  /** 지금까지 입력된 자리수. */
  length: number;
}

/** 지금까지 입력한 PIN 자리수를 점으로 보여준다. pinRegisterModal/pinVerify 공통. */
function PinDots({ length }: PinDotsProps) {
  return (
    <View className="flex-row gap-4">
      {Array.from({ length: PIN_LENGTH }).map((_, index) => {
        const filled = index < length;
        return (
          <View
            key={index}
            testID={`pin-dot-${index}`}
            accessibilityState={{ selected: filled }}
            className={`h-4 w-4 rounded-full ${
              filled ? 'bg-primary' : 'border-[1.5px] border-[#c9c6bf]'
            }`}
          />
        );
      })}
    </View>
  );
}

export default PinDots;
