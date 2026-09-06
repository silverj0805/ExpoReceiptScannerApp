import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

import { useAppLock } from './useAppLock';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppLock.setState({ isLockSetUp: false, declinedAt: null });
  // 이전 테스트에서 쓴 값이 남아있다가 나중에 비동기로 rehydrate되며 덮어쓰는 걸 방지 —
  // 스토리지를 비운 뒤 명시적으로 한 번 재수화시켜 매 테스트를 결정론적으로 시작한다.
  await useAppLock.persist.rehydrate();
});

test('초기값은 무잠금, 온보딩 거절 기록 없음이다', () => {
  const state = useAppLock.getState();

  expect(state.isLockSetUp).toBe(false);
  expect(state.declinedAt).toBeNull();
});

test('setLockSetUp(true)를 호출하면 값이 반영된다', () => {
  useAppLock.getState().setLockSetUp(true);

  expect(useAppLock.getState().isLockSetUp).toBe(true);
});

test('setLockSetUp(false)를 호출하면 값이 반영된다', () => {
  useAppLock.getState().setLockSetUp(true);

  useAppLock.getState().setLockSetUp(false);

  expect(useAppLock.getState().isLockSetUp).toBe(false);
});

test('declineToday를 호출하면 현재 시각이 declinedAt에 기록된다', () => {
  const before = Date.now();

  useAppLock.getState().declineToday();

  const after = Date.now();
  const declinedAt = useAppLock.getState().declinedAt;

  expect(declinedAt).not.toBeNull();
  expect(declinedAt as number).toBeGreaterThanOrEqual(before);
  expect(declinedAt as number).toBeLessThanOrEqual(after);
});

test('상태가 바뀌면 실제로 AsyncStorage에 저장된다', async () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  useAppLock.getState().setLockSetUp(true);

  await waitFor(() => {
    expect(setItemMock).toHaveBeenCalled();
  });

  const [, savedRaw] =
    setItemMock.mock.calls[setItemMock.mock.calls.length - 1];
  expect(JSON.parse(savedRaw).state.isLockSetUp).toBe(true);
});

// auth()는 지금은 실제 생체인증 없이 항상 성공하는 빈 껍데기다 — 진짜 인증 로직은
// 나중 작업에서 이 자리를 교체한다.
test('auth()는 지금은 항상 true로 해결되는 빈 껍데기다', async () => {
  const result = await useAppLock.getState().auth();

  expect(result).toBe(true);
});
