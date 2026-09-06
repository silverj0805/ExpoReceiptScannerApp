import { fireEvent, render, screen } from '@testing-library/react-native';

import { PIN_LENGTH, savePin } from '../../utils';

import PinRegisterModal from './index';

// PIN 저장 자체(SecureStore 연동)는 utils/index.test.ts가 이미 다루므로, 여기서는
// "폼이 언제 savePin을 부르는지"만 확인하면 되도록 모킹으로 대체한다.
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  savePin: jest.fn(),
}));
const mockedSavePin = savePin as jest.Mock;

const pressDigits = async (digits: string) => {
  for (const digit of digits) {
    await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('visible이 false면 아무것도 보여주지 않는다', async () => {
  await render(
    <PinRegisterModal
      visible={false}
      biometricAlreadyEnabled={false}
      onComplete={jest.fn()}
    />,
  );

  expect(screen.queryByText('PIN 번호를 설정해주세요')).toBeNull();
});

test('visible이 true면 PIN 설정 안내를 보여준다', async () => {
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={jest.fn()}
    />,
  );

  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();
});

test('biometricAlreadyEnabled가 true면 생체인증과 함께 등록하는 이유를 안내한다', async () => {
  await render(
    <PinRegisterModal visible biometricAlreadyEnabled onComplete={jest.fn()} />,
  );

  expect(
    screen.getByText(
      'Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요',
    ),
  ).toBeTruthy();
});

test('biometricAlreadyEnabled가 false면 안내 배너를 보여주지 않는다', async () => {
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={jest.fn()}
    />,
  );

  expect(
    screen.queryByText(
      'Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요',
    ),
  ).toBeNull();
});

test(`${PIN_LENGTH}자리를 입력하면 재입력(확인) 단계로 넘어간다`, async () => {
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={jest.fn()}
    />,
  );

  await pressDigits('1'.repeat(PIN_LENGTH));

  expect(screen.getByText('다시 한 번 입력해주세요')).toBeTruthy();
});

test('확인 단계에서 같은 값을 입력하면 PIN이 저장되고 onComplete가 호출된다', async () => {
  const onComplete = jest.fn();
  mockedSavePin.mockResolvedValue(undefined);
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={onComplete}
    />,
  );

  await pressDigits('1234'.slice(0, PIN_LENGTH));
  await pressDigits('1234'.slice(0, PIN_LENGTH));

  expect(mockedSavePin).toHaveBeenCalledWith('1234'.slice(0, PIN_LENGTH));
  expect(onComplete).toHaveBeenCalled();
});

test('확인 단계에서 다른 값을 입력하면 에러를 보여주고 다시 입력받는다', async () => {
  const onComplete = jest.fn();
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={onComplete}
    />,
  );

  await pressDigits('1'.repeat(PIN_LENGTH));
  await pressDigits('9'.repeat(PIN_LENGTH));

  expect(
    screen.getByText('PIN이 일치하지 않아요. 다시 입력해주세요.'),
  ).toBeTruthy();
  expect(mockedSavePin).not.toHaveBeenCalled();
  expect(onComplete).not.toHaveBeenCalled();
});

// SecureStore 접근 자체가 실패하는(키체인 접근 실패 등) 드문 상황을 대비한다 —
// 이전엔 try/catch가 없어서 이런 경우 아무 피드백 없이 화면이 그냥 멈춘 것처럼
// 보였다.
test('PIN 저장이 실패하면 에러 메시지를 보여주고 다시 입력받는다', async () => {
  const onComplete = jest.fn();
  mockedSavePin.mockRejectedValue(new Error('keychain error'));
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={onComplete}
    />,
  );

  await pressDigits('1'.repeat(PIN_LENGTH));
  await pressDigits('1'.repeat(PIN_LENGTH));

  expect(
    await screen.findByText('PIN 저장에 실패했어요. 다시 시도해주세요.'),
  ).toBeTruthy();
  expect(onComplete).not.toHaveBeenCalled();
  // 재입력을 받을 수 있어야 하므로 확인 단계에 그대로 머물러 있고, 입력값은
  // 비어 있어야 한다(점이 다시 4개 다 비어 있음).
  expect(screen.getByText('다시 한 번 입력해주세요')).toBeTruthy();
  for (let i = 0; i < PIN_LENGTH; i++) {
    expect(
      screen.getByTestId(`pin-dot-${i}`).props.accessibilityState.selected,
    ).toBe(false);
  }
});

test('PIN 저장 실패 후 다시 입력하면 정상적으로 저장된다', async () => {
  const onComplete = jest.fn();
  mockedSavePin
    .mockRejectedValueOnce(new Error('keychain error'))
    .mockResolvedValueOnce(undefined);
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={onComplete}
    />,
  );

  await pressDigits('1'.repeat(PIN_LENGTH));
  await pressDigits('1'.repeat(PIN_LENGTH));
  await screen.findByText('PIN 저장에 실패했어요. 다시 시도해주세요.');

  await pressDigits('1'.repeat(PIN_LENGTH));

  expect(mockedSavePin).toHaveBeenCalledTimes(2);
  expect(onComplete).toHaveBeenCalled();
});

test('지우기 키를 누르면 마지막으로 입력한 숫자가 지워진다', async () => {
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={jest.fn()}
    />,
  );

  await pressDigits('123');
  await fireEvent.press(screen.getByTestId('pin-key-delete'));
  await pressDigits('4');
  await pressDigits('4');

  // 마지막 입력을 지운 뒤 4를 눌러 "1234"가 됐고, 그 다음 확인 단계에서 "4"를
  // 입력했으니(4자리 아직 안 채워짐) 여전히 확인 단계에 머물러 있어야 한다.
  expect(screen.getByText('다시 한 번 입력해주세요')).toBeTruthy();
});

test('모달을 닫았다가 다시 열면 처음 단계로 초기화된다', async () => {
  const { rerender } = await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={jest.fn()}
    />,
  );

  await pressDigits('1'.repeat(PIN_LENGTH));
  expect(screen.getByText('다시 한 번 입력해주세요')).toBeTruthy();

  await rerender(
    <PinRegisterModal
      visible={false}
      biometricAlreadyEnabled={false}
      onComplete={jest.fn()}
    />,
  );
  await rerender(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={jest.fn()}
    />,
  );

  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();
});
