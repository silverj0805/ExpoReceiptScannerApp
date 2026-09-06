import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

import { useAppLockStore } from './useAppLockStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppLockStore.setState({
    isLockSetUp: false,
    declinedAt: null,
    authenticated: false,
  });
  // 이전 테스트에서 쓴 값이 남아있다가 나중에 비동기로 rehydrate되며 덮어쓰는 걸 방지 —
  // 스토리지를 비운 뒤 명시적으로 한 번 재수화시켜 매 테스트를 결정론적으로 시작한다.
  await useAppLockStore.persist.rehydrate();
});

test('초기값은 무잠금, 온보딩 거절 기록 없음이다', () => {
  const state = useAppLockStore.getState();

  expect(state.isLockSetUp).toBe(false);
  expect(state.declinedAt).toBeNull();
});

test('setLockSetUp(true)를 호출하면 값이 반영된다', () => {
  useAppLockStore.getState().setLockSetUp(true);

  expect(useAppLockStore.getState().isLockSetUp).toBe(true);
});

test('setLockSetUp(false)를 호출하면 값이 반영된다', () => {
  useAppLockStore.getState().setLockSetUp(true);

  useAppLockStore.getState().setLockSetUp(false);

  expect(useAppLockStore.getState().isLockSetUp).toBe(false);
});

test('declineToday를 호출하면 현재 시각이 declinedAt에 기록된다', () => {
  const before = Date.now();

  useAppLockStore.getState().declineToday();

  const after = Date.now();
  const declinedAt = useAppLockStore.getState().declinedAt;

  expect(declinedAt).not.toBeNull();
  expect(declinedAt as number).toBeGreaterThanOrEqual(before);
  expect(declinedAt as number).toBeLessThanOrEqual(after);
});

test('상태가 바뀌면 실제로 AsyncStorage에 저장된다', async () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  useAppLockStore.getState().setLockSetUp(true);

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
  const result = await useAppLockStore.getState().auth();

  expect(result).toBe(true);
});

// persist는 AsyncStorage에서 값을 비동기로 읽어온다 — 콜드 스타트 시 실제 값이
// 무엇이든 하이드레이션이 끝나기 전엔 그걸 반영 못 한 초기값(isLockSetUp: false)만
// 보인다. hasHydrated로 "아직 실제 값을 모른다"는 상태를 구분해야, 게이트가 그 틈에
// 진짜 잠금 상태를 무잠금으로 착각해 메인 화면을 새어 보여주는 걸 막을 수 있다.
test('하이드레이션이 끝나기 전에는 hasHydrated가 false다', () => {
  useAppLockStore.setState({ hasHydrated: false });

  expect(useAppLockStore.getState().hasHydrated).toBe(false);
});

test('rehydrate가 끝나면 hasHydrated가 true로 바뀐다', async () => {
  useAppLockStore.setState({ hasHydrated: false });

  await useAppLockStore.persist.rehydrate();

  expect(useAppLockStore.getState().hasHydrated).toBe(true);
});

// authenticated는 "이번 세션에서 이미 인증했는지"를 나타내는 세션 로컬 값이다 —
// 앱을 재시작하면 다시 인증해야 하므로 절대 영속화되면 안 된다.
test('초기값은 인증되지 않은 상태다', () => {
  expect(useAppLockStore.getState().authenticated).toBe(false);
});

test('setAuthenticated(true)를 호출하면 값이 반영된다', () => {
  useAppLockStore.getState().setAuthenticated(true);

  expect(useAppLockStore.getState().authenticated).toBe(true);
});

test('authenticated는 AsyncStorage에 저장되지 않는다(세션 로컬)', async () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  useAppLockStore.getState().setAuthenticated(true);

  await waitFor(() => {
    expect(setItemMock).toHaveBeenCalled();
  });

  const [, savedRaw] =
    setItemMock.mock.calls[setItemMock.mock.calls.length - 1];
  expect(JSON.parse(savedRaw).state.authenticated).toBeUndefined();
});
