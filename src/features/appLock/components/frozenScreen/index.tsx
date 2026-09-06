import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import { useAppLockStore } from '../../stores/useAppLockStore';

/** ms를 "mm:ss" 형식으로 표시한다. */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 인증을 너무 많이 틀려 얼어붙은 동안 보여주는 화면 — AppLockGate가 frozenUntil이
 * 설정돼 있을 때만 그린다. UI는 구 feat/appLock의 PinLockedOut(PinVerifyForm의
 * isPinLockedOut 분기) 레이아웃을 재활용하되, 키패드와 PIN 문구는 없앴다.
 *
 * frozenUntil은 절대 시각이라 앱을 껐다 켜도(재하이드레이션돼도) 남은 시간이 정확히
 * 이어진다. 카운트다운 자체는 1초마다 로컬 상태를 갱신해서 화면만 다시 그리는
 * 것이고, frozenUntil 자체는 카운트다운이 끝나도 자동으로 안 풀린다 — 사용자가
 * "인증 다시 시도하기"를 직접 눌러야 풀린다(눌러야만 다음 화면으로 넘어가게 하려는
 * 의도적 선택).
 */
function FrozenScreen() {
  const frozenUntil = useAppLockStore(state => state.frozenUntil);
  const unfreeze = useAppLockStore(state => state.unfreeze);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, (frozenUntil ?? 0) - now);
  const countdownDone = remainingMs <= 0;

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full border-[1.5px] border-[rgba(179,38,30,0.2)] bg-[rgba(179,38,30,0.08)]">
        <Icon name="lock-closed" size={36} color="#B3261E" />
      </View>
      <View className="items-center gap-2">
        <Text className="text-xl font-bold text-black">인증이 잠겼어요</Text>
        <Text className="text-center text-sm leading-relaxed text-gray">
          너무 많이 틀렸어요{'\n'}아래 시간이 지나면 다시 시도할 수 있어요
        </Text>
      </View>

      <Text className="text-[40px] font-bold tracking-[1px] text-black">
        {formatCountdown(remainingMs)}
      </Text>

      <Text className="text-xs text-gray">시간 후에 다시 시도해주세요</Text>

      <TouchableOpacity
        testID="frozen-retry"
        disabled={!countdownDone}
        onPress={unfreeze}
        className={`w-full max-w-70 items-center rounded-2xl border-[1.5px] border-primary py-3.5 ${
          countdownDone ? '' : 'opacity-40'
        }`}
      >
        <Text className="text-[15px] font-bold text-primary">
          인증 다시 시도하기
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default FrozenScreen;
