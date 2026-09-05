import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { clearPin } from '../../pin/utils/pinStorage';
import useSecuritySetupStatus from '../hooks/useSecuritySetupStatus';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';

import useBiometricAuth from '../../biometric/hooks/useBiometricAuth';
import SettingSecuritySection from './SettingSecuritySection';

jest.mock('../hooks/useSecuritySetupStatus');
const mockedUseSecuritySetupStatus = useSecuritySetupStatus as jest.Mock;

jest.mock('../../biometric/hooks/useBiometricAuth');
const mockedUseBiometricAuth = useBiometricAuth as jest.Mock;

jest.mock('../../pin/utils/pinStorage', () => ({
  clearPin: jest.fn(),
}));
const mockedClearPin = clearPin as jest.Mock;

// SecuritySetupSheet 자체 동작은 appLock 쪽에서 이미 테스트했으니, 여기서는
// "이 화면이 Sheet를 여는지"만 확인하면 되므로 가벼운 스텁으로 대체한다.
jest.mock('./SecuritySetupSheet', () => {
  // jest.mock 팩토리는 호이스팅돼서 바깥(모듈 최상단) import를 참조할 수 없어 인라인
  // require가 불가피함(SettingsScreen.test.tsx와 같은 패턴).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return function MockSecuritySetupSheet({ visible }: { visible: boolean }) {
    if (!visible) return null;
    return <Text>mock security sheet</Text>;
  };
});

// 실제 Alert을 띄우면 Jest에서 못 다루니 스파이로 대체(ReceiptDetailScreen.test.tsx와 동일 패턴).
jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const mockedAlert = Alert.alert as jest.Mock;

// destructive.onPress()가 clearPin()(비동기)을 트리거하므로 반드시
// await act(async () => ...)로 감싸야 함(ReceiptDetailScreen.test.tsx와 동일한 이유).
const pressDestructiveAlertButton = async () => {
  const buttons = mockedAlert.mock.calls[mockedAlert.mock.calls.length - 1][2];
  const destructive = buttons.find(
    (button: { style?: string }) => button.style === 'destructive',
  );
  await act(async () => {
    await destructive.onPress();
  });
};

const mockedRefetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockedClearPin.mockResolvedValue(undefined);
  useSecuritySettingsStore.setState({ biometricEnabled: false });
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: false,
    isLoading: false,
    refetch: mockedRefetch,
  });
  // 기본값은 생체인증 지원+등록된 기기 — "변경하기" 버튼이 보이는 게 기본 케이스이므로.
  // 미지원/미등록 케이스는 해당 테스트에서 개별적으로 덮어쓴다.
  mockedUseBiometricAuth.mockReturnValue({
    isSupported: true,
    isEnrolled: true,
    authenticate: jest.fn(),
  });
});

test('보안이 미설정 상태면 "보안 잠금 설정하기" 행을 보여준다', async () => {
  await render(<SettingSecuritySection />);

  expect(screen.getByText('보안 잠금 설정하기')).toBeTruthy();
  expect(screen.queryByText('보안 잠금 방법')).toBeNull();
  expect(screen.queryByText('인증 초기화')).toBeNull();
});

test('"보안 잠금 설정하기"를 누르면 인증 설정 Sheet가 열린다', async () => {
  await render(<SettingSecuritySection />);

  await fireEvent.press(screen.getByTestId('settings-security-setup-button'));

  expect(screen.getByText('mock security sheet')).toBeTruthy();
});

test('보안이 설정된 상태면 현재 방법과 "인증 초기화" 행을 보여준다', async () => {
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
    refetch: mockedRefetch,
  });

  await render(<SettingSecuritySection />);

  expect(screen.getByText('보안 잠금 방법')).toBeTruthy();
  expect(screen.getByText('PIN 번호')).toBeTruthy();
  expect(screen.getByText('인증 초기화')).toBeTruthy();
  expect(screen.queryByText('보안 잠금 설정하기')).toBeNull();
});

test('생체인증을 지원+등록한 기기면 "변경하기" 버튼을 보여준다', async () => {
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
    refetch: mockedRefetch,
  });

  await render(<SettingSecuritySection />);

  expect(screen.getByTestId('settings-security-change-button')).toBeTruthy();
});

test('생체인증을 지원하지 않거나 등록 안 돼 있으면 "변경하기" 버튼을 안 보여준다', async () => {
  mockedUseBiometricAuth.mockReturnValue({
    isSupported: false,
    isEnrolled: false,
    authenticate: jest.fn(),
  });
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
    refetch: mockedRefetch,
  });

  await render(<SettingSecuritySection />);

  // 바꿀 대체 수단이 없으니(PIN만 유일한 방법) "변경하기" 자체가 의미 없어서 숨긴다.
  expect(screen.queryByTestId('settings-security-change-button')).toBeNull();
  // 다른 행(현재 방법 표시, 인증 초기화)은 그대로 보여야 한다.
  expect(screen.getByText('보안 잠금 방법')).toBeTruthy();
  expect(screen.getByText('인증 초기화')).toBeTruthy();
});

test('"변경하기"를 누르면 인증 설정 Sheet가 열린다', async () => {
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
    refetch: mockedRefetch,
  });

  await render(<SettingSecuritySection />);

  await fireEvent.press(screen.getByTestId('settings-security-change-button'));

  expect(screen.getByText('mock security sheet')).toBeTruthy();
});

test('"초기화"를 누르면 확인 Alert을 띄우고, 확인 전에는 아무 것도 지우지 않는다', async () => {
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
    refetch: mockedRefetch,
  });

  await render(<SettingSecuritySection />);

  await fireEvent.press(screen.getByTestId('settings-security-reset-button'));

  expect(mockedAlert).toHaveBeenCalled();
  const [title, , buttons] = mockedAlert.mock.calls[0];
  expect(title).toContain('초기화');
  expect(buttons.some((b: { style?: string }) => b.style === 'cancel')).toBe(
    true,
  );
  expect(mockedClearPin).not.toHaveBeenCalled();
});

test('Alert에서 확인하면 PIN을 지우고 생체인증을 끄고 상태를 다시 조회한다', async () => {
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
    refetch: mockedRefetch,
  });
  useSecuritySettingsStore.setState({ biometricEnabled: true });

  await render(<SettingSecuritySection />);

  await fireEvent.press(screen.getByTestId('settings-security-reset-button'));
  await pressDestructiveAlertButton();
  await new Promise(process.nextTick);

  expect(mockedClearPin).toHaveBeenCalled();
  expect(useSecuritySettingsStore.getState().biometricEnabled).toBe(false);
  expect(mockedRefetch).toHaveBeenCalled();
  // Task 계획대로 초기화 후 설정 Sheet를 자동으로 다시 열지 않는다.
  expect(screen.queryByText('mock security sheet')).toBeNull();
});
