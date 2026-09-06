import { useState, type ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useAppLock } from '../../hooks/useAppLock';

interface AppLockGateProps {
  children: ReactNode;
}

/**
 * 앱 게이트 — 잠금 설정이 켜져 있고 이번 세션에 아직 인증 안 했으면 자식(메인 앱)을
 * 아예 안 그리고 잠금 화면만 그린다(통째로 바꿔치기). 등록된 네비게이션 스크린이나
 * 오버레이(Modal/BottomSheet)가 아니라 조건부 렌더 — 뒤로가기·딥링크로 우회할 라우트
 * 자체가 없고, 지금은 세션 타임아웃 같은 "메인 앱을 띄운 채 위에만 덮어야 하는" 요구사항이
 * 없어서 오버레이일 이유도 없다(그런 요구사항이 생기면 그때 오버레이로 바뀔 수 있음).
 *
 * `authenticated`는 이 세션에서만 유효한 로컬 상태다(재시작하면 다시 인증 필요) —
 * `useAppLock`(영구 저장되는 잠금 설정 자체)과는 별개.
 *
 * 지금은 `auth()`가 실제 생체인증 없이 항상 성공하는 빈 껍데기라, 자동으로 시도하는 대신
 * "인증하기" 버튼을 눌러야 호출되게 해뒀다 — 상태 전환을 눈으로 확인하기 쉽게 하기
 * 위함이고, 나중에 진짜 Face ID가 들어가면 마운트 시 자동 시도로 바꾸면 된다.
 *
 * `hasHydrated`가 true가 되기 전까지는 아무것도 그리지 않는다 — `useAppLock`은
 * AsyncStorage에서 값을 비동기로 읽어오는 persist 스토어라, 콜드 스타트 직후엔
 * 실제로 잠금이 걸려 있어도 아직 초기값(무잠금)만 보이는 짧은 틈이 있다. 그 틈에
 * 메인 화면을 그려버리면 보안 잠금이 새는 것이므로, 값이 확정될 때까지 기다린다.
 */
function AppLockGate({ children }: AppLockGateProps) {
  const isLockSetUp = useAppLock(state => state.isLockSetUp);
  const hasHydrated = useAppLock(state => state.hasHydrated);
  const auth = useAppLock(state => state.auth);
  const [authenticated, setAuthenticated] = useState(false);

  const handleAuthenticate = async () => {
    const success = await auth();
    if (success) setAuthenticated(true);
  };

  // persist가 AsyncStorage에서 실제 잠금 설정 값을 아직 다 읽어오지 못한 상태다 —
  // 이 시점의 isLockSetUp은 하이드레이션 전 초기값(false)일 뿐 실제 값이 아니므로,
  // 여기서 자식(메인 화면)을 그려버리면 실제로는 잠금이 걸려 있어도 잠깐 노출될 수
  // 있다. 값이 무엇인지 확정되기 전까진 아무것도 그리지 않는다.
  if (!hasHydrated) {
    return null;
  }

  if (isLockSetUp && !authenticated) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background">
        <Text className="text-lg font-bold text-black">
          🔒 잠금 화면 (준비 중)
        </Text>
        <TouchableOpacity
          testID="app-lock-authenticate"
          onPress={handleAuthenticate}
          className="rounded-2xl bg-primary px-6 py-3"
        >
          <Text className="text-[15px] font-bold text-white">인증하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

export default AppLockGate;
