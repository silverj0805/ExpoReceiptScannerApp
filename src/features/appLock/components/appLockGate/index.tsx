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
 */
function AppLockGate({ children }: AppLockGateProps) {
  const isLockSetUp = useAppLock(state => state.isLockSetUp);
  const auth = useAppLock(state => state.auth);
  const [authenticated, setAuthenticated] = useState(false);

  const handleAuthenticate = async () => {
    const success = await auth();
    if (success) setAuthenticated(true);
  };

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
