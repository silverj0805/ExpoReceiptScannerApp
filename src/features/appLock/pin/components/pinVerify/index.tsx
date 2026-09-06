import { useState } from 'react';
import { Text, View } from 'react-native';

import { SESSION_TIMEOUT_MS } from '../../../hooks/useSessionTimeout';
import { useAppLockStore } from '../../../stores/useAppLockStore';
import { PIN_LENGTH, verifyStoredPin } from '../../utils';
import PinDots from '../PinDots';
import PinKeypad from '../PinKeypad';

/**
 * PIN은 생체인증과 달리 OS가 대신 시도 횟수를 세주지 않으므로, 이 컴포넌트가 직접
 * 실패 횟수를 세다가 다 소진하면 useAppLockStore.freeze()를 불러 얼린다. 얼린
 * 뒤에 보여줄 화면(FrozenScreen)은 AppLockGate가 이미 갖고 있는 걸 그대로
 * 재사용한다(새 PinLockedOut 화면을 따로 만들지 않기로 함 — 사용자 확인).
 *
 * 실패 횟수(pinFailCount)는 컴포넌트 로컬이 아니라 useAppLockStore(persist)에
 * 둔다 — 로컬 useState로 두면 앱을 강제 종료했다 재실행하는 것만으로(이
 * 컴포넌트가 통째로 리마운트되므로) 0으로 리셋돼 "5회 제한"이 무력화된다.
 */
const MAX_PIN_ATTEMPTS = 5;

/** PIN 검증 화면 — 잠금 해제를 위한 PIN 입력 + 시도 횟수 제한. */
function PinVerify() {
  const setAuthenticated = useAppLockStore(state => state.setAuthenticated);
  const sessionTimedOut = useAppLockStore(state => state.sessionTimedOut);
  const setSessionTimedOut = useAppLockStore(state => state.setSessionTimedOut);
  const frozenUntil = useAppLockStore(state => state.frozenUntil);
  const freeze = useAppLockStore(state => state.freeze);
  const failCount = useAppLockStore(state => state.pinFailCount);
  const setFailCount = useAppLockStore(state => state.setPinFailCount);

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isFrozen = frozenUntil != null;

  const handlePressDigit = async (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;

    const nextPin = pin + digit;
    setPin(nextPin);
    if (nextPin.length !== PIN_LENGTH) return;

    let isValid: boolean;
    try {
      isValid = await verifyStoredPin(nextPin);
    } catch {
      // SecureStore 접근 자체가 실패하는(키체인 접근 실패 등) 드문 상황 —
      // try/catch가 없으면 여기서 그냥 멈춘 것처럼 보인다. 이건 "틀린 PIN"이
      // 아니라 시스템 오류이므로, 아래 틀렸을 때와 달리 시도 횟수는 깎지
      // 않는다 — 무관한 오류로 사용자가 얼어붙는(freeze) 위험을 만들면 안 된다.
      setError('PIN 확인에 실패했어요. 다시 시도해주세요.');
      setPin('');
      return;
    }

    if (isValid) {
      setAuthenticated(true);
      setSessionTimedOut(false);
      setError(null);
      setPin('');
      // 다음번에 다시 잠겼을 때 이전 실패 이력이 남아있으면 안 되므로 초기화한다.
      setFailCount(0);
      return;
    }

    setError('PIN이 틀렸어요. 다시 입력해주세요.');
    setPin('');
    setFailCount(count => {
      const nextCount = count + 1;
      if (nextCount >= MAX_PIN_ATTEMPTS) {
        freeze();
      }
      return nextCount;
    });
  };

  const handlePressDelete = () => {
    setPin(current => current.slice(0, -1));
    setError(null);
  };

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white px-6 py-4">
      <View className="items-center gap-2">
        <Text className="text-xl font-bold text-black">
          {sessionTimedOut
            ? `${Math.round(SESSION_TIMEOUT_MS / 60_000)}분 이상 자리를 비우셨네요`
            : 'PIN 번호 입력'}
        </Text>
        <Text className="text-sm text-gray">
          {sessionTimedOut
            ? '보안을 위해 다시 인증을 진행해주세요'
            : '잠금 해제를 위해 PIN을 입력해주세요'}
        </Text>
      </View>

      <PinDots length={pin.length} />

      <Text className="text-xs text-gray">
        남은 시도 횟수 {Math.max(0, MAX_PIN_ATTEMPTS - failCount)}회
      </Text>

      {error && (
        <Text className="text-xs text-[#B3261E]" testID="pin-error">
          {error}
        </Text>
      )}

      <PinKeypad
        onPressDigit={handlePressDigit}
        onPressDelete={handlePressDelete}
        disabled={isFrozen}
      />
    </View>
  );
}

export default PinVerify;
