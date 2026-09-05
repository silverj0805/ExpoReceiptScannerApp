import { act, renderHook } from '@testing-library/react-native';

import { hasPinSet } from '../../pin/utils/pinStorage';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';

import useSecuritySetupStatus from './useSecuritySetupStatus';

jest.mock('../../pin/utils/pinStorage', () => ({
  hasPinSet: jest.fn(),
}));

const mockedHasPinSet = hasPinSet as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useSecuritySettingsStore.setState({ biometricEnabled: false });
});

test('PIN 미등록 + 생체 토글 off면 isSecuritySetUp은 false다', async () => {
  mockedHasPinSet.mockResolvedValue(false);

  const { result } = await renderHook(() => useSecuritySetupStatus());

  await act(async () => {
    await Promise.resolve();
  });

  expect(result.current.isSecuritySetUp).toBe(false);
  expect(result.current.isLoading).toBe(false);
});

test('PIN이 등록돼 있으면 생체 토글과 무관하게 isSecuritySetUp은 true다', async () => {
  mockedHasPinSet.mockResolvedValue(true);
  useSecuritySettingsStore.setState({ biometricEnabled: false });

  const { result } = await renderHook(() => useSecuritySetupStatus());

  await act(async () => {
    await Promise.resolve();
  });

  expect(result.current.isSecuritySetUp).toBe(true);
});

test('PIN이 없어도 생체 토글이 켜져 있으면 isSecuritySetUp은 true다', async () => {
  mockedHasPinSet.mockResolvedValue(false);
  useSecuritySettingsStore.setState({ biometricEnabled: true });

  const { result } = await renderHook(() => useSecuritySetupStatus());

  await act(async () => {
    await Promise.resolve();
  });

  expect(result.current.isSecuritySetUp).toBe(true);
});

test('hasPinSet() 조회가 끝나기 전엔 isLoading이 true다', async () => {
  let resolvePinSet: (value: boolean) => void = () => {};
  mockedHasPinSet.mockReturnValue(
    new Promise<boolean>(resolve => {
      resolvePinSet = resolve;
    }),
  );

  const { result } = await renderHook(() => useSecuritySetupStatus());

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolvePinSet(true);
    await Promise.resolve();
  });

  expect(result.current.isLoading).toBe(false);
});
