import { act, fireEvent, render, screen } from '@testing-library/react-native';

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

  await pressDigits('1'.repeat(PIN_LENGTH));
  await pressDigits('1'.repeat(PIN_LENGTH));

  expect(mockedSavePin).toHaveBeenCalledWith('1'.repeat(PIN_LENGTH));
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

// handlePressDigit의 길이 가드(currentPin.length >= PIN_LENGTH)가 클로저 값을
// 참조하므로, 같은 렌더 사이클 안에서 마지막 자리를 극히 빠르게 두 번 누르면
// 둘 다 "아직 덜 채워짐"으로 읽어 savePin/onComplete가 중복 호출될 수 있었다.
// savePin이 아직 안 끝난 상태에서 같은 이벤트 틱 안에 두 번째 탭을 재현해서
// 검증한다.
test('마지막 자리를 아주 빠르게 두 번 누르면 저장은 한 번만 일어난다', async () => {
  const onComplete = jest.fn();
  let resolveSave: () => void = () => {};
  mockedSavePin.mockImplementation(
    () =>
      new Promise<void>(resolve => {
        resolveSave = resolve;
      }),
  );
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={onComplete}
    />,
  );

  await pressDigits('1'.repeat(PIN_LENGTH)); // 1단계 완료 → 확인 단계
  await pressDigits('1'.repeat(PIN_LENGTH - 1)); // 확인 단계 마지막 한 자리 전까지

  // 마지막 자리를 "동시에" 두 번 누른 것처럼, 첫 번째 호출의 savePin이 아직
  // resolve되지 않은 상태에서 두 번째 탭을 바로 이어 붙인다 — 두 호출 다
  // await하지 않고 동기적으로 이어서 호출해야 실제 "거의 동시에 두 번 탭"과
  // 같은 타이밍(첫 호출이 상태를 반영해 리렌더되기 전에 두 번째 호출이 시작됨)을
  // 재현한다.
  const lastKey = screen.getByTestId('pin-key-1');
  await act(() => {
    fireEvent.press(lastKey);
    fireEvent.press(lastKey);
  });

  expect(mockedSavePin).toHaveBeenCalledTimes(1);
  expect(onComplete).not.toHaveBeenCalled();

  await act(async () => {
    resolveSave();
  });

  expect(onComplete).toHaveBeenCalledTimes(1);
});

test('지우기 키를 누르면 마지막으로 입력한 숫자가 지워진다', async () => {
  await render(
    <PinRegisterModal
      visible
      biometricAlreadyEnabled={false}
      onComplete={jest.fn()}
    />,
  );

  // (PIN_LENGTH - 1)자리를 입력한 뒤 지우기로 하나를 지우고 다시 채워서
  // 1단계(PIN_LENGTH자리)를 끝낸다.
  await pressDigits('1'.repeat(PIN_LENGTH - 1));
  await fireEvent.press(screen.getByTestId('pin-key-delete'));
  await pressDigits('1'.repeat(PIN_LENGTH - 1));
  expect(screen.getByText('다시 한 번 입력해주세요')).toBeTruthy();

  // 확인 단계에서 한 자리만 입력했으니(PIN_LENGTH자리 아직 안 채워짐) 여전히
  // 확인 단계에 머물러 있어야 한다.
  await pressDigits('1');
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
