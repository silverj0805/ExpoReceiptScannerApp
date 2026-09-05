import { fireEvent, render, screen } from '@testing-library/react-native';

import { savePin } from '../utils/pinStorage';

import PinRegisterForm from './PinRegisterForm';

jest.mock('../utils/pinStorage', () => ({
  savePin: jest.fn(),
}));

const mockedSavePin = savePin as jest.Mock;

async function pressDigits(digits: string) {
  for (const digit of digits) {
    await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSavePin.mockResolvedValue(undefined);
});

test('1차 4자리를 입력하면 재확인 단계로 전환된다', async () => {
  await render(
    <PinRegisterForm biometricAlreadyEnabled={false} onComplete={jest.fn()} />,
  );

  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();

  await pressDigits('1234');

  expect(screen.getByText('다시 한 번 입력해주세요')).toBeTruthy();
});

test('재확인 입력이 1차와 일치하면 savePin을 호출하고 onComplete를 부른다', async () => {
  const onComplete = jest.fn();
  await render(
    <PinRegisterForm biometricAlreadyEnabled={false} onComplete={onComplete} />,
  );

  await pressDigits('1234');
  await screen.findByText('다시 한 번 입력해주세요');
  await pressDigits('1234');

  await new Promise(process.nextTick);

  expect(mockedSavePin).toHaveBeenCalledWith('1234');
  expect(onComplete).toHaveBeenCalled();
});

test('재확인 입력이 1차와 다르면 에러를 보여주고 재확인 입력만 초기화한다', async () => {
  const onComplete = jest.fn();
  await render(
    <PinRegisterForm biometricAlreadyEnabled={false} onComplete={onComplete} />,
  );

  await pressDigits('1234');
  await screen.findByText('다시 한 번 입력해주세요');
  await pressDigits('9999');

  expect(
    await screen.findByText('PIN이 일치하지 않아요. 다시 입력해주세요.'),
  ).toBeTruthy();
  expect(mockedSavePin).not.toHaveBeenCalled();
  expect(onComplete).not.toHaveBeenCalled();

  // 재확인 단계는 그대로 유지된 채 입력만 비워져 있어야 하므로, 맞는 값을 다시 넣으면 성공해야 한다.
  await pressDigits('1234');
  await new Promise(process.nextTick);

  expect(mockedSavePin).toHaveBeenCalledWith('1234');
  expect(onComplete).toHaveBeenCalled();
});

test('biometricAlreadyEnabled가 true면 안내 문구를 보여준다', async () => {
  await render(
    <PinRegisterForm biometricAlreadyEnabled={true} onComplete={jest.fn()} />,
  );

  expect(
    screen.getByText(
      'Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요',
    ),
  ).toBeTruthy();
});

test('biometricAlreadyEnabled가 false면 안내 문구를 보여주지 않는다', async () => {
  await render(
    <PinRegisterForm biometricAlreadyEnabled={false} onComplete={jest.fn()} />,
  );

  expect(
    screen.queryByText(
      'Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요',
    ),
  ).toBeNull();
});

test('삭제 버튼을 누르면 마지막 입력 자리가 지워진다', async () => {
  await render(
    <PinRegisterForm biometricAlreadyEnabled={false} onComplete={jest.fn()} />,
  );

  await pressDigits('123');
  await fireEvent.press(screen.getByTestId('pin-key-delete'));
  await pressDigits('4');

  // 3자리(123)에서 하나 지우고(12) 4를 눌러 124가 됐으니, 아직 4자리를 못 채워 재확인 단계로
  // 안 넘어간 상태여야 한다.
  expect(screen.queryByText('다시 한 번 입력해주세요')).toBeNull();

  await pressDigits('4');
  expect(screen.getByText('다시 한 번 입력해주세요')).toBeTruthy();
});
