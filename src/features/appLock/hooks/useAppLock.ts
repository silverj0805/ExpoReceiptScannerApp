import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import useBiometricAuth from '../biometric/hooks/useBiometricAuth';
import usePinLock from '../pin/hooks/usePinLock';

/** 백그라운드로 이 시간 이상 있다가 돌아오면 재인증을 요구한다. */
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface UseAppLockResult {
  /** true면 잠금 화면(풀스크린 오버레이)을 보여줘야 한다. */
  isLocked: boolean;
  /** 기기에 지문/얼굴 인식 센서가 있는지. */
  isSupported: boolean;
  /** 그 센서에 실제로 생체 정보가 등록돼 있는지. */
  isEnrolled: boolean;
  /** PIN 시도 횟수 제한에 걸려 있는지. */
  isPinLockedOut: boolean;
  /** 제한에 걸리기까지 남은 시도 횟수. */
  remainingPinAttempts: number;
  /** 제한이 풀리기까지 남은 시간(ms). 걸려 있지 않으면 null. */
  pinLockoutRemainingMs: number | null;
  /** 생체인증을 시도한다. 성공하면 잠금을 풀고 true를 반환한다. */
  authenticateWithBiometrics: () => Promise<boolean>;
  /** PIN으로 대체 인증을 시도한다. 시도 횟수 제한에 걸려 있으면 검증 자체를 하지 않는다. */
  authenticateWithPin: (pin: string) => Promise<boolean>;
}

/**
 * 앱 전체 잠금 오케스트레이션:
 * useBiometricAuth(생체인증)와 usePinLock(PIN)을 조합해서
 * isLocked(잠금 여부)와 5분 이상 백그라운드 후 재인증 트리거만 책임지는
 * 세션 오케스트레이션 훅.
 *
 * 실제 인증 수단(생체인증/PIN)은 각자의 훅(useBiometricAuth/usePinLock)에 위임하고,
 * 이 훅은 "잠금 여부"와 "언제 다시 잠글지(세션 타임아웃)"만 책임진다.
 */
function useAppLock(): UseAppLockResult {
  const [isLocked, setIsLocked] = useState(true);
  const backgroundedAtRef = useRef<number | null>(null);

  const biometric = useBiometricAuth();
  const pinLock = usePinLock();

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        backgroundedAtRef.current = Date.now();
        return;
      }
      if (nextState === 'active') {
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (
          backgroundedAt != null &&
          Date.now() - backgroundedAt >= SESSION_TIMEOUT_MS
        ) {
          setIsLocked(true);
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  const authenticateWithBiometrics = useCallback(async () => {
    const success = await biometric.authenticate();
    if (success) {
      setIsLocked(false);
      pinLock.reset();
    }
    return success;
  }, [biometric, pinLock]);

  const authenticateWithPin = useCallback(
    async (pin: string) => {
      const success = await pinLock.authenticate(pin);
      if (success) {
        setIsLocked(false);
      }
      return success;
    },
    [pinLock],
  );

  return {
    isLocked, // true면 잠금 오버레이를 띄워야 함
    isSupported: biometric.isSupported, // 생체인증 하드웨어 지원 여부
    isEnrolled: biometric.isEnrolled, // 생체인증 하드웨어 상태
    isPinLockedOut: pinLock.isPinLockedOut, // 제한까지 남은 시도 횟수
    remainingPinAttempts: pinLock.remainingPinAttempts, // 제한 해제까지 남은 시간(ms)
    pinLockoutRemainingMs: pinLock.pinLockoutRemainingMs,
    authenticateWithBiometrics,
    authenticateWithPin,
  };
}

export default useAppLock;
