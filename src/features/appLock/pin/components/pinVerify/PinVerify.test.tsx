import { fireEvent, render, screen } from '@testing-library/react-native';

import { SESSION_TIMEOUT_MS } from '../../../hooks/useSessionTimeout';
import { useAppLockStore } from '../../../stores/useAppLockStore';
import { PIN_LENGTH, verifyStoredPin } from '../../utils';

import PinVerify from './index';

// PIN 저장/검증 자체(SecureStore 연동)는 utils/index.test.ts가 이미 다루므로, 여기서는
// "이 컴포넌트가 검증 결과를 받아 어떻게 반응하는지"만 본다.
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  verifyStoredPin: jest.fn(),
}));
const mockedVerifyStoredPin = verifyStoredPin as jest.Mock;

const pressDigits = async (digits: string) => {
  for (const digit of digits) {
    await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
};

const CORRECT_PIN = '1'.repeat(PIN_LENGTH);
const WRONG_PIN = '9'.repeat(PIN_LENGTH);

beforeEach(() => {
  jest.clearAllMocks();
  useAppLockStore.setState({
    authenticated: false,
    sessionTimedOut: false,
    frozenUntil: null,
    pinFailCount: 0,
  });
});

test('올바른 PIN을 입력하면 이번 세션이 인증된 것으로 표시된다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(true);

  await render(<PinVerify />);
  await pressDigits(CORRECT_PIN);

  expect(useAppLockStore.getState().authenticated).toBe(true);
});

test('틀린 PIN을 입력하면 에러 메시지를 보여주고 입력을 초기화한다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);

  await render(<PinVerify />);
  await pressDigits(WRONG_PIN);

  expect(
    await screen.findByText('PIN이 틀렸어요. 다시 입력해주세요.'),
  ).toBeTruthy();
  expect(useAppLockStore.getState().authenticated).toBe(false);
});

test('처음엔 남은 시도 횟수 5회를 보여준다', async () => {
  await render(<PinVerify />);

  expect(screen.getByText('남은 시도 횟수 5회')).toBeTruthy();
});

test('한 번 틀리면 남은 시도 횟수가 4회로 줄어든다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);

  await render(<PinVerify />);
  await pressDigits(WRONG_PIN);

  expect(
    await screen.findByText('PIN이 틀렸어요. 다시 입력해주세요.'),
  ).toBeTruthy();
  expect(screen.getByText('남은 시도 횟수 4회')).toBeTruthy();
});

test('5번 틀리면 useAppLockStore를 얼린다(freeze)', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);

  await render(<PinVerify />);
  for (let attempt = 0; attempt < 5; attempt++) {
    await pressDigits(WRONG_PIN);
  }

  expect(useAppLockStore.getState().frozenUntil).not.toBeNull();
});

// 실패 횟수를 컴포넌트 로컬 상태로 두면 앱을 강제 종료했다 재실행하는 것만으로
// (컴포넌트가 통째로 리마운트되므로) 0으로 리셋돼 "5회 제한"이 무력화된다 —
// useAppLockStore(persist)에 있어야 리마운트(=앱 재시작)돼도 이어진다.
test('앱을 재시작해도(컴포넌트가 리마운트돼도) 남은 시도 횟수가 이어진다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);

  const { unmount } = await render(<PinVerify />);
  await pressDigits(WRONG_PIN);
  await pressDigits(WRONG_PIN);
  await pressDigits(WRONG_PIN);
  expect(screen.getByText('남은 시도 횟수 2회')).toBeTruthy();

  await unmount();
  await render(<PinVerify />);

  expect(screen.getByText('남은 시도 횟수 2회')).toBeTruthy();
});

test('재시작 후 이어진 시도까지 합쳐 5번을 채우면 얼어붙는다', async () => {
  mockedVerifyStoredPin.mockResolvedValue(false);

  const { unmount } = await render(<PinVerify />);
  for (let attempt = 0; attempt < 3; attempt++) {
    await pressDigits(WRONG_PIN);
  }
  await unmount();

  await render(<PinVerify />);
  for (let attempt = 0; attempt < 2; attempt++) {
    await pressDigits(WRONG_PIN);
  }

  expect(useAppLockStore.getState().frozenUntil).not.toBeNull();
});

test('올바른 PIN을 입력하면 실패 횟수가 초기화된다', async () => {
  mockedVerifyStoredPin
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);

  await render(<PinVerify />);
  await pressDigits(WRONG_PIN);
  expect(screen.getByText('남은 시도 횟수 4회')).toBeTruthy();

  await pressDigits(CORRECT_PIN);

  expect(useAppLockStore.getState().pinFailCount).toBe(0);
});

// SecureStore 접근 자체가 실패하는(키체인 접근 실패 등) 드문 상황을 대비한다 —
// 이전엔 try/catch가 없어서 이런 경우 아무 피드백 없이 화면이 그냥 멈춘 것처럼
// 보였다. 또한 이건 "틀린 PIN"이 아니라 시스템 오류이므로 시도 횟수를 깎으면
// 안 된다 — 무관한 오류 때문에 사용자가 잠길 위험을 만들 수 있어서다.
test('PIN 확인 자체가 실패하면 에러 메시지를 보여주고 시도 횟수는 그대로 둔다', async () => {
  mockedVerifyStoredPin.mockRejectedValue(new Error('keychain error'));

  await render(<PinVerify />);
  await pressDigits(CORRECT_PIN);

  expect(
    await screen.findByText('PIN 확인에 실패했어요. 다시 시도해주세요.'),
  ).toBeTruthy();
  expect(useAppLockStore.getState().authenticated).toBe(false);
  expect(useAppLockStore.getState().frozenUntil).toBeNull();
  expect(screen.getByText('남은 시도 횟수 5회')).toBeTruthy();
});

test('PIN 확인 실패 후 다시 입력하면 정상적으로 인증된다', async () => {
  mockedVerifyStoredPin
    .mockRejectedValueOnce(new Error('keychain error'))
    .mockResolvedValueOnce(true);

  await render(<PinVerify />);
  await pressDigits(CORRECT_PIN);
  await screen.findByText('PIN 확인에 실패했어요. 다시 시도해주세요.');

  await pressDigits(CORRECT_PIN);

  expect(useAppLockStore.getState().authenticated).toBe(true);
});

test('세션 타임아웃으로 재인증이 필요해진 경우 자리 비움 안내 문구를 보여준다', async () => {
  useAppLockStore.setState({ sessionTimedOut: true });

  await render(<PinVerify />);

  const minutes = Math.round(SESSION_TIMEOUT_MS / 60_000);
  expect(
    await screen.findByText(`${minutes}분 이상 자리를 비우셨네요`),
  ).toBeTruthy();
});

test('콜드 스타트로 인한 평범한 잠금이면 자리 비움 안내 문구 대신 평범한 안내를 보여준다', async () => {
  await render(<PinVerify />);

  const minutes = Math.round(SESSION_TIMEOUT_MS / 60_000);
  expect(screen.queryByText(`${minutes}분 이상 자리를 비우셨네요`)).toBeNull();
  expect(screen.getByText('PIN 번호 입력')).toBeTruthy();
});

test('인증에 성공하면 세션 타임아웃 표시도 초기화된다', async () => {
  useAppLockStore.setState({ sessionTimedOut: true });
  mockedVerifyStoredPin.mockResolvedValue(true);

  await render(<PinVerify />);
  await pressDigits(CORRECT_PIN);

  expect(useAppLockStore.getState().sessionTimedOut).toBe(false);
});
