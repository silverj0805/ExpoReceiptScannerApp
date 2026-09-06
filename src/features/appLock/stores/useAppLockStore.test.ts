import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

import { FREEZE_DURATION_MS, useAppLockStore } from './useAppLockStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppLockStore.setState({
    isLockSetUp: false,
    lockType: null,
    declinedAt: null,
    authenticated: false,
    backgroundStartedAt: null,
    sessionTimedOut: false,
    frozenUntil: null,
    pinFailCount: 0,
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

// lockType은 "생체/핀 중 어떤 방식으로 잠글지"를 나타내는 비민감 설정값이다 —
// PIN 값 자체(민감값)와 달리 SecureStore로 뺄 이유가 없어 isLockSetUp과 같은
// 이유로 AsyncStorage에 영속화된다. 초기값 null은 "아직 방식을 고르지 않음"을
// 뜻하고, 실제 디폴트 결정(생체 지원 여부에 따라 bio/pin 중 뭘 고를지)은 이
// 스토어가 아니라 그 값을 쓰는 설정 화면 쪽 책임이다.
test('초기값은 lockType이 null이다(아직 방식을 고르지 않음)', () => {
  expect(useAppLockStore.getState().lockType).toBeNull();
});

test('setLockType("bio")를 호출하면 값이 반영된다', () => {
  useAppLockStore.getState().setLockType('bio');

  expect(useAppLockStore.getState().lockType).toBe('bio');
});

test('setLockType("pin")를 호출하면 값이 반영된다', () => {
  useAppLockStore.getState().setLockType('pin');

  expect(useAppLockStore.getState().lockType).toBe('pin');
});

test('setLockType(null)을 호출하면 초기화된다', () => {
  useAppLockStore.getState().setLockType('bio');

  useAppLockStore.getState().setLockType(null);

  expect(useAppLockStore.getState().lockType).toBeNull();
});

test('lockType은 AsyncStorage에 저장된다(비민감값이라 PIN과 달리 여기 둔다)', async () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  useAppLockStore.getState().setLockType('pin');

  await waitFor(() => {
    expect(setItemMock).toHaveBeenCalled();
  });

  const [, savedRaw] =
    setItemMock.mock.calls[setItemMock.mock.calls.length - 1];
  expect(JSON.parse(savedRaw).state.lockType).toBe('pin');
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

// backgroundStartedAt은 "이번 세션에서 언제 백그라운드로 나갔는지"를 나타내는
// 세션 로컬 값이다 — 앱을 재시작하면(콜드 스타트) authenticated가 어차피 다시
// false로 시작해서 이 값이 관여할 필요가 없어지므로, 절대 영속화되면 안 된다.
test('초기값은 백그라운드로 나간 적 없는 상태다', () => {
  expect(useAppLockStore.getState().backgroundStartedAt).toBeNull();
});

test('setBackgroundStartedAt(값)을 호출하면 반영된다', () => {
  useAppLockStore.getState().setBackgroundStartedAt(12345);

  expect(useAppLockStore.getState().backgroundStartedAt).toBe(12345);
});

test('setBackgroundStartedAt(null)을 호출하면 초기화된다', () => {
  useAppLockStore.getState().setBackgroundStartedAt(12345);

  useAppLockStore.getState().setBackgroundStartedAt(null);

  expect(useAppLockStore.getState().backgroundStartedAt).toBeNull();
});

test('backgroundStartedAt은 AsyncStorage에 저장되지 않는다(세션 로컬)', async () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  useAppLockStore.getState().setBackgroundStartedAt(Date.now());

  await waitFor(() => {
    expect(setItemMock).toHaveBeenCalled();
  });

  const [, savedRaw] =
    setItemMock.mock.calls[setItemMock.mock.calls.length - 1];
  expect(JSON.parse(savedRaw).state.backgroundStartedAt).toBeUndefined();
});

// sessionTimedOut은 "방금 세션 타임아웃 때문에 재인증이 필요해졌는지"를 나타낸다 —
// AuthVerify가 이 값을 보고 "자리를 비우셨네요" 안내 문구를 보여줄지 정한다.
// authenticated/backgroundStartedAt과 같은 이유로 세션 로컬이라 영속화되면 안 된다.
test('초기값은 세션 타임아웃으로 재인증이 필요한 상태가 아니다', () => {
  expect(useAppLockStore.getState().sessionTimedOut).toBe(false);
});

test('setSessionTimedOut(true)를 호출하면 값이 반영된다', () => {
  useAppLockStore.getState().setSessionTimedOut(true);

  expect(useAppLockStore.getState().sessionTimedOut).toBe(true);
});

