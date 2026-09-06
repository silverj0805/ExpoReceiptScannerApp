import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useAppLockStore } from '../stores/useAppLockStore';

import useSessionTimeout, { SESSION_TIMEOUT_MS } from './useSessionTimeout';

// AppState.addEventListener를 spy로 가로채서, 실제 OS 이벤트 없이도 리스너를
// 직접 호출해 상태 전환을 시뮬레이션한다(PrivacyScreenCover.test.tsx와 동일 패턴).
function emitAppStateChange(nextState: string) {
  const addEventListenerMock = AppState.addEventListener as jest.Mock;
  const [, listener] = addEventListenerMock.mock.calls[
    addEventListenerMock.mock.calls.length - 1
  ] as [string, (state: string) => void];
  listener(nextState);
}

beforeEach(() => {
  jest.spyOn(AppState, 'addEventListener');
  useAppLockStore.setState({
    isLockSetUp: true,
    authenticated: true,
    backgroundStartedAt: null,
    sessionTimedOut: false,
  });
});

test('잠금 설정이 꺼져 있으면 AppState 리스너 자체를 등록하지 않는다', async () => {
  useAppLockStore.setState({ isLockSetUp: false });
  const addEventListenerMock = AppState.addEventListener as jest.Mock;

  await renderHook(() => useSessionTimeout());

  expect(addEventListenerMock).not.toHaveBeenCalled();
});

test('백그라운드로 전환되면 backgroundStartedAt이 기록된다', async () => {
  await renderHook(() => useSessionTimeout());

  act(() => {
    emitAppStateChange('background');
  });

  expect(useAppLockStore.getState().backgroundStartedAt).not.toBeNull();
});

test('inactive로 전환될 때는 backgroundStartedAt을 기록하지 않는다', async () => {
  await renderHook(() => useSessionTimeout());

  act(() => {
    emitAppStateChange('inactive');
  });

  expect(useAppLockStore.getState().backgroundStartedAt).toBeNull();
});

test('타임아웃 미만으로 백그라운드에 있었다면 active 복귀 시 인증 상태를 유지한다', async () => {
  useAppLockStore.setState({
    backgroundStartedAt: Date.now() - (SESSION_TIMEOUT_MS - 1000),
  });

  await renderHook(() => useSessionTimeout());

  act(() => {
    emitAppStateChange('active');
  });

  expect(useAppLockStore.getState().authenticated).toBe(true);
  expect(useAppLockStore.getState().sessionTimedOut).toBe(false);
});

test('타임아웃 이상으로 백그라운드에 있었다면 active 복귀 시 재인증이 필요해진다', async () => {
  useAppLockStore.setState({
    backgroundStartedAt: Date.now() - (SESSION_TIMEOUT_MS + 1000),
  });

  await renderHook(() => useSessionTimeout());

  act(() => {
    emitAppStateChange('active');
  });

  expect(useAppLockStore.getState().authenticated).toBe(false);
});

test('타임아웃 이상으로 백그라운드에 있었다면 sessionTimedOut이 true가 된다', async () => {
  useAppLockStore.setState({
    backgroundStartedAt: Date.now() - (SESSION_TIMEOUT_MS + 1000),
  });

  await renderHook(() => useSessionTimeout());

  act(() => {
    emitAppStateChange('active');
  });

  expect(useAppLockStore.getState().sessionTimedOut).toBe(true);
});

test('active로 복귀하면 조건 충족 여부와 무관하게 backgroundStartedAt을 초기화한다', async () => {
  useAppLockStore.setState({ backgroundStartedAt: Date.now() - 60_000 });

  await renderHook(() => useSessionTimeout());

  act(() => {
    emitAppStateChange('active');
  });

  expect(useAppLockStore.getState().backgroundStartedAt).toBeNull();
});

test('애초에 백그라운드로 나간 적 없으면 active로 전환돼도 인증 상태를 건드리지 않는다', async () => {
  await renderHook(() => useSessionTimeout());

  act(() => {
    emitAppStateChange('active');
  });

  expect(useAppLockStore.getState().authenticated).toBe(true);
});
