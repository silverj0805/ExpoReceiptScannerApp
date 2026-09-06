import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from '@/shared/components/Icon';

import PinVerifyForm from '../pin/components/PinVerifyForm';
import { useSecuritySettingsStore } from '../settings/store/useSecuritySettingsStore';

interface LockScreenProps {
  /** true면 재잠금(백그라운드 5분 이상 후 복귀), false면 콜드스타트 — 문구만 다르고 나머지 동작은 동일하다. */
  isRelock: boolean;
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
  /** 생체인증을 시도한다. */
  authenticateWithBiometrics: () => Promise<{
    success: boolean;
    isLockedOut: boolean;
  }>;
  /** PIN으로 대체 인증을 시도한다. */
  authenticateWithPin: (pin: string) => Promise<boolean>;
}

type LockMode = 'biometric' | 'pin';

/**
 * 콜드스타트/재잠금 공용 잠금 화면(목업: Main/PinVerify/PinLockedOut).
 * 별도 Bottom Sheet 오버레이를 안 만들고 이 화면 하나를 `isRelock` prop으로 재사용한다
 * (계획 문서 Task 11 "결정" 참고 — 화면 두 벌 유지보수 비용 때문에 폐기된 대안).
 *
 * `useAppLock()`을 여기서 직접 부르지 않고 전부 props로 주입받는다 — 이 훅을 부르는
 * 곳마다 서로 다른 `isLocked`/`hasUnlockedOnce` state 인스턴스가 생기기 때문이다.
 * 실제로 이 화면이 `useAppLock()`을 자체 호출하던 버전에서, PIN 인증에 성공해도
 * (이 화면 자신의 state만 풀리고) 게이트(_layout.tsx)가 들고 있는 별도의
 * `useAppLock()` 인스턴스는 전혀 모른 채로 남아 화면 전환이 영원히 안 되는 버그를
 * 실기기 재현으로 확인했다 — 반드시 게이트 쪽에서 한 번만 호출해서 내려줘야 한다.
 */
function LockScreen({
  isRelock,
  isSupported,
  isEnrolled,
  isPinLockedOut,
  remainingPinAttempts,
  pinLockoutRemainingMs,
  authenticateWithBiometrics,
  authenticateWithPin,
}: LockScreenProps) {
  const biometricEnabled = useSecuritySettingsStore(
    state => state.biometricEnabled,
  );

  // isSupported/isEnrolled: 기기가 생체인증을 할 수 있는가(OS 사실).
  // biometricEnabled: 사용자가 이 앱에서 생체인증을 쓰기로 골랐는가(설정).
  // 셋 다 참이어야 자동 시도 + PIN 화면의 "전환" 옵션이 의미가 있다.
  const canUseBiometric = isSupported && isEnrolled && biometricEnabled;

  const [mode, setMode] = useState<LockMode>(
    canUseBiometric ? 'biometric' : 'pin',
  );

  const attemptBiometric = async () => {
    const result = await authenticateWithBiometrics();
    // OS 레벨 lockout(5회 연속 실패 등)이면 재시도가 무의미하니 PIN으로 자동 전환.
    if (!result.success && result.isLockedOut) {
      setMode('pin');
    }
  };

  useEffect(() => {
    if (canUseBiometric) {
      // attemptBiometric의 setMode 호출은 authenticateWithBiometrics()의 await 이후,
      // 즉 이펙트 실행이 끝난 뒤의 비동기 콜백 안에서만 일어난다 — 이펙트 본문에서 동기적으로
      // setState하는 게 아니라서(react-hooks/set-state-in-effect가 우려하는 케이스가 아님)
      // 안전하다고 판단해 비활성화한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      attemptBiometric();
    }
    // 마운트 시 한 번만 자동 시도 — canUseBiometric 등은 이 화면이 떠 있는 동안 안 바뀐다고 가정.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchToPin = () => setMode('pin');
  const handleSwitchToBiometric = () => {
    setMode('biometric');
    attemptBiometric();
  };

  // 완전 잠금(시도 횟수 초과) 상태에선 "왜 다시 인증하는지"보다 "언제 풀리는지"가 중요해서
  // 목업(PinLockedOut)도 이 문구를 안 보여준다 — 그 외엔 재잠금일 때만 노출.
  const showContextText = isRelock && !(mode === 'pin' && isPinLockedOut);

  const contextText = showContextText && (
    <Text className="rounded-[10px] bg-primary/10 px-2.5 py-1 text-xs text-gray">
      5분 이상 자리를 비우셨어요
    </Text>
  );

  if (mode === 'pin') {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={{ flex: 1 }}
        className="bg-background"
      >
        <View className="flex-1 items-center justify-center gap-3">
          {contextText}
          <PinVerifyForm
            isPinLockedOut={isPinLockedOut}
            remainingPinAttempts={remainingPinAttempts}
            pinLockoutRemainingMs={pinLockoutRemainingMs}
            onSubmitPin={authenticateWithPin}
            onSuccess={() => {}}
            onSwitchToBiometric={
              canUseBiometric ? handleSwitchToBiometric : undefined
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1 }}
      className="bg-background"
    >
      <View className="flex-1 items-center justify-between px-8 py-16">
        <View className="items-center gap-6">
          <View className="h-28 w-28 items-center justify-center rounded-full border-[1.5px] border-primary/20 bg-primary/10">
            <Icon
              name="finger-print"
              size={52}
              colorClassName="accent-primary"
            />
          </View>
          <View className="items-center gap-2">
            <Text className="text-xl font-bold text-black">
              Face ID로 잠금 해제
            </Text>
            <Text className="text-center text-sm leading-relaxed text-gray">
              모으곰이 내 지출 내역을{'\n'}안전하게 보호하고 있어요
            </Text>
            {contextText}
          </View>
        </View>

        <View className="w-full items-center gap-5">
          <TouchableOpacity
            testID="biometric-retry"
            onPress={attemptBiometric}
            className="w-full max-w-[280px] items-center rounded-2xl border-[1.5px] border-primary py-3.5"
          >
            <Text className="text-[15px] font-bold text-primary">
              다시 시도
            </Text>
          </TouchableOpacity>
          <TouchableOpacity testID="switch-to-pin" onPress={handleSwitchToPin}>
            <Text className="text-sm text-gray underline">
              PIN 번호로 할래요
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default LockScreen;
