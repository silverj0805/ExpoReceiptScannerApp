import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { getVersion } from 'react-native-device-info';

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

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetVersion.mockReturnValue('1.0.0');
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
