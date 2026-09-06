import type { LocalAuthenticationError } from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import useBioAuth from '../../hooks/useBioAuth';
import { useAppLockStore } from '../../stores/useAppLockStore';

function mapErrorMessage(error: LocalAuthenticationError | undefined): string {
  if (error === 'not_enrolled' || error === 'not_available') {
    return '이 기기에서는 생체인증을 쓸 수 없어요';
  }
  if (error === 'lockout') {
    return '너무 자주 실패해서 잠시 후 다시 시도해주세요';
  }
  return '인증에 실패했어요. 다시 시도해주세요';
}

/**
 * 잠금 화면에서 실제로 생체인증을 수행하는 화면 — AppLockGate가 잠긴 상태일 때만 이 화면을 그린다.
 *
 * 생체인증 자체를 못 쓰는 기기(하드웨어 없음/미등록)는 지금은 막지 않고 그냥 통과시킨다
 * — PIN 같은 대체 인증 수단이 아직 없어서(추후 고도화 예정)
 */
function AuthVerify() {
  const { isReady, isSupported, isEnrolled, authenticate } = useBioAuth();
  const setAuthenticated = useAppLockStore(state => state.setAuthenticated);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canUseBiometric = isSupported && isEnrolled;

  const handleAuthenticate = async () => {
    setErrorMessage(null);
    const result = await authenticate();
    if (result.success) {
      setAuthenticated(true);
    } else {
      setErrorMessage(mapErrorMessage(result.error));
    }
  };

  useEffect(() => {
    if (!isReady) return;

    if (!canUseBiometric) {
      setAuthenticated(true);
      return;
    }

    // handleAuthenticate의 setState 호출은 authenticate()의 await 이후, 즉 이펙트
    // 실행이 끝난 뒤의 비동기 콜백 안에서만 일어난다 — 이펙트 본문에서 동기적으로
    // setState하는 게 아니라서(react-hooks/set-state-in-effect가 우려하는 케이스가 아님) 안전하다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleAuthenticate();
    // handleAuthenticate는 매 렌더 새로 만들어지지만 그 안에서 쓰는 authenticate/
    // setAuthenticated는 참조가 안정적이라 굳이 deps에 넣지 않는다
    // isReady가 true로 바뀌는(=하드웨어 확인이 막 끝난) 순간에만 자동으로 한 번 시도한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, canUseBiometric]);

  if (!isReady) {
    return null;
  }

  return (
    <View className="flex-1 items-center justify-between bg-background px-8 py-16">
      <View className="items-center gap-6">
        <View className="h-28 w-28 items-center justify-center rounded-full border-[1.5px] border-primary/20 bg-primary/10">
          <Icon name="finger-print" size={52} colorClassName="accent-primary" />
        </View>
        <View className="items-center gap-2">
          <Text className="text-xl font-bold text-black">
            생체인증으로 잠금 해제
          </Text>
          <Text className="text-center text-sm leading-relaxed text-gray">
            모으곰이 내 지출 내역을{'\n'}안전하게 보호하고 있어요
          </Text>

          {errorMessage && (
            <Text
              testID="auth-verify-error"
              className="text-center text-sm font-medium text-[#B3261E]"
            >
              {errorMessage}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        testID="auth-verify-retry"
        onPress={handleAuthenticate}
        className="w-full max-w-70 items-center rounded-2xl border-[1.5px] border-primary py-3.5"
      >
        <Text className="text-[15px] font-bold text-primary">다시 시도</Text>
      </TouchableOpacity>
    </View>
  );
}

export default AuthVerify;
