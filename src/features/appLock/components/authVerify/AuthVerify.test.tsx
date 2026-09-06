import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import useBioAuth from '../../hooks/useBioAuth';
import { useAppLockStore } from '../../stores/useAppLockStore';

import AuthVerify from './index';

// useBioAuth 자체(하드웨어 감지, authenticateAsync 호출 등)는 useBioAuth.test.ts가
// 이미 다루므로, 여기서는 AuthVerify가 그 결과를 받아 어떻게 반응하는지만 본다.
jest.mock('../../hooks/useBioAuth');
const mockedUseBioAuth = useBioAuth as jest.Mock;

const mockUseBioAuth = (overrides: Partial<ReturnType<typeof useBioAuth>>) => {
  mockedUseBioAuth.mockReturnValue({
    isReady: true,
    isSupported: true,
    isEnrolled: true,
    authenticate: jest.fn(),
    ...overrides,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  useAppLockStore.setState({ authenticated: false });
});

test('하드웨어 확인이 끝나기 전에는 아무것도 보여주지 않는다', async () => {
  mockUseBioAuth({ isReady: false });

  await render(<AuthVerify />);

  expect(screen.toJSON()).toBeNull();
});

test('생체인증을 지원하는 기기면 마운트 시 자동으로 인증을 시도한다', async () => {
  const authenticate = jest.fn().mockResolvedValue({ success: true });
  mockUseBioAuth({ authenticate });

  await render(<AuthVerify />);

  await waitFor(() => {
    expect(authenticate).toHaveBeenCalled();
  });
});

test('자동 인증에 성공하면 이번 세션이 인증된 것으로 표시된다', async () => {
  mockUseBioAuth({
    authenticate: jest.fn().mockResolvedValue({ success: true }),
  });

  await render(<AuthVerify />);

  await waitFor(() => {
    expect(useAppLockStore.getState().authenticated).toBe(true);
  });
});

test('생체인증을 지원하지 않는 기기는 시도하지 않고 그냥 통과시킨다', async () => {
  const authenticate = jest.fn();
  mockUseBioAuth({ isSupported: false, isEnrolled: false, authenticate });

  await render(<AuthVerify />);

  await waitFor(() => {
    expect(useAppLockStore.getState().authenticated).toBe(true);
  });
  expect(authenticate).not.toHaveBeenCalled();
});

test('인증에 실패하면(일반) 에러 메시지를 보여준다', async () => {
  mockUseBioAuth({
    authenticate: jest
      .fn()
      .mockResolvedValue({ success: false, error: 'authentication_failed' }),
  });

  await render(<AuthVerify />);

  expect(
    await screen.findByText('인증에 실패했어요. 다시 시도해주세요'),
  ).toBeTruthy();
});

test('OS가 잠근 상태(lockout)면 그에 맞는 안내를 보여준다', async () => {
  mockUseBioAuth({
    authenticate: jest
      .fn()
      .mockResolvedValue({ success: false, error: 'lockout' }),
  });

  await render(<AuthVerify />);

  expect(
    await screen.findByText('너무 자주 실패해서 잠시 후 다시 시도해주세요'),
  ).toBeTruthy();
});

test('기기에서 생체인증을 쓸 수 없다는 에러가 오면 그에 맞는 안내를 보여준다', async () => {
  mockUseBioAuth({
    authenticate: jest
      .fn()
      .mockResolvedValue({ success: false, error: 'not_enrolled' }),
  });

  await render(<AuthVerify />);

  expect(
    await screen.findByText('이 기기에서는 생체인증을 쓸 수 없어요'),
  ).toBeTruthy();
});

test('"다시 시도"를 누르면 다시 인증을 시도한다', async () => {
  const authenticate = jest
    .fn()
    .mockResolvedValueOnce({ success: false, error: 'authentication_failed' })
    .mockResolvedValueOnce({ success: true });
  mockUseBioAuth({ authenticate });

  await render(<AuthVerify />);

  await screen.findByText('인증에 실패했어요. 다시 시도해주세요');

  await fireEvent.press(screen.getByTestId('auth-verify-retry'));

  expect(authenticate).toHaveBeenCalledTimes(2);
  await waitFor(() => {
    expect(useAppLockStore.getState().authenticated).toBe(true);
  });
});
