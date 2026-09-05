import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SecuritySettingsState {
  /** (사용자) 생체인증 선택 여부. false여도 PIN 잠금은 항상 유지된다(정책상 완전 무잠금은 없음). */
  biometricEnabled: boolean;
  /** 보안 설정 온보딩 안내를 마지막으로 거절한 시각(ms). 아직 거절한 적 없으면 null. */
  onboardingDeclinedAt: number | null;
  setBiometricEnabled: (enabled: boolean) => void;
  declineOnboardingToday: () => void;
}

/**
 * 보안 설정값 — 생체인증 토글과 온보딩 거절 기록.
 * 민감한 값(PIN)이 아니라서 SecureStore가 아닌 일반 저장소(AsyncStorage)에 저장
 */
export const useSecuritySettingsStore = create<SecuritySettingsState>()(
  persist(
    set => ({
      biometricEnabled: false,
      onboardingDeclinedAt: null,
      setBiometricEnabled: enabled => set({ biometricEnabled: enabled }),
      declineOnboardingToday: () => set({ onboardingDeclinedAt: Date.now() }),
    }),
    {
      name: 'appLock.securitySettings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
