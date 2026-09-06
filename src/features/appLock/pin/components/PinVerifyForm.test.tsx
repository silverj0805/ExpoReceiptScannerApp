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

// 목업(PinLockedOut.dc.html)과 매칭: 잠기면 항상(onSwitchToBiometric 유무와 무관하게)
// 아이콘 + "PIN이 잠겼어요" 제목 + 설명 + 큰 카운트다운으로 된 안내 화면을 보여주고
// 키패드는 막는다 — 예전엔 onSwitchToBiometric이 있을 때만 이 화면을 쓰고 없으면
// "PIN 번호 입력" 제목 그대로 두는 별도의(목업과 안 맞는) 화면을 썼었다.
test('시도 횟수 제한에 걸리면 키패드를 막고 잠금 안내 화면(아이콘/제목/카운트다운)을 보여준다', async () => {
  const onSubmitPin = jest.fn();
  await render(
    <PinVerifyForm
      {...defaultProps}
      isPinLockedOut={true}
      pinLockoutRemainingMs={272_000}
      onSubmitPin={onSubmitPin}
    />,
  );

  expect(screen.getByText('PIN이 잠겼어요')).toBeTruthy();
  expect(screen.getByText('04:32')).toBeTruthy();
  expect(screen.queryByText('PIN 번호 입력')).toBeNull();

  await pressDigits('1234');

  expect(onSubmitPin).not.toHaveBeenCalled();
});

// 실기기 재현으로 확인한 문제: 5번째 실패 직후 이 폼의 로컬 error state("PIN이
// 틀렸어요...")가 아직 안 지워진 채로 usePinLock의 isPinLockedOut이 true로 바뀌어서,
// 카운트다운과 옛날 에러 문구가 동시에 보였다. 잠기는 순간 그 에러는 사라지고, 대신
// "시간 후에 다시 시도해주세요" 안내가 카운트다운 밑에 보여야 한다(사용자 요구사항).
test('시도 횟수 제한에 걸리면 이전 PIN 오류 문구 대신 재시도 안내 문구를 보여준다', async () => {
  const onSubmitPin = jest.fn().mockResolvedValue(false);
  const { rerender } = await render(
    <PinVerifyForm {...defaultProps} onSubmitPin={onSubmitPin} />,
  );

  // 잠기기 직전 마지막 실패가 남긴 에러 문구.
  await pressDigits('0000');
  expect(
    await screen.findByText('PIN이 틀렸어요. 다시 입력해주세요.'),
  ).toBeTruthy();

  // usePinLock이 그 실패를 5번째로 세고 잠금을 걸어서 isPinLockedOut이 true가 된 상황.
  await rerender(
    <PinVerifyForm
      {...defaultProps}
      isPinLockedOut={true}
      pinLockoutRemainingMs={300_000}
      onSubmitPin={onSubmitPin}
    />,
  );

  expect(screen.queryByText('PIN이 틀렸어요. 다시 입력해주세요.')).toBeNull();
  expect(screen.getByText('시간 후에 다시 시도해주세요')).toBeTruthy();
});

test('onSwitchToBiometric이 있고 잠기지 않았으면 "Face ID로 전환" 링크를 보여준다', async () => {
  const onSwitchToBiometric = jest.fn();
  await render(
    <PinVerifyForm
      {...defaultProps}
      onSwitchToBiometric={onSwitchToBiometric}
    />,
  );

  await fireEvent.press(screen.getByText('Face ID로 전환'));

  expect(onSwitchToBiometric).toHaveBeenCalled();
});

test('onSwitchToBiometric이 없으면 "Face ID로 전환" 링크를 안 보여준다', async () => {
  await render(<PinVerifyForm {...defaultProps} />);

  expect(screen.queryByText('Face ID로 전환')).toBeNull();
});

// 목업엔 "Face ID로 잠금 해제" 버튼이 있지만, 사용자 요구사항으로 그 버튼은 뺀다 —
// onSwitchToBiometric을 넘겨도 잠긴 동안엔 그 버튼이 뜨면 안 된다.
test('시도 횟수 제한에 걸리면 onSwitchToBiometric이 있어도 "Face ID로 잠금 해제" 버튼을 안 보여준다', async () => {
  const onSwitchToBiometric = jest.fn();
  await render(
    <PinVerifyForm
      {...defaultProps}
      isPinLockedOut={true}
      pinLockoutRemainingMs={272_000}
      onSwitchToBiometric={onSwitchToBiometric}
    />,
  );

  expect(screen.getByText('PIN이 잠겼어요')).toBeTruthy();
  expect(screen.queryByText('Face ID로 잠금 해제')).toBeNull();
  expect(screen.queryByTestId('switch-to-biometric')).toBeNull();
});
