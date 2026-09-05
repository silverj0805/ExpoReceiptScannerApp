import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { getVersion } from 'react-native-device-info';

import useBiometricAuth from '@/features/appLock/biometric/hooks/useBiometricAuth';
import useSecuritySetupStatus from '@/features/appLock/settings/hooks/useSecuritySetupStatus';
import { useSecuritySettingsStore } from '@/features/appLock/settings/store/useSecuritySettingsStore';

import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../constants/urls';

import SettingsScreen from './SettingsScreen';

// expo-router의 router는 실제 네비게이션 컨테이너 없이 호출하면 동작하지 않으므로,
// CLI 버전이 @react-navigation/native의 useNavigation을 모킹했던 것과 동일하게
// router.push/back을 직접 모킹한다.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
const mockedRouter = router as unknown as { push: jest.Mock; back: jest.Mock };
const mockedGetVersion = getVersion as jest.Mock;

jest.mock('@/features/appLock/settings/hooks/useSecuritySetupStatus');
const mockedUseSecuritySetupStatus = useSecuritySetupStatus as jest.Mock;

jest.mock('@/features/appLock/biometric/hooks/useBiometricAuth');
const mockedUseBiometricAuth = useBiometricAuth as jest.Mock;

// SecuritySetupSheet 자체 동작(생체인증 선택/PIN 등록)은 appLock 쪽에서 이미 테스트했으니,
// 여기서는 "설정 화면이 이 Sheet를 여는지"만 확인하면 되므로 가벼운 스텁으로 대체한다.
jest.mock('@/features/appLock/settings/components/SecuritySetupSheet', () => {
  // jest.mock 팩토리는 호이스팅돼서 바깥(모듈 최상단) import를 참조할 수 없어 인라인
  // require가 불가피함(ScanScreen.test.tsx와 같은 패턴).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return function MockSecuritySetupSheet({ visible }: { visible: boolean }) {
    if (!visible) return null;
    return <Text>mock security sheet</Text>;
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetVersion.mockReturnValue('1.0.0');
  useSecuritySettingsStore.setState({ biometricEnabled: false });
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: false,
    isLoading: false,
  });
  // 기본값은 생체인증 지원+등록된 기기 — "변경하기" 버튼이 보이는 게 기본 케이스이므로.
  // 미지원/미등록 케이스는 SettingSecuritySection.test.tsx에서 직접 다룬다.
  mockedUseBiometricAuth.mockReturnValue({
    isSupported: true,
    isEnrolled: true,
    authenticate: jest.fn(),
  });
});

test('설정 타이틀을 보여준다', async () => {
  await render(<SettingsScreen />);

  expect(screen.getByText('설정')).toBeTruthy();
});

test('오픈소스 라이센스 항목과 앱 버전을 보여준다', async () => {
  await render(<SettingsScreen />);

  expect(screen.getByText('오픈소스 라이센스')).toBeTruthy();
  expect(screen.getByText('앱 버전')).toBeTruthy();
  expect(screen.getByTestId('settings-app-version')).toHaveTextContent('1.0.0');
});

test('오픈소스 라이센스를 누르면 License 화면으로 이동한다', async () => {
  await render(<SettingsScreen />);

  await fireEvent.press(screen.getByTestId('settings-license-row'));

  expect(mockedRouter.push).toHaveBeenCalledWith('/settings/license');
});

test('개인정보처리방침을 누르면 해당 URL로 WebView 화면을 연다', async () => {
  await render(<SettingsScreen />);

  await fireEvent.press(screen.getByTestId('settings-privacy-policy-row'));

  expect(mockedRouter.push).toHaveBeenCalledWith({
    pathname: '/settings/webview',
    params: { url: PRIVACY_POLICY_URL, title: '개인정보처리방침' },
  });
});

test('이용약관을 누르면 해당 URL로 WebView 화면을 연다', async () => {
  await render(<SettingsScreen />);

  await fireEvent.press(screen.getByTestId('settings-terms-of-service-row'));

  expect(mockedRouter.push).toHaveBeenCalledWith({
    pathname: '/settings/webview',
    params: { url: TERMS_OF_SERVICE_URL, title: '이용약관' },
  });
});

test('뒤로가기 버튼을 누르면 이전 화면으로 돌아간다', async () => {
  await render(<SettingsScreen />);

  await fireEvent.press(screen.getByTestId('settings-back-button'));

  expect(mockedRouter.back).toHaveBeenCalled();
});

test('보안이 미설정 상태면 "보안 잠금 설정하기" 행을 보여준다', async () => {
  await render(<SettingsScreen />);

  expect(screen.getByText('보안 잠금 설정하기')).toBeTruthy();
  expect(screen.queryByText('보안 잠금 방법')).toBeNull();
  expect(screen.queryByText('변경하기')).toBeNull();
});

test('"보안 잠금 설정하기"를 누르면 인증 설정 Sheet가 열린다', async () => {
  await render(<SettingsScreen />);

  await fireEvent.press(screen.getByTestId('settings-security-setup-button'));

  expect(screen.getByText('mock security sheet')).toBeTruthy();
});

test('보안이 설정된 상태면 생체인식이 켜져 있는지에 따라 현재 방법을 보여준다', async () => {
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
  });
  useSecuritySettingsStore.setState({ biometricEnabled: true });

  await render(<SettingsScreen />);

  expect(screen.getByText('보안 잠금 방법')).toBeTruthy();
  expect(screen.getByText('생체인식')).toBeTruthy();
  expect(screen.queryByText('보안 잠금 설정하기')).toBeNull();
});

test('생체인증이 꺼져 있으면 현재 방법을 PIN 번호로 보여준다', async () => {
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
  });
  useSecuritySettingsStore.setState({ biometricEnabled: false });

  await render(<SettingsScreen />);

  expect(screen.getByText('PIN 번호')).toBeTruthy();
});

test('"변경하기"를 누르면 인증 설정 Sheet가 열린다', async () => {
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
  });

  await render(<SettingsScreen />);

  await fireEvent.press(screen.getByTestId('settings-security-change-button'));

  expect(screen.getByText('mock security sheet')).toBeTruthy();
});
