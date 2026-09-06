import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import Icon from '@/shared/components/Icon';

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
  /**
   * 생체인증으로 전환하는 콜백. 기기가 생체인증을 지원+등록+활성화한 상태에서만
   * 상위(LockScreen)가 넘겨준다 — 없으면(=생체인증을 아예 못 쓰는 상황) 전환 UI 자체를 숨긴다.
   * 잠기지 않았을 때 "Face ID로 전환" 링크로만 노출된다 — 시도 횟수 제한(PinLockedOut)에
   * 걸린 동안엔 생체인증으로 우회할 수 없다(목업엔 있었지만 정책상 뺀 버튼, 사용자 확인).
   */
  onSwitchToBiometric?: () => void;
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
  onSwitchToBiometric,
}: PinVerifyFormProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wasPinLockedOut, setWasPinLockedOut] = useState(isPinLockedOut);

  // 잠기는 순간(isPinLockedOut이 false→true로 바뀌는 순간) 마지막 실패가 남긴
  // "PIN이 틀렸어요" 에러를 지운다 — 카운트다운과 옛날 에러 문구가 동시에 보이면 안 되고,
  // 잠긴 동안·잠금이 풀린 뒤에도 재시도 안내만 보여야 한다(실기기 재현으로 확인 — 사용자
  // 요구사항). useEffect에서 setState를 직접 부르면 react-hooks/set-state-in-effect에
  // 걸리고(이번엔 LockScreen 때와 달리 실제로 effect 본문에서 동기적으로 부르는 진짜
  // 케이스라 disable로 넘길 이유가 없음), React 공식 문서가 권장하는 "prop 변화에 맞춰
  // 렌더 중 상태 조정하기" 패턴을 그대로 쓴다.
  if (isPinLockedOut !== wasPinLockedOut) {
    setWasPinLockedOut(isPinLockedOut);
    if (isPinLockedOut) setError(null);
  }

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

  const keypad = (
    <PinKeypad
      onPressDigit={handlePressDigit}
      onPressDelete={handlePressDelete}
      disabled={isPinLockedOut}
    />
  );

  // 시도 횟수 제한에 걸리면 onSwitchToBiometric 유무와 무관하게 항상 이 잠금 안내 화면
  // (목업 PinLockedOut.dc.html과 매칭 — 아이콘 + 제목 + 설명 + 큰 카운트다운)으로 완전히
  // 바꿔서 보여준다. 목업엔 "Face ID로 잠금 해제" 버튼이 있었지만 정책상 뺐다(사용자 확인
  // — PIN이 잠긴 동안엔 생체인증으로 우회할 수 없다).
  if (isPinLockedOut) {
    return (
      <View className="items-center gap-6 px-6 py-4">
        <View className="h-20 w-20 items-center justify-center rounded-full border-[1.5px] border-[rgba(179,38,30,0.2)] bg-[rgba(179,38,30,0.08)]">
          <Icon name="lock-closed" size={36} color="#B3261E" />
        </View>
        <View className="items-center gap-2">
          <Text className="text-xl font-bold text-black">PIN이 잠겼어요</Text>
          <Text className="text-center text-sm leading-relaxed text-gray">
            너무 많이 틀렸어요{'\n'}아래 시간이 지나면 다시 시도할 수 있어요
          </Text>
        </View>

        {pinLockoutRemainingMs != null && (
          <Text className="text-[40px] font-bold tracking-[1px] text-black">
            {formatCountdown(pinLockoutRemainingMs)}
          </Text>
        )}

        <Text className="text-xs text-gray" testID="pin-lockout-message">
          시간 후에 다시 시도해주세요
        </Text>

        {keypad}
      </View>
    );
  }

  return (
    <View className="items-center gap-6 px-6 py-4">
      <View className="items-center gap-2">
        <Text className="text-xl font-bold text-black">PIN 번호 입력</Text>
        <Text className="text-sm text-gray">
          잠금 해제를 위해 PIN을 입력해주세요
        </Text>
      </View>

      <PinDots length={pin.length} />

      <Text className="text-xs text-gray">
        남은 시도 횟수 {remainingPinAttempts}회
      </Text>

      {error && (
        <Text className="text-xs text-[#B3261E]" testID="pin-error">
          {error}
        </Text>
      )}

      {keypad}

      {onSwitchToBiometric && (
        <TouchableOpacity
          testID="switch-to-biometric"
          onPress={onSwitchToBiometric}
        >
          <Text className="text-sm font-medium text-primary underline">
            Face ID로 전환
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default PinVerifyForm;
