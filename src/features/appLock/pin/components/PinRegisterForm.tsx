import { useState } from 'react';
import { Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import PinDots from '../shared/components/PinDots';
import PinKeypad from '../shared/components/PinKeypad';
import { PIN_LENGTH } from '../shared/constants';
import { savePin } from '../utils/pinStorage';

interface PinRegisterFormProps {
  /** 생체인증을 이미 켠 상태로 이 화면에 들어왔는지 — true면 PIN도 함께 등록하는 이유를 안내한다. */
  biometricAlreadyEnabled: boolean;
  onComplete: () => void;
}

type Stage = 'first' | 'confirm';

/** PIN 등록 폼 — 1차 입력 → 2차 재확인, 일치해야 `savePin`으로 저장한다. */
function PinRegisterForm({
  biometricAlreadyEnabled,
  onComplete,
}: PinRegisterFormProps) {
  const [stage, setStage] = useState<Stage>('first');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentPin = stage === 'first' ? firstPin : confirmPin;

  const handlePressDigit = async (digit: string) => {
    if (currentPin.length >= PIN_LENGTH) return;

    const nextPin = currentPin + digit;

    if (stage === 'first') {
      setFirstPin(nextPin);
      if (nextPin.length === PIN_LENGTH) {
        setStage('confirm');
      }
      return;
    }

    setConfirmPin(nextPin);
    if (nextPin.length !== PIN_LENGTH) return;

    if (nextPin === firstPin) {
      await savePin(nextPin);
      onComplete();
      return;
    }

    setError('PIN이 일치하지 않아요. 다시 입력해주세요.');
    setConfirmPin('');
  };

  const handlePressDelete = () => {
    if (stage === 'first') {
      setFirstPin(pin => pin.slice(0, -1));
    } else {
      setConfirmPin(pin => pin.slice(0, -1));
      setError(null);
    }
  };

  return (
    <View className="items-center gap-6 px-6 py-4">
      <View className="flex-row items-center gap-1.5">
        <View className="h-5.5 w-5.5 items-center justify-center rounded-full bg-primary">
          {stage === 'confirm' && (
            <Icon name="checkmark" size={12} colorClassName="accent-white" />
          )}
        </View>
        <View
          className={`h-[1.5px] w-5 ${stage === 'confirm' ? 'bg-primary' : 'bg-[#c9c6bf]'}`}
        />
        <View
          className={`h-5.5 w-5.5 rounded-full ${
            stage === 'confirm'
              ? 'bg-primary'
              : 'border-[1.5px] border-[#c9c6bf]'
          }`}
        />
      </View>

      {biometricAlreadyEnabled && (
        <View className="w-full rounded-2xl bg-primary/10 px-4 py-3">
          <Text className="text-center text-xs leading-5 text-primary">
            Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요
          </Text>
        </View>
      )}

      <View className="items-center gap-2">
        <Text className="text-xl font-bold text-black">
          {stage === 'first'
            ? 'PIN 번호를 설정해주세요'
            : '다시 한 번 입력해주세요'}
        </Text>
        <Text className="text-sm text-gray">
          {stage === 'first'
            ? `${PIN_LENGTH}자리 숫자를 입력해주세요`
            : '확인을 위해 동일한 PIN을 입력해주세요'}
        </Text>
      </View>

      <PinDots length={currentPin.length} />

      {error && (
        <Text className="text-xs text-[#B3261E]" testID="pin-error">
          {error}
        </Text>
      )}

      <PinKeypad
        onPressDigit={handlePressDigit}
        onPressDelete={handlePressDelete}
      />
    </View>
  );
}

export default PinRegisterForm;
