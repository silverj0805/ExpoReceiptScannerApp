import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

import { useSecuritySettingsStore } from './useSecuritySettingsStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  useSecuritySettingsStore.setState({
    biometricEnabled: false,
    onboardingDeclinedAt: null,
  });
  // 이전 테스트에서 쓴 값이 남아있다가 나중에 비동기로 rehydrate되며 덮어쓰는 걸 방지 —
  // 스토리지를 비운 뒤 명시적으로 한 번 재수화시켜 매 테스트를 결정론적으로 시작한다.
  await useSecuritySettingsStore.persist.rehydrate();
});

test('초기값은 생체인증 꺼짐, 온보딩 거절 기록 없음이다', () => {
  const state = useSecuritySettingsStore.getState();

  expect(state.biometricEnabled).toBe(false);
  expect(state.onboardingDeclinedAt).toBeNull();
});

test('setBiometricEnabled(true)를 호출하면 값이 반영된다', () => {
  useSecuritySettingsStore.getState().setBiometricEnabled(true);

  expect(useSecuritySettingsStore.getState().biometricEnabled).toBe(true);
});

test('declineOnboardingToday를 호출하면 현재 시각이 onboardingDeclinedAt에 기록된다', () => {
  const before = Date.now();

  useSecuritySettingsStore.getState().declineOnboardingToday();

  const after = Date.now();
  const declinedAt = useSecuritySettingsStore.getState().onboardingDeclinedAt;

  expect(declinedAt).not.toBeNull();
  expect(declinedAt as number).toBeGreaterThanOrEqual(before);
  expect(declinedAt as number).toBeLessThanOrEqual(after);
});

test('상태가 바뀌면 실제로 AsyncStorage에 저장된다', async () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  useSecuritySettingsStore.getState().setBiometricEnabled(true);

  await waitFor(() => {
    expect(setItemMock).toHaveBeenCalled();
  });

  const [, savedRaw] =
    setItemMock.mock.calls[setItemMock.mock.calls.length - 1];
  expect(JSON.parse(savedRaw).state.biometricEnabled).toBe(true);
});
