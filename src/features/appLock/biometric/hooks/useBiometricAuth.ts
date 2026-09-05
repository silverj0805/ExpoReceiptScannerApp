import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';

interface UseBiometricAuthResult {
  /** 기기에 지문/얼굴 인식 센서가 있는지. */
  isSupported: boolean;
  /** 그 센서에 실제로 생체 정보가 등록돼 있는지. */
  isEnrolled: boolean;
  /** 생체인증을 시도한다. 성공하면 true를 반환한다. */
  authenticate: () => Promise<boolean>;
}

/** 생체인증 하드웨어 감지·호출만 담당한다. 잠금 상태 관리는 상위(useAppLock)의 책임. */
function useBiometricAuth(): UseBiometricAuthResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(setIsSupported);
    LocalAuthentication.isEnrolledAsync().then(setIsEnrolled);
  }, []);

  const authenticate = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: '잠금을 해제하려면 인증해주세요',
    });
    return result.success;
  }, []);

  return { isSupported, isEnrolled, authenticate };
}

export default useBiometricAuth;
