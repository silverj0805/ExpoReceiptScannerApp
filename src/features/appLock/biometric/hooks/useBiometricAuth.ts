import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';

interface BiometricAuthenticateResult {
  success: boolean;
  /** OS가 이미 생체인증을 잠근 상태(5회 연속 실패 등)라 이번 시도 자체가 막혔는지. */
  isLockedOut: boolean;
}

interface UseBiometricAuthResult {
  /** 기기에 지문/얼굴 인식 센서가 있는지. */
  isSupported: boolean;
  /** 그 센서에 실제로 생체 정보가 등록돼 있는지. */
  isEnrolled: boolean;
  /** 생체인증을 시도한다. */
  authenticate: () => Promise<BiometricAuthenticateResult>;
}

/** 생체인증 하드웨어 감지·호출만 담당한다. 잠금 상태 관리는 상위(useAppLock)의 책임. */
function useBiometricAuth(): UseBiometricAuthResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(setIsSupported);
    LocalAuthentication.isEnrolledAsync().then(setIsEnrolled);
  }, []);

  const authenticate =
    useCallback(async (): Promise<BiometricAuthenticateResult> => {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '잠금을 해제하려면 인증해주세요',
      });
      if (result.success) {
        return { success: true, isLockedOut: false };
      }
      // 'lockout' — OS가 이미 생체인증을 잠근 상태(실측 확인: expo-local-authentication의
      // LocalAuthenticationError 타입에 정의돼 있음). 이 신호를 그대로 올려서 상위(useAppLock)가
      // PIN 입력으로 자동 전환할 수 있게 한다.
      return { success: false, isLockedOut: result.error === 'lockout' };
    }, []);

  return { isSupported, isEnrolled, authenticate };
}

export default useBiometricAuth;
