import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { SESSION_TIMEOUT_MS } from '../../hooks/useSessionTimeout';
import { hasPinSet } from '../../pin/utils';
import { useAppLockStore } from '../../stores/useAppLockStore';
import useBioAuth from '../hooks/useBioAuth';

import BioAuthVerify from './BioAuthVerify';

// useBioAuth 자체(하드웨어 감지, authenticateAsync 호출 등)는 useBioAuth.test.ts가
// 이미 다루므로, 여기서는 BioAuthVerify가 그 결과를 받아 어떻게 반응하는지만 본다.
jest.mock('../hooks/useBioAuth');
const mockedUseBioAuth = useBioAuth as jest.Mock;

// PIN 대체 버튼을 보여줄지는 hasPinSet(SecureStore 조회) 결과에 달려 있다 —
// pin/utils/index.test.ts가 이미 SecureStore 연동 자체는 다루므로 여기선 모킹.
jest.mock('../../pin/utils');
const mockedHasPinSet = hasPinSet as jest.Mock;

// authenticate()가 끝나지 않게(pending) 고정해서, 자동 인증 성공/실패로 인한
// 리렌더가 아래 PIN 대체 버튼 테스트에 섞여들지 않게 한다.
const pendingAuthenticate = () =>
  jest.fn().mockReturnValue(new Promise(() => {}));

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
  mockedHasPinSet.mockResolvedValue(false);
  useAppLockStore.setState({
    authenticated: false,
    sessionTimedOut: false,
    frozenUntil: null,
  });
});

test('하드웨어 확인이 끝나기 전에는 아무것도 보여주지 않는다', async () => {
  mockUseBioAuth({ isReady: false });

  await render(<BioAuthVerify />);

  expect(screen.toJSON()).toBeNull();
});

test('생체인증을 지원하는 기기면 마운트 시 자동으로 인증을 시도한다', async () => {
  const authenticate = jest.fn().mockResolvedValue({ success: true });
  mockUseBioAuth({ authenticate });

  await render(<BioAuthVerify />);

  await waitFor(() => {
    expect(authenticate).toHaveBeenCalled();
  });
});

test('자동 인증에 성공하면 이번 세션이 인증된 것으로 표시된다', async () => {
  mockUseBioAuth({
    authenticate: jest.fn().mockResolvedValue({ success: true }),
  });

  await render(<BioAuthVerify />);

  await waitFor(() => {
    expect(useAppLockStore.getState().authenticated).toBe(true);
  });
});

test('생체인증을 지원하지 않는 기기는 시도하지 않고 그냥 통과시킨다', async () => {
  const authenticate = jest.fn();
  mockUseBioAuth({ isSupported: false, isEnrolled: false, authenticate });

  await render(<BioAuthVerify />);

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

  await render(<BioAuthVerify />);

  expect(
    await screen.findByText('인증에 실패했어요. 다시 시도해주세요'),
  ).toBeTruthy();
});

// disableDeviceFallback을 안 켜기로 한 결정(사용자 확인) 때문에, authenticateAsync가
// 우리 쪽에 'lockout'을 던져주는 경우 자체가 실질적으로 도달 불가능하다 — 기본값
// (false)에서는 생체인증을 여러 번 틀리면 OS가 'lockout'을 주기 전에 자기 자신의
// 기기 패스코드 화면을 먼저 띄워서 가로챈다(실제로 expo-local-authentication의
// disableDeviceFallback 옵션 문서에 명시돼 있고, 실기기로도 확인함). 그래서 이제
// 'lockout'도 다른 에러들과 마찬가지로 그냥 일반 에러 메시지만 보여준다 — freeze()는
// PIN 쪽에서 우리가 직접 5회 실패를 셀 때만 쓴다.
test('OS가 잠근 상태(lockout)여도 얼리지 않고 일반 에러 메시지만 보여준다', async () => {
  mockUseBioAuth({
    authenticate: jest
      .fn()
      .mockResolvedValue({ success: false, error: 'lockout' }),
  });

  await render(<BioAuthVerify />);

  expect(
    await screen.findByText('인증에 실패했어요. 다시 시도해주세요'),
  ).toBeTruthy();
  expect(useAppLockStore.getState().frozenUntil).toBeNull();
});

test('기기에서 생체인증을 쓸 수 없다는 에러가 오면 그에 맞는 안내를 보여준다', async () => {
  mockUseBioAuth({
    authenticate: jest
      .fn()
      .mockResolvedValue({ success: false, error: 'not_enrolled' }),
  });

  await render(<BioAuthVerify />);

  expect(
    await screen.findByText('이 기기에서는 생체인증을 쓸 수 없어요'),
  ).toBeTruthy();
});

