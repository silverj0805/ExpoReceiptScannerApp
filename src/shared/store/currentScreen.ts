import { create } from 'zustand';

interface CurrentScreenState {
  currentScreen: string | null;
  setCurrentScreen: (screen: string | null) => void;
}

/**
 * 현재 화면 이름을 전역으로 들고 있는 스토어
 * React 트리 밖(axios interceptor, crashlyticsRecorder 등)에서도
 * getState()로 "지금 어느 화면인지" 참조하기 위함
 */
export const useCurrentScreenStore = create<CurrentScreenState>(set => ({
  currentScreen: null,
  setCurrentScreen: screen => set({ currentScreen: screen }),
}));
