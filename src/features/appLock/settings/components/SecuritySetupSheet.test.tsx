import { fireEvent, render, screen } from '@testing-library/react-native';

import useBiometricAuth from '../../biometric/hooks/useBiometricAuth';
import { savePin } from '../../pin/utils/pinStorage';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';

import SecuritySetupSheet from './SecuritySetupSheet';

jest.mock('../../biometric/hooks/useBiometricAuth');
jest.mock('../../pin/utils/pinStorage', () => ({
  savePin: jest.fn(),
}));

const mockedUseBiometricAuth = useBiometricAuth as jest.Mock;
const mockedSavePin = savePin as jest.Mock;

async function pressDigits(digits: string) {
  for (const digit of digits) {
    await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSavePin.mockResolvedValue(undefined);
  useSecuritySettingsStore.setState({ biometricEnabled: false });
  mockedUseBiometricAuth.mockReturnValue({
    isSupported: true,
    isEnrolled: true,
    authenticate: jest.fn(),
  });
});

test('생체인증을 지원+등록한 기기면 방법 선택 화면을 보여준다', async () => {
  await render(
    <SecuritySetupSheet
      visible={true}
      onClose={jest.fn()}
      onComplete={jest.fn()}
    />,
  );

  expect(screen.getByText('어떤 방법으로 잠글까요?')).toBeTruthy();
  expect(screen.getByText('생체인증으로 설정')).toBeTruthy();
  expect(screen.getByText('PIN 번호로 할래요')).toBeTruthy();
});

test('생체인증 미지원/미등록이면 선택 화면 없이 바로 PIN 등록 폼을 보여준다', async () => {
  mockedUseBiometricAuth.mockReturnValue({
    isSupported: false,
    isEnrolled: false,
    authenticate: jest.fn(),
  });

  await render(
    <SecuritySetupSheet
      visible={true}
      onClose={jest.fn()}
      onComplete={jest.fn()}
    />,
  );

  expect(screen.queryByText('생체인증으로 설정')).toBeNull();
  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();
});

test('생체인증으로 설정을 선택해도 PIN 등록 폼이 강제로 뜬다', async () => {
  await render(
    <SecuritySetupSheet
      visible={true}
      onClose={jest.fn()}
      onComplete={jest.fn()}
    />,
  );

  await fireEvent.press(screen.getByText('생체인증으로 설정'));

  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();
  expect(useSecuritySettingsStore.getState().biometricEnabled).toBe(true);
  expect(
    screen.getByText(
      'Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요',
    ),
  ).toBeTruthy();
});

test('PIN 번호로 할래요를 선택하면 안내 문구 없이 PIN 등록 폼이 뜬다', async () => {
  await render(
    <SecuritySetupSheet
      visible={true}
      onClose={jest.fn()}
      onComplete={jest.fn()}
    />,
  );

  await fireEvent.press(screen.getByText('PIN 번호로 할래요'));

  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();
  expect(
    screen.queryByText(
      'Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요',
    ),
  ).toBeNull();
});

test('PIN 등록을 완료하면 onComplete를 호출한다', async () => {
  const onComplete = jest.fn();
  await render(
    <SecuritySetupSheet
      visible={true}
      onClose={jest.fn()}
      onComplete={onComplete}
    />,
  );

  await fireEvent.press(screen.getByText('PIN 번호로 할래요'));
  await pressDigits('1234');
  await pressDigits('1234');
  await new Promise(process.nextTick);

  expect(onComplete).toHaveBeenCalled();
});

test('visible이 false면 아무것도 렌더링하지 않는다', async () => {
  await render(
    <SecuritySetupSheet
      visible={false}
      onClose={jest.fn()}
      onComplete={jest.fn()}
    />,
  );

  expect(screen.queryByText('어떤 방법으로 잠글까요?')).toBeNull();
});