test('세션 타임아웃으로 재인증이 필요해진 경우 자리 비움 안내 문구를 보여준다', async () => {
  useAppLockStore.setState({ sessionTimedOut: true });
  // authenticate()가 아직 안 끝난(=한창 인증 중인) 상태를 관찰하려는 것이라, 일부러
  // resolve 안 되는 프라미스로 고정한다 — 바로 성공해버리면 아래에서 확인할 안내
  // 문구가 뜨자마자 setSessionTimedOut(false)로 사라져서 관찰할 수 없다.
  mockUseBioAuth({
    authenticate: jest.fn().mockReturnValue(new Promise(() => {})),
  });

  await render(<BioAuthVerify />);

  const minutes = Math.round(SESSION_TIMEOUT_MS / 60_000);
  expect(
    await screen.findByText(`${minutes}분 이상 자리를 비우셨네요`),
  ).toBeTruthy();
  expect(screen.getByText('보안을 위해 다시 인증을 진행해주세요')).toBeTruthy();
});

test('콜드 스타트로 인한 평범한 잠금이면 자리 비움 안내 문구 대신 평범한 안내를 보여준다', async () => {
  mockUseBioAuth({
    authenticate: jest.fn().mockReturnValue(new Promise(() => {})),
  });

  await render(<BioAuthVerify />);

  const minutes = Math.round(SESSION_TIMEOUT_MS / 60_000);
  expect(screen.queryByText(`${minutes}분 이상 자리를 비우셨네요`)).toBeNull();
  expect(screen.getByText('생체인증으로 잠금 해제')).toBeTruthy();
  expect(
    screen.getByText('모으곰이 내 지출 내역을 안전하게 보호하고 있어요'),
  ).toBeTruthy();
});

test('인증에 성공하면 세션 타임아웃 표시도 초기화된다', async () => {
  useAppLockStore.setState({ sessionTimedOut: true });
  mockUseBioAuth({
    authenticate: jest.fn().mockResolvedValue({ success: true }),
  });

  await render(<BioAuthVerify />);

  await waitFor(() => {
    expect(useAppLockStore.getState().sessionTimedOut).toBe(false);
  });
});

test('"다시 시도"를 누르면 다시 인증을 시도한다', async () => {
  const authenticate = jest
    .fn()
    .mockResolvedValueOnce({ success: false, error: 'authentication_failed' })
    .mockResolvedValueOnce({ success: true });
  mockUseBioAuth({ authenticate });

  await render(<BioAuthVerify />);

  await screen.findByText('인증에 실패했어요. 다시 시도해주세요');

  await fireEvent.press(screen.getByTestId('auth-verify-retry'));

  expect(authenticate).toHaveBeenCalledTimes(2);
  await waitFor(() => {
    expect(useAppLockStore.getState().authenticated).toBe(true);
  });
});

// 생체인증을 골랐어도 PIN은 대체 수단으로 함께 등록되므로, Face ID가 계속
// 실패할 때(마스크·젖은 손·카메라 이물질 등) PIN으로 넘어갈 방법이 있어야
// 한다. 다만 PIN이 실제로 등록돼 있을 때만 보여준다 — 이 기능 이전부터
// 생체인증만으로 잠가둔 사용자(PIN 미등록)에게 버튼을 보여주면, 눌러도 어떤
// PIN도 통과할 수 없는 화면으로 보내는 셈이라 오히려 더 못 들어가게 만든다.
test('PIN이 등록돼 있으면 "PIN으로 입력" 버튼을 보여준다', async () => {
  mockedHasPinSet.mockResolvedValue(true);
  mockUseBioAuth({ authenticate: pendingAuthenticate() });

  await render(<BioAuthVerify onUsePinInstead={jest.fn()} />);

  expect(await screen.findByTestId('auth-verify-use-pin')).toBeTruthy();
});

test('PIN이 등록돼 있지 않으면 "PIN으로 입력" 버튼을 보여주지 않는다', async () => {
  mockedHasPinSet.mockResolvedValue(false);
  mockUseBioAuth({ authenticate: pendingAuthenticate() });

  await render(<BioAuthVerify onUsePinInstead={jest.fn()} />);

  await waitFor(() => {
    expect(mockedHasPinSet).toHaveBeenCalled();
  });
  expect(screen.queryByTestId('auth-verify-use-pin')).toBeNull();
});

test('onUsePinInstead를 안 넘기면 PIN이 있어도 버튼을 보여주지 않는다', async () => {
  mockedHasPinSet.mockResolvedValue(true);
  mockUseBioAuth({ authenticate: pendingAuthenticate() });

  await render(<BioAuthVerify />);

  await waitFor(() => {
    expect(mockedHasPinSet).toHaveBeenCalled();
  });
  expect(screen.queryByTestId('auth-verify-use-pin')).toBeNull();
});

test('"PIN으로 입력"을 누르면 onUsePinInstead를 호출한다', async () => {
  mockedHasPinSet.mockResolvedValue(true);
  const onUsePinInstead = jest.fn();
  mockUseBioAuth({ authenticate: pendingAuthenticate() });

  await render(<BioAuthVerify onUsePinInstead={onUsePinInstead} />);

  await fireEvent.press(await screen.findByTestId('auth-verify-use-pin'));

  expect(onUsePinInstead).toHaveBeenCalled();
});
