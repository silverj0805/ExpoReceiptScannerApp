import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';

interface UseBioAuthResult {
  /**
   * hasHardwareAsync/isEnrolledAsync 확인이 끝났는지. 둘 다 네이티브 비동기 호출이라
   * 마운트 직후엔 무조건 false로 시작한다 — 이 값을 안 보고 isSupported/isEnrolled를
   * 바로 판단하면, 실제로 지원되는 기기에서도 첫 프레임엔 "지원 안 됨"으로 오판하게
   * 된다(useAppLockStore의 hasHydrated와 같은 이유).
   */
  isReady: boolean;
  /** 기기에 지문/얼굴 인식 센서가 있는지. */
  isSupported: boolean;
  /** 그 센서에 실제로 생체 정보가 등록돼 있는지. */
  isEnrolled: boolean;
  /** 생체인증을 시도한다. expo-local-authentication의 결과를 그대로 반환한다. */
  authenticate: () => Promise<LocalAuthentication.LocalAuthenticationResult>;
}

/**
 * 생체인증 하드웨어 감지·호출만 담당하는 얇은 훅  
 */
function useBioAuth(): UseBioAuthResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]).then(([hasHardware, enrolled]) => {
      setIsSupported(hasHardware);
      setIsEnrolled(enrolled);
      setIsReady(true);
    });
  }, []);

  const authenticate = useCallback(() => {
    return LocalAuthentication.authenticateAsync({
      promptMessage: '잠금을 해제하려면 인증해주세요',
    });
  }, []);

  return { isReady, isSupported, isEnrolled, authenticate };
}

export default useBioAuth;
