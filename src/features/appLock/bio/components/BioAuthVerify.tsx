import type { LocalAuthenticationError } from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import { SESSION_TIMEOUT_MS } from '../../hooks/useSessionTimeout';
import { hasPinSet } from '../../pin/utils';
import { useAppLockStore } from '../../stores/useAppLockStore';
import useBioAuth from '../hooks/useBioAuth';

// disableDeviceFallback을 안 켜기로 해서(기본값 false), 생체인증을 여러 번 틀려도
// OS가 'lockout'을 우리에게 주기 전에 자기 자신의 기기 패스코드 화면을 먼저 띄워서
// 가로챈다(expo-local-authentication의 disableDeviceFallback 옵션 문서에 명시,
// 실기기로도 확인) — 그래서 'lockout'도 여기서 그냥 일반 에러로 취급한다.
function mapErrorMessage(error: LocalAuthenticationError | undefined): string {
  if (error === 'not_enrolled' || error === 'not_available') {
    return '이 기기에서는 생체인증을 쓸 수 없어요';
  }
  return '인증에 실패했어요. 다시 시도해주세요';
}

interface BioAuthVerifyProps {
  /**
   * PIN 대체 인증으로 전환하고 싶을 때 호출된다(AppLockGate가 PinVerify로
   * 바꿔 그리는 걸 담당). 등록된 PIN이 있을 때만 전환 버튼을 보여준다 — 안
   * 넘기면(또는 PIN이 없으면) 버튼 자체를 숨긴다.
   */
  onUsePinInstead?: () => void;
}

/**
 * 잠금 화면에서 실제로 생체인증을 수행하는 화면 — AppLockGate가 잠긴 상태일 때만 이 화면을 그린다.
 *
 * 생체인증 자체를 못 쓰는 기기(하드웨어 없음/미등록)는 아래 `canUseBiometric`
 * 분기가 이미 자동으로 통과시킨다(iOS 시뮬레이터로 실측 확인) — 그 경우엔
 * 애초에 이 화면(잠금 화면) 자체가 뜨지 않으므로 "PIN으로 전환"할 대상이
 * 없다. 아래 "PIN으로 입력" 버튼은 하드웨어는 있어서 이 화면까지 왔는데
 * 반복 실패하는 상황(마스크·젖은 손·카메라 이물질 등)을 위한 것이다.
 */
function BioAuthVerify({ onUsePinInstead }: BioAuthVerifyProps) {
  const { isReady, isSupported, isEnrolled, authenticate } = useBioAuth();
  const setAuthenticated = useAppLockStore(state => state.setAuthenticated);
  const sessionTimedOut = useAppLockStore(state => state.sessionTimedOut);
  const setSessionTimedOut = useAppLockStore(state => state.setSessionTimedOut);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 생체인증을 골랐어도 PIN은 대체 수단으로 함께 등록되도록 강제하지만(등록
  // 화면에서), 이 컴포넌트가 직접 확인하지 않으면 "PIN이 실제로 있는지"를 알
  // 방법이 없다 — 이 기능 이전부터 생체인증만으로 잠가둔 사용자(PIN 미등록)에게
  // 버튼을 보여주면 눌러도 통과 못 하는 화면으로 보내는 셈이라, 실제로 있을
  // 때만 보여줘야 한다.
  const [pinAvailable, setPinAvailable] = useState(false);

  const canUseBiometric = isSupported && isEnrolled;

  const handleAuthenticate = async () => {
    setErrorMessage(null);
    const result = await authenticate();
    if (result.success) {
      setAuthenticated(true);
      // 세션 타임아웃으로 뜬 안내였다면, 다음번엔(콜드 스타트 등) 다시 안 뜨게 정리한다.
      setSessionTimedOut(false);
    } else {
      setErrorMessage(mapErrorMessage(result.error));
    }
  };

  useEffect(() => {
    if (!isReady) return;

    if (!canUseBiometric) {
      setAuthenticated(true);
      setSessionTimedOut(false);
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

  useEffect(() => {
    let cancelled = false;
    hasPinSet().then(result => {
      if (!cancelled) {
        setPinAvailable(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
            {sessionTimedOut
              ? `${Math.round(SESSION_TIMEOUT_MS / 60_000)}분 이상 자리를 비우셨네요`
              : '생체인증으로 잠금 해제'}
          </Text>

          <Text className="text-center text-sm leading-relaxed text-gray">
            {sessionTimedOut
              ? '보안을 위해 다시 인증을 진행해주세요'
              : '모으곰이 내 지출 내역을\n안전하게 보호하고 있어요'}
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

      <View className="w-full max-w-70 gap-2">
        <TouchableOpacity
          testID="auth-verify-retry"
          onPress={handleAuthenticate}
          className="items-center rounded-2xl border-[1.5px] border-primary py-3.5"
        >
          <Text className="text-[15px] font-bold text-primary">다시 시도</Text>
        </TouchableOpacity>

        {pinAvailable && onUsePinInstead && (
          <TouchableOpacity
            testID="auth-verify-use-pin"
            onPress={onUsePinInstead}
            className="items-center py-2.5"
          >
            <Text className="text-sm font-medium text-gray">
              PIN으로 입력할게요
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default BioAuthVerify;
