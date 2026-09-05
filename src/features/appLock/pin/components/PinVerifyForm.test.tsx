import { fireEvent, render, screen } from '@testing-library/react-native';

import PinVerifyForm from './PinVerifyForm';

async function pressDigits(digits: string) {
  for (const digit of digits) {
    await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
}

const defaultProps = {
  isPinLockedOut: false,
  remainingPinAttempts: 5,
  pinLockoutRemainingMs: null,
  onSubmitPin: jest.fn(),
  onSuccess: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('PIN 4자리를 입력해 맞으면 onSubmitPin을 호출하고 onSuccess를 부른다', async () => {
  const onSubmitPin = jest.fn().mockResolvedValue(true);
  const onSuccess = jest.fn();
  await render(
    <PinVerifyForm
      {...defaultProps}
      onSubmitPin={onSubmitPin}
      onSuccess={onSuccess}
    />,
  );

  await pressDigits('1234');
  await new Promise(process.nextTick);

  expect(onSubmitPin).toHaveBeenCalledWith('1234');
  expect(onSuccess).toHaveBeenCalled();
});

test('PIN이 틀리면 에러를 보여주고 입력을 초기화한다(onSuccess는 안 부름)', async () => {
  const onSubmitPin = jest.fn().mockResolvedValue(false);
  const onSuccess = jest.fn();
  await render(
    <PinVerifyForm
      {...defaultProps}
      onSubmitPin={onSubmitPin}
      onSuccess={onSuccess}
    />,
  );

  await pressDigits('0000');

  expect(
    await screen.findByText('PIN이 틀렸어요. 다시 입력해주세요.'),
  ).toBeTruthy();
  expect(onSuccess).not.toHaveBeenCalled();

  // 입력이 비워졌으니 다시 4자리를 눌러야 재시도가 된다.
  onSubmitPin.mockResolvedValue(true);
  await pressDigits('1234');
  await new Promise(process.nextTick);

  expect(onSuccess).toHaveBeenCalled();
});

test('남은 시도 횟수를 안내 문구로 보여준다', async () => {
  await render(<PinVerifyForm {...defaultProps} remainingPinAttempts={3} />);

  expect(screen.getByText('남은 시도 횟수 3회')).toBeTruthy();
});

test('시도 횟수 제한에 걸리면 키패드를 막고 남은 시간을 카운트다운으로 보여준다', async () => {
  const onSubmitPin = jest.fn();
  await render(
    <PinVerifyForm
      {...defaultProps}
      isPinLockedOut={true}
      pinLockoutRemainingMs={272_000}
      onSubmitPin={onSubmitPin}
    />,
  );

  expect(screen.getByText('04:32')).toBeTruthy();

  await pressDigits('1234');

  expect(onSubmitPin).not.toHaveBeenCalled();
});
