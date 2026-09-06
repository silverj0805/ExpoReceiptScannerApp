import type { ReactNode } from 'react';

import useSessionTimeout from '../../hooks/useSessionTimeout';
import { useAppLockStore } from '../../stores/useAppLockStore';
import AuthVerify from '../authVerify';
import FrozenScreen from '../frozenScreen';

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
 * `authenticated`는 `useAppLockStore`에 있지만 persist 대상에서 빠져 있어(하이드레이션
 * 안 됨) 재시작하면 항상 false로 시작한다.
 *
 * 잠긴 상태에서 실제로 인증을 수행하는 화면은 `AuthVerify`다 — 생체인증 호출·자동
 * 시도·에러 메시지 처리를 전부 그쪽 책임으로 두고, 이 게이트는 어떤 화면을 보여줄지
 * 결정하는 조건부 스왑 셸 역할만 한다.
 *
 * 인증을 너무 많이 틀려 OS가 lockout으로 판단하면(AuthVerify가 감지해서
 * useAppLockStore.freeze()를 부름) frozenUntil이 설정되고, 그동안은 AuthVerify
 * 대신 `FrozenScreen`을 보여준다 — 얼어붙은 동안은 재시도 자체를 막는다.
 *
 * `hasHydrated`가 true가 되기 전까지는 아무것도 그리지 않는다 — `useAppLockStore`는
 * AsyncStorage에서 값을 비동기로 읽어오는 persist 스토어라, 콜드 스타트 직후엔
 * 실제로 잠금이 걸려 있어도 아직 초기값(무잠금)만 보이는 짧은 틈이 있다. 그 틈에
 * 메인 화면을 그려버리면 보안 잠금이 새는 것이므로, 값이 확정될 때까지 기다린다.
 *
 * `useSessionTimeout`(백그라운드 5분 이상 시 재인증 요구)도 여기서 딱 한 번만
 * 마운트한다 — 이 훅이 부르는 곳마다 별도 상태 인스턴스가 생기면 안 되는데,
 * 상태 자체를 useAppLockStore에 두고 이 훅은 그걸 갱신만 하므로 여러 곳에서
 * 불러도 안전은 하지만, 굳이 여러 곳에서 리스너를 중복 등록할 이유가 없다.
 */
function AppLockGate({ children }: AppLockGateProps) {
  const isLockSetUp = useAppLockStore(state => state.isLockSetUp);
  const hasHydrated = useAppLockStore(state => state.hasHydrated);
  const authenticated = useAppLockStore(state => state.authenticated);
  const frozenUntil = useAppLockStore(state => state.frozenUntil);

  useSessionTimeout();

  // persist가 AsyncStorage에서 실제 잠금 설정 값을 아직 다 읽어오지 못한 상태다 —
  // 이 시점의 isLockSetUp은 하이드레이션 전 초기값(false)일 뿐 실제 값이 아니므로,
  // 여기서 자식(메인 화면)을 그려버리면 실제로는 잠금이 걸려 있어도 잠깐 노출될 수
  // 있다. 값이 무엇인지 확정되기 전까진 아무것도 그리지 않는다.
  if (!hasHydrated) {
    return null;
  }

  if (isLockSetUp && frozenUntil != null) {
    return <FrozenScreen />;
  }

  if (isLockSetUp && !authenticated) {
    return <AuthVerify />;
  }

  return <>{children}</>;
}

export default AppLockGate;
