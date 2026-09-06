import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UseAppLockState {
  /** 잠금 설정 여부(무잠금/잠금). 사용자가 설정 화면에서 켜고 끈다. */
  isLockSetUp: boolean;
  /** 홈 온보딩 모달을 마지막으로 거절한 시각(ms). 거절한 적 없으면 null. */
  declinedAt: number | null;
  setLockSetUp: (enabled: boolean) => void;
  declineToday: () => void;
  /**
   * 인증을 시도한다. 지금은 실제 생체인증 없이 항상 성공하는 빈 껍데기다 —
   * 이 자리에 나중에 진짜 생체인증 로직이 들어간다(다음 작업).
   */
  auth: () => Promise<boolean>;
}

/**
 * 앱 전체 잠금 오케스트레이션 훅
 */
export const useAppLock = create<UseAppLockState>()(
  persist(
    set => ({
      isLockSetUp: false,
      declinedAt: null,
      setLockSetUp: enabled => set({ isLockSetUp: enabled }),
      declineToday: () => set({ declinedAt: Date.now() }),
      auth: async () => true,
    }),
    {
      name: 'appLock.useAppLock',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
