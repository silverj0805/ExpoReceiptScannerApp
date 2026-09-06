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
          const lockStartedAt = Date.now();
          setPinLockedUntil(lockStartedAt + PIN_LOCKOUT_MS);
          // `now`는 마운트 시점에 한 번 찍고 주기 갱신 effect가 1초 뒤에야 처음 돈다 —
          // 그대로 두면 방금 막 잠긴 순간의 pinLockoutRemainingMs가 PIN_LOCKOUT_MS보다
          // "마운트~잠금 사이에 지난 시간"만큼 더 크게 보인다(실기기 재현으로 확인:
          // 5분이어야 할 카운트다운이 5분 30초로 표시됨). 잠금을 거는 바로 그 시각으로
          // 동기화해서 카운트다운이 정확히 5분부터 시작하게 한다.
          setNow(lockStartedAt);
          // 잠기는 순간 남은 시도 횟수를 5회로 리셋한다(사용자 요구사항) — 부수 효과로
          // 카운트다운이 자연 만료된 뒤에도 "남은 시도 횟수 0회"로 잘못 보이던 문제도
          // 같이 없어진다(usePinLock.test.ts 참고).
          return 0;
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
