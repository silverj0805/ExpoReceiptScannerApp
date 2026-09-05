import { useEffect, useState } from 'react';

import { hasPinSet } from '../../pin/utils/pinStorage';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';

interface UseSecuritySetupStatusResult {
  /** 보안 잠금이 한 번이라도 설정된 적 있는지(PIN 등록됨 또는 생체인증 켜짐). */
  isSecuritySetUp: boolean;
  /** PIN 등록 여부를 SecureStore에서 조회하는 중인지. */
  isLoading: boolean;
}

/**
 * "최초 설정 여부"를 별도 온보딩 플래그가 아니라 실제 보안 상태에서 파생시킨다.
 * PIN이 등록돼 있거나, 생체인증이 켜져 있으면(정책상 PIN도 항상 같이 등록돼 있음) 설정된 것으로 본다.
 */
function useSecuritySetupStatus(): UseSecuritySetupStatusResult {
  const biometricEnabled = useSecuritySettingsStore(
    state => state.biometricEnabled,
  );
  const [pinSet, setPinSet] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    hasPinSet().then(result => {
      if (!cancelled) setPinSet(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isSecuritySetUp: pinSet === true || biometricEnabled,
    isLoading: pinSet === null,
  };
}

export default useSecuritySetupStatus;
