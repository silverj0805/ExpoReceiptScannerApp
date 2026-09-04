import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { licenseData } from '../../constants/licenseData';

import LicenseScreen from './LicenseScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
const mockedRouter = router as unknown as { back: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

const axios = licenseData.find(item => item.packageName === 'axios')!;

test('헤더 타이틀을 보여준다', async () => {
  await render(<LicenseScreen />);

  expect(screen.getByText('오픈소스 라이센스')).toBeTruthy();
});

test('package.json dependencies의 패키지명/버전/라이센스명을 목록으로 보여준다', async () => {
  await render(<LicenseScreen />);

  expect(
    screen.getByText(`${axios.packageName} (${axios.version})`),
  ).toBeTruthy();
  expect(screen.getAllByText(axios.licenseName).length).toBeGreaterThan(0);
});

test('패키지 항목을 누르면 저장소 링크를 연다', async () => {
  await render(<LicenseScreen />);

  await fireEvent.press(
    screen.getByTestId(`license-item-${axios.packageName}`),
  );

  expect(Linking.openURL).toHaveBeenCalledWith(axios.repositoryUrl);
});

test('뒤로가기 버튼을 누르면 이전 화면으로 돌아간다', async () => {
  await render(<LicenseScreen />);

  await fireEvent.press(screen.getByTestId('license-back-button'));

  expect(mockedRouter.back).toHaveBeenCalled();
});
