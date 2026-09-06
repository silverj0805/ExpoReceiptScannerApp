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

// 실기기 재현으로 확인한 버그: pinLockoutRemainingMs 계산에 쓰는 `now` state는 마운트
// 시점에 한 번 찍고 그 뒤로 잠금이 걸리기 전까진 다시 안 찍힌다(주기 갱신 useEffect가
// pinLockedUntil이 생긴 "뒤에"야 붙기 때문에, 그 시점의 렌더는 여전히 mount 시점 값을 씀).
// 그래서 마운트 후 실제로 시간이 지난 뒤에 5번째로 틀리면, 남은 시간이 5분이 아니라
// "5분 + 마운트~잠금 사이에 지난 시간"으로 부풀어 보였다(사용자 보고: 5:00이어야 할 게 5:30).
test('마운트 후 시간이 지난 뒤 잠기더라도, 남은 시간은 정확히 5분(PIN_LOCKOUT_MS)이어야 한다', async () => {
  const dateNowSpy = jest.spyOn(Date, 'now');
  let currentTime = 1_000_000;
  dateNowSpy.mockImplementation(() => currentTime);
  mockedVerifyStoredPin.mockResolvedValue(false);

  const { result } = await renderHook(() => usePinLock());
  // PIN을 입력하는 데 시간이 걸려서 마운트 후 30초 뒤에야 5번째 실패에 도달하는 상황.
  currentTime += 30_000;

  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await result.current.authenticate('0000');
    });
  }

  expect(result.current.isPinLockedOut).toBe(true);
  expect(result.current.pinLockoutRemainingMs).toBe(5 * 60 * 1000);

  dateNowSpy.mockRestore();
});

// 사용자 요구사항: PinLockedOut이 시작되는 순간 남은 시도 횟수를 5회로 리셋한다.
// (부수 효과로, 카운트다운이 자연 만료된 뒤에도 실패 횟수가 5로 남아있지 않고 이미
// 0으로 리셋돼 있어서 "남은 시도 횟수 0회"로 잘못 보이는 문제도 같이 없어진다.)
test('5번째로 틀려서 잠기면 남은 시도 횟수가 즉시 5회로 리셋된다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);
  const { result } = await renderHook(() => usePinLock());

  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await result.current.authenticate('0000');
    });
  }

  expect(result.current.isPinLockedOut).toBe(true);
  expect(result.current.remainingPinAttempts).toBe(5);
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
