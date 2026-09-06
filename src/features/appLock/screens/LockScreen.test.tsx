import { fireEvent, render, screen } from '@testing-library/react-native';

import { useSecuritySettingsStore } from '../settings/store/useSecuritySettingsStore';

import LockScreen from './LockScreen';

async function pressDigits(digits: string) {
  for (const digit of digits) {
    await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
}

let authenticateWithBiometrics: jest.Mock;
let authenticateWithPin: jest.Mock;

// LockScreen은 useAppLock()을 직접 부르지 않고 전부 props로 받는다(_layout.tsx가 한 번만
// 호출해서 내려주는 구조 — 실제 버그 재현 후 그렇게 고침, LockScreen.tsx의 docstring 참고).
// 그래서 여기선 훅을 mock하지 않고 props를 직접 넘긴다.
function renderLockScreen(
  overrides: Partial<Parameters<typeof LockScreen>[0]> = {},
) {
  const defaultProps = {
    isRelock: false,
    isSupported: true,
    isEnrolled: true,
    isPinLockedOut: false,
    remainingPinAttempts: 5,
    pinLockoutRemainingMs: null,
    authenticateWithBiometrics,
    authenticateWithPin,
  };

  return render(<LockScreen {...defaultProps} {...overrides} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  useSecuritySettingsStore.setState({ biometricEnabled: true });

  authenticateWithBiometrics = jest
    .fn()
    .mockResolvedValue({ success: false, isLockedOut: false });
  authenticateWithPin = jest.fn().mockResolvedValue(false);
});

test('생체인증을 쓸 수 있으면(지원+등록+활성화) 마운트 즉시 자동으로 시도한다', async () => {
  await renderLockScreen();

  expect(authenticateWithBiometrics).toHaveBeenCalled();
});

test('생체인증이 지원+등록돼 있어도 사용자가 꺼놨으면(biometricEnabled: false) 자동 시도하지 않고 바로 PIN 입력을 보여준다', async () => {
  useSecuritySettingsStore.setState({ biometricEnabled: false });

  await renderLockScreen();

  expect(authenticateWithBiometrics).not.toHaveBeenCalled();
  expect(screen.getByText('PIN 번호 입력')).toBeTruthy();
});

test('기기가 생체인증을 지원하지 않으면 자동 시도하지 않고 바로 PIN 입력을 보여준다', async () => {
  await renderLockScreen({ isSupported: false, isEnrolled: false });

  expect(authenticateWithBiometrics).not.toHaveBeenCalled();
  expect(screen.getByText('PIN 번호 입력')).toBeTruthy();
  // 생체인증 자체를 못 쓰는 기기라 PIN 화면에도 전환 링크가 없어야 한다.
  expect(screen.queryByText('Face ID로 전환')).toBeNull();
});

test('생체인증에 실패(OS lockout 아님)하면 재시도 화면을 보여준다', async () => {
  await renderLockScreen();
  await new Promise(process.nextTick);

  expect(screen.getByText('Face ID로 잠금 해제')).toBeTruthy();
  expect(screen.getByTestId('biometric-retry')).toBeTruthy();
});

test('"다시 시도"를 누르면 생체인증을 다시 시도한다', async () => {
  await renderLockScreen();
  await new Promise(process.nextTick);
  authenticateWithBiometrics.mockClear();

  await fireEvent.press(screen.getByTestId('biometric-retry'));

  expect(authenticateWithBiometrics).toHaveBeenCalledTimes(1);
});

test('"PIN 번호로 할래요"를 누르면 PIN 입력 화면으로 전환한다', async () => {
  await renderLockScreen();
  await new Promise(process.nextTick);

  await fireEvent.press(screen.getByTestId('switch-to-pin'));

  expect(screen.getByText('PIN 번호 입력')).toBeTruthy();
});

test('생체인증이 OS 레벨 lockout이면 자동으로 PIN 입력 화면으로 전환한다', async () => {
  authenticateWithBiometrics.mockResolvedValue({
    success: false,
    isLockedOut: true,
  });

  await renderLockScreen();
  await new Promise(process.nextTick);

  expect(screen.getByText('PIN 번호 입력')).toBeTruthy();
});

test('생체인증을 쓸 수 있으면 PIN 화면에 "Face ID로 전환" 링크가 있고, 누르면 생체인증을 다시 시도한다', async () => {
  await renderLockScreen();
  await new Promise(process.nextTick);
  await fireEvent.press(screen.getByTestId('switch-to-pin'));
  authenticateWithBiometrics.mockClear();

  await fireEvent.press(screen.getByText('Face ID로 전환'));

  expect(authenticateWithBiometrics).toHaveBeenCalledTimes(1);
});

test('PIN을 입력하면 authenticateWithPin으로 연결된다', async () => {
  useSecuritySettingsStore.setState({ biometricEnabled: false });
  authenticateWithPin.mockResolvedValue(true);

  await renderLockScreen();

  await pressDigits('1234');
  await new Promise(process.nextTick);

  expect(authenticateWithPin).toHaveBeenCalledWith('1234');
});

test('시도 횟수 제한에 걸리면 잠금 안내 화면(제목/카운트다운)을 보여준다', async () => {
  await renderLockScreen({
    isPinLockedOut: true,
    remainingPinAttempts: 0,
    pinLockoutRemainingMs: 120_000,
  });
  await new Promise(process.nextTick);
  await fireEvent.press(screen.getByTestId('switch-to-pin'));

  expect(screen.getByText('PIN이 잠겼어요')).toBeTruthy();
  expect(screen.getByText('02:00')).toBeTruthy();
});

test('isRelock=true면 "5분 이상 자리를 비우셨어요" 문구를 보여준다(생체인증 화면)', async () => {
  await renderLockScreen({ isRelock: true });
  await new Promise(process.nextTick);

  expect(screen.getByText('5분 이상 자리를 비우셨어요')).toBeTruthy();
});

test('isRelock=false면 컨텍스트 문구를 보여주지 않는다', async () => {
  await renderLockScreen({ isRelock: false });
  await new Promise(process.nextTick);

  expect(screen.queryByText('5분 이상 자리를 비우셨어요')).toBeNull();
});

test('isRelock=true면 PIN 화면에서도 컨텍스트 문구를 보여준다', async () => {
  useSecuritySettingsStore.setState({ biometricEnabled: false });

  await renderLockScreen({ isRelock: true });

  expect(screen.getByText('5분 이상 자리를 비우셨어요')).toBeTruthy();
  expect(screen.getByText('PIN 번호 입력')).toBeTruthy();
});
