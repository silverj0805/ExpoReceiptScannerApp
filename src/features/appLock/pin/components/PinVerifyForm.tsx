import { useState } from 'react';
import { Text, View } from 'react-native';

import PinDots from '../shared/components/PinDots';
import PinKeypad from '../shared/components/PinKeypad';
import { PIN_LENGTH } from '../shared/constants';

interface PinVerifyFormProps {
  /** PIN 시도 횟수 제한에 걸려 있는지. */
  isPinLockedOut: boolean;
  /** 제한에 걸리기까지 남은 시도 횟수. */
  remainingPinAttempts: number;
  /** 제한이 풀리기까지 남은 시간(ms). 걸려 있지 않으면 null. */
  pinLockoutRemainingMs: number | null;
  /**
   * PIN을 검증한다. 실제 인증 로직(usePinLock/useAppLock)은 상위에서 주입한다 —
   * 잠금 화면에서 이 폼을 쓸 때 useAppLock이 이미 갖고 있는 인스턴스를 그대로 재사용하기 위함
   * (이 폼 안에서 usePinLock()을 직접 부르면 별도의 상태 인스턴스가 생겨 시도 횟수 등이 어긋난다).
   */
  onSubmitPin: (pin: string) => Promise<boolean>;
  onSuccess: () => void;
}

/** ms를 "mm:ss" 형식으로 표시한다. */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** PIN 검증 폼 — 잠금 화면에서 쓰는 PIN 입력 + 시도 횟수 제한 안내. */
function PinVerifyForm({
  isPinLockedOut,
  remainingPinAttempts,
  pinLockoutRemainingMs,
  onSubmitPin,
  onSuccess,
}: PinVerifyFormProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePressDigit = async (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;

    const nextPin = pin + digit;
    setPin(nextPin);
    if (nextPin.length !== PIN_LENGTH) return;

    const isValid = await onSubmitPin(nextPin);
    if (isValid) {
      onSuccess();
      return;
    }

    setError('PIN이 틀렸어요. 다시 입력해주세요.');
    setPin('');
  };

  const handlePressDelete = () => {
    setPin(current => current.slice(0, -1));
    setError(null);
  };

  return (
    <View className="items-center gap-6 px-6 py-4">
      <View className="items-center gap-2">
        <Text className="text-xl font-bold text-black">PIN 번호 입력</Text>
        <Text className="text-sm text-gray">
          잠금 해제를 위해 PIN을 입력해주세요
        </Text>
      </View>

      <PinDots length={pin.length} />

      {isPinLockedOut && pinLockoutRemainingMs != null ? (
        <Text className="text-4xl font-bold text-black">
          {formatCountdown(pinLockoutRemainingMs)}
        </Text>
      ) : (
        <Text className="text-xs text-gray">
          남은 시도 횟수 {remainingPinAttempts}회
        </Text>
      )}

      {error && (
        <Text className="text-xs text-[#B3261E]" testID="pin-error">
          {error}
        </Text>
      )}

      <PinKeypad
        onPressDigit={handlePressDigit}
        onPressDelete={handlePressDelete}
        disabled={isPinLockedOut}
      />
    </View>
  );
}

export default PinVerifyForm;
