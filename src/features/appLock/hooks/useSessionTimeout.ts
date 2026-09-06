import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAppLockStore } from '../stores/useAppLockStore';

/**
 * 백그라운드에 이만큼 이상 있었다면 복귀 시 재인증을 요구한다.
 * 실기기 테스트 중이라 지금은 1분으로 줄여둔 상태 — 실제 배포 값은 5분(5 * 60 * 1000).
 */
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 앱이 백그라운드에 5분 이상 있다가 돌아오면 다시 인증하게 만드는 훅 —
 * 잠금을 켜둔 유저에 한정된다(AppLockGate에서 딱 한 번만 마운트해서 쓴다).
 *
 * backgroundStartedAt/authenticated/sessionTimedOut은 전부 useAppLockStore
 * (공유 스토어)에 있다 — 이 훅 자신은 로컬 상태를 하나도 들지 않는다. AppLockGate의
 * authenticated를 세션 로컬 useState로 뒀다가 SecuritySection처럼 다른 컴포넌트가
 * 건드려야 하는 순간 깨졌던 것과 같은 이유로, 이 훅을 여러 곳에서 불러도 매번
 * 독립된 상태 인스턴스가 생기지 않게 하려면 상태 자체를 스토어에 둬야 한다.
 */
function useSessionTimeout() {
  const isLockSetUp = useAppLockStore(state => state.isLockSetUp);

  useEffect(() => {
    if (!isLockSetUp) {
      return;
    }

    const subscription = AppState.addEventListener('change', nextState => {
      const {
        backgroundStartedAt,
        setBackgroundStartedAt,
        setAuthenticated,
        setSessionTimedOut,
      } = useAppLockStore.getState();

      if (nextState === 'background') {
        setBackgroundStartedAt(Date.now());
        return;
      }

      if (nextState === 'active') {
        // 조건 충족 여부와 무관하게 항상 초기화한다 — 안 그러면 짧게 여러 번
        // 왔다갔다 한 시간이 합산돼서 잘못 5분으로 잡힐 수 있다.
        if (
          backgroundStartedAt != null &&
          Date.now() - backgroundStartedAt >= SESSION_TIMEOUT_MS
        ) {
          setAuthenticated(false);
          // AuthVerify가 이 값을 보고 "자리를 비우셨네요" 안내 문구를 보여준다 —
          // 콜드 스타트로 인한 평범한 잠금과 구분하기 위함.
          setSessionTimedOut(true);
        }
        setBackgroundStartedAt(null);
      }
    });

    return () => subscription.remove();
  }, [isLockSetUp]);
}

export default useSessionTimeout;
