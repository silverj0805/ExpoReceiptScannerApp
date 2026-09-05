import { View } from 'react-native';

import { PIN_LENGTH } from '../constants';

interface PinDotsProps {
  /** 지금까지 입력된 자리수. */
  length: number;
}

/** 지금까지 입력한 PIN 자리수를 점으로 보여준다. PinRegisterForm/PinVerifyForm 공통. */
function PinDots({ length }: PinDotsProps) {
  return (
    <View className="flex-row gap-4">
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <View
          key={index}
          className={`h-4 w-4 rounded-full ${
            index < length ? 'bg-primary' : 'border-[1.5px] border-[#c9c6bf]'
          }`}
        />
      ))}
    </View>
  );
}

export default PinDots;
