import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import useBiometricAuth from '../biometric/hooks/useBiometricAuth';
import usePinLock from '../pin/hooks/usePinLock';

import useAppLock from './useAppLock';

// useAppLock은 오케스트레이션(잠금 여부 + 세션 타임아웃)만 책임지므로,
// 실제 인증 로직(useBiometricAuth/usePinLock)은 통째로 mock해서 분리 테스트한다.
jest.mock('../biometric/hooks/useBiometricAuth');
jest.mock('../pin/hooks/usePinLock');

const mockedUseBiometricAuth = useBiometricAuth as jest.Mock;
const mockedUsePinLock = usePinLock as jest.Mock;

// react-native 모듈 전체를 jest.mock으로 재구성하면(spread) 내부적으로 expo의 fetch
// 폴리필 초기화가 깨져서(getter 기반 lazy 모듈이라 spread에 안 맞음, 실측으로 확인) 대신
// AppState.addEventListener 하나만 spyOn으로 가로채서 background/active 전환을 손으로
// 트리거한다(WiseSaying 테스트의 useFocusEffect 캡처와 같은 접근).
const mockedAddEventListener = jest
  .spyOn(AppState, 'addEventListener')
  .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<
    typeof AppState.addEventListener
  >);

/** AppState.addEventListener('change', handler)로 등록된 가장 최근 handler를 꺼낸다. */
function getAppStateHandler(): (state: AppStateStatus) => void {
  const calls = mockedAddEventListener.mock.calls;
  return calls[calls.length - 1][1];
}

let biometricAuthenticate: jest.Mock;
let pinAuthenticate: jest.Mock;
let pinReset: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  biometricAuthenticate = jest.fn();
  mockedUseBiometricAuth.mockReturnValue({
    isSupported: true,
    isEnrolled: true,
    authenticate: biometricAuthenticate,
  });

  pinAuthenticate = jest.fn();
  pinReset = jest.fn();
  mockedUsePinLock.mockReturnValue({
    isPinLockedOut: false,
    remainingPinAttempts: 5,
    pinLockoutRemainingMs: null,
    authenticate: pinAuthenticate,
    reset: pinReset,
  });
});

test('마운트 직후엔 항상 잠긴 상태로 시작한다', async () => {
  const { result } = await renderHook(() => useAppLock());

  expect(result.current.isLocked).toBe(true);
});

test('useBiometricAuth의 지원·등록 여부를 그대로 반영한다', async () => {
  mockedUseBiometricAuth.mockReturnValue({
    isSupported: false,
    isEnrolled: false,
    authenticate: biometricAuthenticate,
  });

  const { result } = await renderHook(() => useAppLock());

  expect(result.current.isSupported).toBe(false);
  expect(result.current.isEnrolled).toBe(false);
});

test('생체인증에 성공하면 잠금이 풀리고 PIN 실패 기록이 초기화된다', async () => {
  biometricAuthenticate.mockResolvedValue(true);
  const { result } = await renderHook(() => useAppLock());

  await act(async () => {
    await result.current.authenticateWithBiometrics();
  });

  expect(result.current.isLocked).toBe(false);
  expect(pinReset).toHaveBeenCalled();
});

test('생체인증에 실패하면 잠긴 상태 그대로다', async () => {
  biometricAuthenticate.mockResolvedValue(false);
  const { result } = await renderHook(() => useAppLock());

  await act(async () => {
    await result.current.authenticateWithBiometrics();
  });

  expect(result.current.isLocked).toBe(true);
});

test('PIN이 맞으면 잠금이 풀린다', async () => {
  pinAuthenticate.mockResolvedValue(true);
  const { result } = await renderHook(() => useAppLock());

  await act(async () => {
    await result.current.authenticateWithPin('1234');
  });

  expect(result.current.isLocked).toBe(false);
});

test('PIN이 틀리면 잠긴 상태 그대로고, usePinLock의 상태를 그대로 노출한다', async () => {
  pinAuthenticate.mockResolvedValue(false);
  mockedUsePinLock.mockReturnValue({
    isPinLockedOut: false,
    remainingPinAttempts: 4,
    pinLockoutRemainingMs: null,
    authenticate: pinAuthenticate,
    reset: pinReset,
  });
  const { result } = await renderHook(() => useAppLock());

  await act(async () => {
    await result.current.authenticateWithPin('0000');
  });

  expect(result.current.isLocked).toBe(true);
  expect(result.current.remainingPinAttempts).toBe(4);
});

test('PIN 시도 횟수 제한 상태(isPinLockedOut/pinLockoutRemainingMs)를 그대로 노출한다', async () => {
  mockedUsePinLock.mockReturnValue({
    isPinLockedOut: true,
    remainingPinAttempts: 0,
    pinLockoutRemainingMs: 120_000,
    authenticate: pinAuthenticate,
    reset: pinReset,
  });

  const { result } = await renderHook(() => useAppLock());

  expect(result.current.isPinLockedOut).toBe(true);
  expect(result.current.pinLockoutRemainingMs).toBe(120_000);
});

test('백그라운드로 5분 미만 있다 돌아오면 다시 잠기지 않는다', async () => {
  jest.useFakeTimers();
  biometricAuthenticate.mockResolvedValue(true);
  const { result } = await renderHook(() => useAppLock());
  await act(async () => {
    await result.current.authenticateWithBiometrics();
  });
  expect(result.current.isLocked).toBe(false);

  const handler = getAppStateHandler();
  await act(async () => {
    handler('background');
  });
  await act(async () => {
    jest.advanceTimersByTime(4 * 60 * 1000);
  });
  await act(async () => {
    handler('active');
  });

  expect(result.current.isLocked).toBe(false);
  jest.useRealTimers();
});

test('백그라운드로 5분 이상 있다 돌아오면 다시 잠긴다', async () => {
  jest.useFakeTimers();
  biometricAuthenticate.mockResolvedValue(true);
  const { result } = await renderHook(() => useAppLock());
  await act(async () => {
    await result.current.authenticateWithBiometrics();
  });
  expect(result.current.isLocked).toBe(false);

  const handler = getAppStateHandler();
  await act(async () => {
    handler('background');
  });
  await act(async () => {
    jest.advanceTimersByTime(6 * 60 * 1000);
  });
  await act(async () => {
    handler('active');
  });

  expect(result.current.isLocked).toBe(true);
  jest.useRealTimers();
});
