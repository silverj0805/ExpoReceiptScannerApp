import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UseAppLockState {
  /** 잠금 설정 여부(무잠금/잠금). 사용자가 설정 화면에서 켜고 끈다. */
  isLockSetUp: boolean;
  /** 홈 온보딩 모달을 마지막으로 거절한 시각(ms). 거절한 적 없으면 null. */
  declinedAt: number | null;
  /**
   * persist가 AsyncStorage에서 실제 값을 다 읽어왔는지 여부. 콜드 스타트 시
   * 스토어는 이 값이 채워지기 전까지 먼저 초기값(isLockSetUp: false)으로 생성되므로,
   * 하이드레이션 전에 isLockSetUp만 보면 실제로 잠금 설정이 돼 있어도 무잠금으로
   * 오판할 수 있다 — 이 틈에 게이트가 메인 화면을 새어 보여주지 않도록 구분해서 쓴다.
   */
  hasHydrated: boolean;
  /**
   * 이번 세션에서 이미 인증(또는 인증에 준하는 확인)을 통과했는지. 앱을 재시작하면
   * 다시 인증해야 하므로 절대 영속화되지 않는다(아래 persist의 partialize 참고).
   * AppLockGate가 이 값을 구독해서, false일 때만 잠금 화면을 그린다.
   */
  authenticated: boolean;
  /**
   * 이번 세션에서 마지막으로 백그라운드로 전환된 시각(ms). 포그라운드면 null.
   * authenticated와 같은 이유로 절대 영속화되지 않는다 — 앱을 재시작하면
   * authenticated가 어차피 다시 false로 시작해서 이 값이 관여할 필요가 없다.
   */
  backgroundStartedAt: number | null;
  /**
   * 방금 세션 타임아웃 때문에 재인증이 필요해졌는지. AuthVerify가 이 값을 보고
   * "자리를 비우셨네요" 안내 문구를 보여줄지 정한다 — 앱을 막 켰을 때(콜드 스타트)의
   * 평범한 잠금과 구분하기 위함. authenticated/backgroundStartedAt과 같은 이유로
   * 세션 로컬이라 영속화되지 않는다.
   */
  sessionTimedOut: boolean;
  setLockSetUp: (enabled: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setBackgroundStartedAt: (backgroundStartedAt: number | null) => void;
  setSessionTimedOut: (sessionTimedOut: boolean) => void;
  declineToday: () => void;
}

/**
 * 앱 전체 잠금 오케스트레이션 훅
 */
export const useAppLockStore = create<UseAppLockState>()(
  persist(
    set => ({
      isLockSetUp: false,
      declinedAt: null,
      hasHydrated: false,
      authenticated: false,
      backgroundStartedAt: null,
      sessionTimedOut: false,
      setLockSetUp: enabled => set({ isLockSetUp: enabled }),
      setAuthenticated: authenticated => set({ authenticated }),
      setBackgroundStartedAt: backgroundStartedAt =>
        set({ backgroundStartedAt }),
      setSessionTimedOut: sessionTimedOut => set({ sessionTimedOut }),
      declineToday: () => set({ declinedAt: Date.now() }),
    }),
    {
      name: 'appLock.useAppLockStore',
      storage: createJSONStorage(() => AsyncStorage),
      // hasHydrated/authenticated는 둘 다 "이번 실행/세션에서만 유효한" 프로세스 로컬 값이라 저장 대상에서 뺀다
      partialize: state => ({
        isLockSetUp: state.isLockSetUp,
        declinedAt: state.declinedAt,
      }),
      // 하이드레이션이 끝난(또는 실패한) 시점에 hasHydrated를 true로 뒤집는다.
      // 이 콜백은 항상 create() 호출이 끝난 뒤 비동기로 실행되므로, 여기서 참조하는
      // useAppLockStore는 그 시점엔 이미 아래에서 초기화가 끝나 있다.
      onRehydrateStorage: () => () => {
        useAppLockStore.setState({ hasHydrated: true });
      },
    },
  ),
);
