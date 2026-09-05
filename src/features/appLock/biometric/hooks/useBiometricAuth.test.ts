import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import useBiometricAuth from './useBiometricAuth';

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

test('기기의 생체인증 지원·등록 여부를 마운트 시 확인한다', async () => {
  mockedHasHardware.mockResolvedValue(false);
  mockedIsEnrolled.mockResolvedValue(false);

  const { result } = await renderHook(() => useBiometricAuth());

  await waitFor(() => {
    expect(result.current.isSupported).toBe(false);
    expect(result.current.isEnrolled).toBe(false);
  });
});

test('지원·등록돼 있으면 true로 반영된다', async () => {
  const { result } = await renderHook(() => useBiometricAuth());

  await waitFor(() => {
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isEnrolled).toBe(true);
  });
});

test('생체인증에 성공하면 true를 반환한다', async () => {
  mockedAuthenticate.mockResolvedValue({ success: true });
  const { result } = await renderHook(() => useBiometricAuth());

  let success = false;
  await act(async () => {
    success = await result.current.authenticate();
  });

  expect(success).toBe(true);
});

test('생체인증에 실패하면 false를 반환한다', async () => {
  mockedAuthenticate.mockResolvedValue({
    success: false,
    error: 'user_cancel',
  });
  const { result } = await renderHook(() => useBiometricAuth());

  let success = true;
  await act(async () => {
    success = await result.current.authenticate();
  });

  expect(success).toBe(false);
});
