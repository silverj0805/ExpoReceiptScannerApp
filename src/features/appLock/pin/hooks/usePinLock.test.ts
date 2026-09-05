import { act, renderHook } from '@testing-library/react-native';

import { verifyStoredPin } from '../utils/pinStorage';

import usePinLock from './usePinLock';

jest.mock('../utils/pinStorage', () => ({
  verifyStoredPin: jest.fn(),
}));

const mockedVerifyStoredPin = verifyStoredPin as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

test('PIN이 맞으면 true를 반환하고 실패 횟수가 초기화된다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(true);
  const { result } = await renderHook(() => usePinLock());

  let success = false;
  await act(async () => {
    success = await result.current.authenticate('1234');
  });

  expect(success).toBe(true);
});

test('PIN이 틀리면 false를 반환하고 남은 시도 횟수가 하나 줄어든다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);
  const { result } = await renderHook(() => usePinLock());
  const before = result.current.remainingPinAttempts;

  await act(async () => {
    await result.current.authenticate('0000');
  });

  expect(result.current.isPinLockedOut).toBe(false);
  expect(result.current.remainingPinAttempts).toBe(before - 1);
});

test('PIN을 성공하면 남은 시도 횟수가 초기화된다', async () => {
  mockedVerifyStoredPin
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  const { result } = await renderHook(() => usePinLock());
  const max = result.current.remainingPinAttempts;

  await act(async () => {
    await result.current.authenticate('0000');
  });
  expect(result.current.remainingPinAttempts).toBe(max - 1);

  await act(async () => {
    await result.current.authenticate('1234');
  });
  expect(result.current.remainingPinAttempts).toBe(max);
});

test('PIN을 5번 틀리면 시도 횟수 제한에 걸린다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);
  const { result } = await renderHook(() => usePinLock());

  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await result.current.authenticate('0000');
    });
  }

  expect(result.current.isPinLockedOut).toBe(true);
  expect(result.current.pinLockoutRemainingMs).toBeGreaterThan(0);
});

test('시도 횟수 제한에 걸린 동안엔 맞는 PIN을 넣어도 검증 자체를 안 한다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);
  const { result } = await renderHook(() => usePinLock());

  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await result.current.authenticate('0000');
    });
  }
  mockedVerifyStoredPin.mockClear();
  mockedVerifyStoredPin.mockResolvedValue(true);

  let unlocked = false;
  await act(async () => {
    unlocked = await result.current.authenticate('1234');
  });

  expect(unlocked).toBe(false);
  expect(mockedVerifyStoredPin).not.toHaveBeenCalled();
});

test('reset을 호출하면 실패 횟수·잠금이 초기화된다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);
  const { result } = await renderHook(() => usePinLock());

  await act(async () => {
    await result.current.authenticate('0000');
  });
  expect(result.current.remainingPinAttempts).toBeLessThan(5);

  await act(async () => {
    result.current.reset();
  });

  expect(result.current.remainingPinAttempts).toBe(5);
  expect(result.current.isPinLockedOut).toBe(false);
});
