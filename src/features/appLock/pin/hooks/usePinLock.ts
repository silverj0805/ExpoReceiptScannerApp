import { useCallback, useEffect, useState } from 'react';

import { verifyStoredPin } from '../utils/pinStorage';

/**
 * PIN 시도 횟수 제한(rate limiting)이 실질적인 1차 방어선.
 */
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

interface UsePinLockResult {
  /** PIN 시도 횟수 제한에 걸려 있는지. */
  isPinLockedOut: boolean;
  /** 제한에 걸리기까지 남은 시도 횟수. */
  remainingPinAttempts: number;
  /** 제한이 풀리기까지 남은 시간(ms). 걸려 있지 않으면 null. */
  pinLockoutRemainingMs: number | null;
  /** PIN을 검증한다. 시도 횟수 제한에 걸려 있으면 검증 자체를 하지 않는다. */
  authenticate: (pin: string) => Promise<boolean>;
  /** 실패 횟수·잠금을 초기화한다(예: 생체인증으로 성공했을 때). */
  reset: () => void;
}

/** PIN 검증 + 시도 횟수 제한만 담당한다. 잠금 상태 관리는 상위(useAppLock)의 책임. */
function usePinLock(): UsePinLockResult {
  const [pinFailCount, setPinFailCount] = useState(0);
  const [pinLockedUntil, setPinLockedUntil] = useState<number | null>(null);
  // isPinLockedOut/pinLockoutRemainingMs를 렌더 중에 매번 Date.now()로 직접 계산하면
  // "impure function during render"(react-hooks/purity, React Compiler 규칙)에 걸린다.
  // 대신 잠긴 동안만 주기적으로 상태를 갱신해서, 렌더는 그 상태에서 순수하게 파생시킨다.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (pinLockedUntil === null) return;

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [pinLockedUntil]);

  const isPinLockedOut = pinLockedUntil !== null && now < pinLockedUntil;

  const reset = useCallback(() => {
    setPinFailCount(0);
    setPinLockedUntil(null);
  }, []);

  const authenticate = useCallback(
    async (pin: string) => {
      if (pinLockedUntil !== null && Date.now() < pinLockedUntil) {
        return false;
      }

      const isValid = await verifyStoredPin(pin);
      if (isValid) {
        reset();
        return true;
      }

      setPinFailCount(count => {
        const nextCount = count + 1;
        if (nextCount >= MAX_PIN_ATTEMPTS) {
          setPinLockedUntil(Date.now() + PIN_LOCKOUT_MS);
        }
        return nextCount;
      });
      return false;
    },
    [pinLockedUntil, reset],
  );

  return {
    isPinLockedOut,
    remainingPinAttempts: Math.max(0, MAX_PIN_ATTEMPTS - pinFailCount),
    pinLockoutRemainingMs: isPinLockedOut
      ? (pinLockedUntil as number) - now
      : null,
    authenticate,
    reset,
  };
}

export default usePinLock;
