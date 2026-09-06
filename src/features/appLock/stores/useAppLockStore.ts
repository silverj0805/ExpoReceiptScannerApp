import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UseAppLockState {
  /** 잠금 설정 여부(무잠금/잠금). 사용자가 설정 화면에서 켜고 끈다. */
  isLockSetUp: boolean;
  /**
   * 잠금 방식. 생체인증을 선택했더라도 PIN은 대체제로 항상 등록돼 있어야 하지만,
   * 실제로 어느 쪽을 우선(기본) 인증 수단으로 쓸지는 이 값으로 결정한다. 값
   * 자체는 민감하지 않아(PIN 번호 자체가 아니라 "방식" 선택일 뿐) isLockSetUp과
   * 같이 AsyncStorage에 영속화된다 — PIN 값 자체는 별도로 만들 SecureStore 기반
   * pinStorage.ts가 담당한다. null은 "아직 방식을 고르지 않음"을 뜻하고, 지원
   * 여부에 따른 디폴트 결정(생체 지원 시 bio, 아니면 pin)은 이 스토어가 아니라
   * 설정 화면 쪽 책임이다.
   */
  lockType: 'bio' | 'pin' | null;
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
  /**
   * 인증을 너무 많이 틀려서(OS가 lockout으로 판단) 언제까지 얼어붙어 있는지 나타내는
   * 절대 시각(ms). 얼어붙어 있지 않으면 null. authenticated와 반대로 반드시
   * 영속화돼야 한다 — 앱을 껐다 켜서 그 틈을 타 우회하면 안 되기 때문이다.
   */
  frozenUntil: number | null;
  setLockSetUp: (enabled: boolean) => void;
  setLockType: (lockType: 'bio' | 'pin' | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setBackgroundStartedAt: (backgroundStartedAt: number | null) => void;
  setSessionTimedOut: (sessionTimedOut: boolean) => void;
  declineToday: () => void;
  /** 지금부터 FREEZE_DURATION_MS 동안 얼어붙는다. */
  freeze: () => void;
  /** 얼어붙은 상태를 해제한다. */
  unfreeze: () => void;
}

/**
 * 얼어붙는 지속 시간. 생체인증은 PIN과 달리 우리가 직접 실패 횟수를 세지 않고
 * OS가 자체적으로 lockout 여부를 판단해서 알려주므로(expo-local-authentication의
 * 'lockout' 에러), 그 신호를 받았을 때 우리 쪽에서 독자적으로 거는 쿨다운 시간이다.
 * 테스트 중엔 매번 몇 분씩 기다릴 수 없어 개발 빌드에서만 짧게 잡는다.
 */
export const FREEZE_DURATION_MS = __DEV__ ? 10_000 : 3 * 60_000;

/**
 * 앱 전체 잠금 오케스트레이션 훅
 */
export const useAppLockStore = create<UseAppLockState>()(
  persist(
    set => ({
      isLockSetUp: false,
      lockType: null,
      declinedAt: null,
      hasHydrated: false,
      authenticated: false,
      backgroundStartedAt: null,
      sessionTimedOut: false,
      frozenUntil: null,
      setLockSetUp: enabled => set({ isLockSetUp: enabled }),
      setLockType: lockType => set({ lockType }),
      setAuthenticated: authenticated => set({ authenticated }),
      setBackgroundStartedAt: backgroundStartedAt =>
        set({ backgroundStartedAt }),
      setSessionTimedOut: sessionTimedOut => set({ sessionTimedOut }),
      declineToday: () => set({ declinedAt: Date.now() }),
      freeze: () => set({ frozenUntil: Date.now() + FREEZE_DURATION_MS }),
      unfreeze: () => set({ frozenUntil: null }),
    }),
    {
      name: 'appLock.useAppLockStore',
      storage: createJSONStorage(() => AsyncStorage),
      // hasHydrated/authenticated/backgroundStartedAt/sessionTimedOut은 전부
      // "이번 실행/세션에서만 유효한" 프로세스 로컬 값이라 저장 대상에서 뺀다.
      // frozenUntil은 반대로 반드시 포함해야 한다(재시작으로 우회되면 안 되므로).
      partialize: state => ({
        isLockSetUp: state.isLockSetUp,
        lockType: state.lockType,
        declinedAt: state.declinedAt,
        frozenUntil: state.frozenUntil,
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
