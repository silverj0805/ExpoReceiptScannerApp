import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import useBioAuth from './useBioAuth';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

const mockedHasHardware = LocalAuthentication.hasHardwareAsync as jest.Mock;
const mockedIsEnrolled = LocalAuthentication.isEnrolledAsync as jest.Mock;
const mockedAuthenticate = LocalAuthentication.authenticateAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedHasHardware.mockResolvedValue(true);
  mockedIsEnrolled.mockResolvedValue(true);
});

test('하드웨어 지원/등록 확인이 끝나기 전에는 isReady가 false다', async () => {
  // 절대 안 끝나는 프라미스로 고정해서, 마운트 직후 커밋 시점의 상태를 타이밍 레이스
  // 없이 결정론적으로 확인한다(끝난 뒤 상태는 아래 다른 테스트들이 다룸).
  mockedHasHardware.mockReturnValue(new Promise(() => {}));
  mockedIsEnrolled.mockReturnValue(new Promise(() => {}));

  const { result } = await renderHook(() => useBioAuth());

  expect(result.current.isReady).toBe(false);
});

test('지원/등록 확인이 끝나면 isReady가 true가 된다', async () => {
  const { result } = await renderHook(() => useBioAuth());

  await waitFor(() => {
    expect(result.current.isReady).toBe(true);
  });
});

test('지원·등록 안 된 기기는 isSupported/isEnrolled가 false로 반영된다', async () => {
  mockedHasHardware.mockResolvedValue(false);
  mockedIsEnrolled.mockResolvedValue(false);

  const { result } = await renderHook(() => useBioAuth());

  await waitFor(() => {
    expect(result.current.isReady).toBe(true);
  });
  expect(result.current.isSupported).toBe(false);
  expect(result.current.isEnrolled).toBe(false);
});

test('지원·등록돼 있으면 true로 반영된다', async () => {
  const { result } = await renderHook(() => useBioAuth());

  await waitFor(() => {
    expect(result.current.isReady).toBe(true);
  });
  expect(result.current.isSupported).toBe(true);
  expect(result.current.isEnrolled).toBe(true);
});

test('authenticate()는 promptMessage를 넘겨 authenticateAsync를 호출한다', async () => {
  mockedAuthenticate.mockResolvedValue({ success: true });
  const { result } = await renderHook(() => useBioAuth());

  await act(async () => {
    await result.current.authenticate();
  });

  expect(mockedAuthenticate).toHaveBeenCalledWith(
    expect.objectContaining({ promptMessage: expect.any(String) }),
  );
});

test('authenticate() 성공 시 authenticateAsync의 결과를 그대로 반환한다', async () => {
  mockedAuthenticate.mockResolvedValue({ success: true });
  const { result } = await renderHook(() => useBioAuth());

  let authResult;
  await act(async () => {
    authResult = await result.current.authenticate();
  });

  expect(authResult).toEqual({ success: true });
});

test('authenticate() 실패 시 authenticateAsync의 error를 그대로 반환한다', async () => {
  mockedAuthenticate.mockResolvedValue({ success: false, error: 'lockout' });
  const { result } = await renderHook(() => useBioAuth());

  let authResult;
  await act(async () => {
    authResult = await result.current.authenticate();
  });

  expect(authResult).toEqual({ success: false, error: 'lockout' });
});