test('sessionTimedOut은 AsyncStorage에 저장되지 않는다(세션 로컬)', async () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  useAppLockStore.getState().setSessionTimedOut(true);

  await waitFor(() => {
    expect(setItemMock).toHaveBeenCalled();
  });

  const [, savedRaw] =
    setItemMock.mock.calls[setItemMock.mock.calls.length - 1];
  expect(JSON.parse(savedRaw).state.sessionTimedOut).toBeUndefined();
});

// frozenUntil은 "인증을 너무 많이 틀려서 언제까지 얼어붙어 있는지"를 나타내는 절대
// 시각(ms)이다. 앱을 껐다 켜도 얼어붙은 상태가 풀리면 안 되므로(그 틈을 타 우회 못
// 하게) authenticated와 반대로 반드시 영속화돼야 한다.
test('초기값은 얼어붙어 있지 않은 상태다', () => {
  expect(useAppLockStore.getState().frozenUntil).toBeNull();
});

test('freeze()를 호출하면 지금부터 FREEZE_DURATION_MS 뒤로 frozenUntil이 설정된다', () => {
  const before = Date.now();

  useAppLockStore.getState().freeze();

  const after = Date.now();
  const frozenUntil = useAppLockStore.getState().frozenUntil;

  expect(frozenUntil).not.toBeNull();
  expect(frozenUntil as number).toBeGreaterThanOrEqual(
    before + FREEZE_DURATION_MS,
  );
  expect(frozenUntil as number).toBeLessThanOrEqual(after + FREEZE_DURATION_MS);
});

test('unfreeze()를 호출하면 frozenUntil이 null이 된다', () => {
  useAppLockStore.getState().freeze();

  useAppLockStore.getState().unfreeze();

  expect(useAppLockStore.getState().frozenUntil).toBeNull();
});

test('frozenUntil은 AsyncStorage에 저장된다(재시작해도 유지돼야 함)', async () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  useAppLockStore.getState().freeze();

  await waitFor(() => {
    expect(setItemMock).toHaveBeenCalled();
  });

  const [, savedRaw] =
    setItemMock.mock.calls[setItemMock.mock.calls.length - 1];
  expect(JSON.parse(savedRaw).state.frozenUntil).not.toBeUndefined();
  expect(JSON.parse(savedRaw).state.frozenUntil).not.toBeNull();
});

// pinFailCount는 "PIN을 몇 번 연속으로 틀렸는지"를 나타낸다. 생체인증은 OS가
// 자체적으로 시도 횟수를 세주지만 PIN은 이 앱이 직접 세야 하는데, 컴포넌트
// 로컬 상태로 두면 앱을 강제 종료했다 재실행하는 것만으로 0으로 리셋돼
// "5회 제한"이 무력화된다 — frozenUntil과 같은 이유로 반드시 영속화해야 한다.
test('초기값은 pinFailCount가 0이다', () => {
  expect(useAppLockStore.getState().pinFailCount).toBe(0);
});

test('setPinFailCount(n)을 호출하면 값이 반영된다', () => {
  useAppLockStore.getState().setPinFailCount(3);

  expect(useAppLockStore.getState().pinFailCount).toBe(3);
});

test('setPinFailCount(updater)로 이전 값 기반으로 갱신할 수 있다', () => {
  useAppLockStore.getState().setPinFailCount(2);

  useAppLockStore.getState().setPinFailCount(count => count + 1);

  expect(useAppLockStore.getState().pinFailCount).toBe(3);
});

test('pinFailCount는 AsyncStorage에 저장된다(재시작해도 유지돼야 함)', async () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  useAppLockStore.getState().setPinFailCount(2);

  await waitFor(() => {
    expect(setItemMock).toHaveBeenCalled();
  });

  const [, savedRaw] =
    setItemMock.mock.calls[setItemMock.mock.calls.length - 1];
  expect(JSON.parse(savedRaw).state.pinFailCount).toBe(2);
});

// 쿨다운이 다 끝나고 사용자가 직접 "다시 시도"를 눌러 얼어붙은 상태를 풀 때,
// pinFailCount도 같이 0으로 안 돌아가면 재시도 딱 한 번만 더 틀려도(이미
// MAX_PIN_ATTEMPTS 근처에 가 있으므로) 곧바로 다시 얼어붙어버린다.
test('unfreeze()를 호출하면 pinFailCount도 0으로 초기화된다', () => {
  useAppLockStore.getState().setPinFailCount(5);
  useAppLockStore.getState().freeze();

  useAppLockStore.getState().unfreeze();

  expect(useAppLockStore.getState().pinFailCount).toBe(0);
});
